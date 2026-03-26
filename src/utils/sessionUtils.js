import { db } from "../firebase";
import {
  doc, setDoc, getDoc, onSnapshot, collection,
  addDoc, deleteDoc, updateDoc, serverTimestamp,
  arrayUnion, arrayRemove
} from "firebase/firestore";

// ── Sesión de palabras (ya existente) ──────────────────────────────
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
  return onSnapshot(collection(db, "sessions", code, "words"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
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
    hostName,
    status: "lobby",
    word: null,
    category: null,
    hint: null,
    impostorCount: 1,
    impostorsPerRound: 1,
    eliminatedPlayers: [],
    impostorsRevealed: [],
    winner: null,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function joinGame(code, playerId, names) {
  // names es array de strings (1 o más jugadores por dispositivo)
  await setDoc(doc(db, "games", code, "players", playerId), {
    names,
    isImpostor: false,
    isEliminated: false,
    joinedAt: serverTimestamp(),
  });
}

export async function leaveGame(code, playerId) {
  await deleteDoc(doc(db, "games", code, "players", playerId));
}

export function listenToGame(code, callback) {
  return onSnapshot(doc(db, "games", code), (snap) => {
    if (!snap.exists()) return callback(null);
    callback({ id: snap.id, ...snap.data() });
  });
}

export function listenToPlayers(code, callback) {
  return onSnapshot(collection(db, "games", code, "players"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function updateGameSettings(code, settings) {
  await updateDoc(doc(db, "games", code), settings);
}

export async function startGame(code, players, wordBank) {
  // Asignar impostores aleatoriamente
  const game = (await getDoc(doc(db, "games", code))).data();
  const impostorCount = game.impostorCount;

  // Elegir palabra
  const categories = Object.keys(wordBank);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const entries = wordBank[category];
  const entry = entries[Math.floor(Math.random() * entries.length)];

  // Elegir impostores (por dispositivo)
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const impostorIds = new Set(shuffled.slice(0, impostorCount).map(p => p.id));

  // Actualizar cada jugador
  for (const player of players) {
    await updateDoc(doc(db, "games", code, "players", player.id), {
      isImpostor: impostorIds.has(player.id),
      isEliminated: false,
    });
  }

  // Actualizar partida
  await updateDoc(doc(db, "games", code), {
    status: "cards",
    word: entry.word,
    category,
    hint: entry.hint,
    impostorsRevealed: [],
    eliminatedPlayers: [],
    winner: null,
  });
}

export async function startVoting(code) {
  await updateDoc(doc(db, "games", code), {
    status: "voting",
    votes: {},
  });
  // Borrar votos anteriores
  const votesSnap = await getDoc(doc(db, "games", code));
  // Limpiar subcolección de votos
  const snap = await getDocs(collection(db, "games", code, "votes"));
  for (const d of snap.docs) await deleteDoc(d.ref);
}

export async function castVote(code, voterId, targetId) {
  await setDoc(doc(db, "games", code, "votes", voterId), { targetId });
}

export function listenToVotes(code, callback) {
  return onSnapshot(collection(db, "games", code, "votes"), (snap) => {
    callback(snap.docs.map(d => ({ voterId: d.id, ...d.data() })));
  });
}

export async function resolveVote(code, eliminatedId, players) {
  const playerSnap = await getDoc(doc(db, "games", code, "players", eliminatedId));
  const playerData = playerSnap.data();
  const wasImpostor = playerData.isImpostor;

  // Eliminar jugador
  await updateDoc(doc(db, "games", code, "players", eliminatedId), { isEliminated: true });
  await updateDoc(doc(db, "games", code), {
    eliminatedPlayers: arrayUnion(eliminatedId),
    ...(wasImpostor ? { impostorsRevealed: arrayUnion(eliminatedId) } : {}),
    status: "vote_result",
    lastEliminated: eliminatedId,
    lastEliminatedWasImpostor: wasImpostor,
  });

  // Comprobar fin de partida
  const activePlayers = players.filter(p => !p.isEliminated && p.id !== eliminatedId);
  const activeImpostors = activePlayers.filter(p => p.isImpostor);
  const activeCitizens = activePlayers.filter(p => !p.isImpostor);

  if (activeImpostors.length === 0) {
    await updateDoc(doc(db, "games", code), { winner: "citizens" });
  } else if (activeImpostors.length >= activeCitizens.length) {
    await updateDoc(doc(db, "games", code), { winner: "impostors" });
  }
}

export async function impostorGuessedWord(code) {
  await updateDoc(doc(db, "games", code), {
    status: "finished",
    winner: "impostors",
    endReason: "impostor_guessed",
  });
}

export async function continueAfterVote(code) {
  await updateDoc(doc(db, "games", code), { status: "cards" });
}

export async function addCustomWordToGame(code, playerId, word, hint, category) {
  await addDoc(collection(db, "games", code, "customWords"), {
    word, hint, category, addedBy: playerId, createdAt: serverTimestamp(),
  });
}

export function listenToCustomWords(code, callback) {
  return onSnapshot(collection(db, "games", code, "customWords"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}