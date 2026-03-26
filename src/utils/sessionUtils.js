import { db } from "../firebase";
import {
  doc, setDoc, getDoc, getDocs, onSnapshot, collection,
  addDoc, deleteDoc, updateDoc, serverTimestamp, arrayUnion
} from "firebase/firestore";

// ── Sesión de palabras ──────────────────────────────────────────────
export function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
export async function createSession(code) {
  await setDoc(doc(db, "sessions", code), { createdAt: serverTimestamp(), status: "open" });
}
export async function checkSession(code) {
  const snap = await getDoc(doc(db, "sessions", code));
  if (!snap.exists()) return null;
  return snap.data();
}
export async function addWordToSession(code, word, hint, category) {
  await addDoc(collection(db, "sessions", code, "words"), { word, hint, category, addedAt: serverTimestamp() });
}
export function listenToWords(code, callback) {
  return onSnapshot(collection(db, "sessions", code, "words"), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}
export async function removeWordFromSession(code, wordId) {
  await deleteDoc(doc(db, "sessions", code, "words", wordId));
}
export async function closeSession(code) {
  await updateDoc(doc(db, "sessions", code), { status: "closed" });
}

// ── Partida Online ──────────────────────────────────────────────────
export function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createGame(hostId, hostName) {
  const code = generateGameCode();
  await setDoc(doc(db, "games", code), {
    hostId,
    status: "lobby",  // lobby | cards | voting | vote_result | finished
    word: null, category: null, hint: null,
    impostorCount: 1,
    eliminatedPlayers: [],
    impostorsRevealed: [],
    winner: null,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function joinGame(code, playerId, names) {
  await setDoc(doc(db, "games", code, "players", playerId), {
    names, isImpostor: false, isEliminated: false,
    ready: false, joinedAt: serverTimestamp(),
  });
}

export async function setPlayerReady(code, playerId, ready) {
  await updateDoc(doc(db, "games", code, "players", playerId), { ready });
}

export async function leaveGame(code, playerId) {
  await deleteDoc(doc(db, "games", code, "players", playerId));
}

export function listenToGame(code, callback) {
  return onSnapshot(doc(db, "games", code), snap => {
    if (!snap.exists()) return callback(null);
    callback({ id: snap.id, ...snap.data() });
  });
}

export function listenToPlayers(code, callback) {
  return onSnapshot(collection(db, "games", code, "players"), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function updateGameSettings(code, settings) {
  await updateDoc(doc(db, "games", code), settings);
}

export async function startGame(code, players, wordBank) {
  const game = (await getDoc(doc(db, "games", code))).data();
  const impostorCount = game.impostorCount;

  const categories = Object.keys(wordBank);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const entries = wordBank[category];
  const entry = entries[Math.floor(Math.random() * entries.length)];

  // Expandir jugadores individuales (un nombre = un jugador)
  const allIndividuals = [];
  for (const p of players) {
    for (let i = 0; i < (p.names?.length || 1); i++) {
      allIndividuals.push({ deviceId: p.id, nameIndex: i, name: p.names?.[i] || p.names?.[0] });
    }
  }

  // Sortear impostores entre individuales
  const shuffled = [...allIndividuals].sort(() => Math.random() - 0.5);
  const impostorIndividuals = shuffled.slice(0, impostorCount);

  // Agrupar por dispositivo: ¿qué índices de nombre son impostores?
  // Un dispositivo es impostor si AL MENOS UNO de sus nombres fue elegido
  // Guardamos qué nombres son impostores por dispositivo
  const impostorsByDevice = {};
  for (const ind of impostorIndividuals) {
    if (!impostorsByDevice[ind.deviceId]) impostorsByDevice[ind.deviceId] = new Set();
    impostorsByDevice[ind.deviceId].add(ind.nameIndex);
  }

  for (const player of players) {
    const impostorIndices = impostorsByDevice[player.id] || new Set();
    // Si algún nombre del dispositivo es impostor, guardamos qué índices
    const isAnyImpostor = impostorIndices.size > 0;
    await updateDoc(doc(db, "games", code, "players", player.id), {
      isImpostor: isAnyImpostor,
      impostorNameIndices: isAnyImpostor ? [...impostorIndices] : [],
      isEliminated: false,
      ready: false,
    });
  }

  await updateDoc(doc(db, "games", code), {
    status: "cards",
    word: entry.word, category, hint: entry.hint,
    impostorsRevealed: [], eliminatedPlayers: [],
    winner: null, endReason: null,
  });
}

export async function startVoting(code) {
  const snap = await getDocs(collection(db, "games", code, "votes"));
  for (const d of snap.docs) await deleteDoc(d.ref);
  await updateDoc(doc(db, "games", code), { status: "voting" });
}

export async function castVote(code, voterId, targetId) {
  // targetId ahora es "deviceId-nameIndex" para identificar el nombre exacto
  await setDoc(doc(db, "games", code, "votes", voterId), { targetId });
}

export function listenToVotes(code, callback) {
  return onSnapshot(collection(db, "games", code, "votes"), snap =>
    callback(snap.docs.map(d => ({ voterId: d.id, ...d.data() })))
  );
}

export async function resolveVote(code, eliminatedTarget) {
  // eliminatedTarget = "deviceId-nameIndex"
  const parts = eliminatedTarget.split("-name-");
  const deviceId = parts[0];
  const nameIndex = parseInt(parts[1] ?? "0");

  const playerSnap = await getDoc(doc(db, "games", code, "players", deviceId));
  const playerData = playerSnap.data();
  const wasImpostor = playerData.isImpostor &&
    (playerData.impostorNameIndices || []).includes(nameIndex);

  const eliminatedName = playerData.names?.[nameIndex] || playerData.names?.[0] || "Jugador";

  await updateDoc(doc(db, "games", code, "players", deviceId), { isEliminated: true });
  await updateDoc(doc(db, "games", code), {
    eliminatedPlayers: arrayUnion(deviceId),
    ...(wasImpostor ? { impostorsRevealed: arrayUnion(deviceId) } : {}),
    status: "vote_result",
    lastEliminated: deviceId,
    lastEliminatedName: eliminatedName,
    lastEliminatedWasImpostor: wasImpostor,
  });

  const allSnap = await getDocs(collection(db, "games", code, "players"));
  const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const active = all.filter(p => !p.isEliminated);
  const impostors = active.filter(p => p.isImpostor);
  const citizens = active.filter(p => !p.isImpostor);

  if (impostors.length === 0) {
    await updateDoc(doc(db, "games", code), { winner: "citizens" });
  } else if (impostors.length > citizens.length) {
    await updateDoc(doc(db, "games", code), { winner: "impostors" });
  }
}

export async function impostorGuessedWord(code) {
  await updateDoc(doc(db, "games", code), {
    status: "finished", winner: "impostors", endReason: "impostor_guessed",
  });
}

// Volver al lobby manteniendo jugadores y código
export async function returnToLobby(code) {
  // Resetear ready de todos
  const snap = await getDocs(collection(db, "games", code, "players"));
  for (const d of snap.docs) {
    await updateDoc(d.ref, { ready: false, isImpostor: false, isEliminated: false });
  }
  // Borrar votos
  const votesSnap = await getDocs(collection(db, "games", code, "votes"));
  for (const d of votesSnap.docs) await deleteDoc(d.ref);

  await updateDoc(doc(db, "games", code), {
    status: "lobby",
    word: null, category: null, hint: null,
    impostorsRevealed: [], eliminatedPlayers: [],
    winner: null, endReason: null,
  });
}

export async function addCustomWordToGame(code, playerId, word, hint, category) {
  await addDoc(collection(db, "games", code, "customWords"), {
    word, hint, category, addedBy: playerId, createdAt: serverTimestamp(),
  });
}

export function listenToCustomWords(code, callback) {
  return onSnapshot(collection(db, "games", code, "customWords"), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function continueAfterVote(code) {
  await updateDoc(doc(db, "games", code), { status: "cards" });
}