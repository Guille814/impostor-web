import { db } from "../firebase";
import {
  doc, setDoc, getDoc, onSnapshot,
  collection, addDoc, deleteDoc, updateDoc, serverTimestamp
} from "firebase/firestore";

// Genera un código de 6 letras aleatorio
export function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Crea una sesión nueva en Firestore
export async function createSession(code) {
  await setDoc(doc(db, "sessions", code), {
    createdAt: serverTimestamp(),
    status: "open",
  });
}

// Comprueba si una sesión existe y está abierta
export async function checkSession(code) {
  const snap = await getDoc(doc(db, "sessions", code));
  if (!snap.exists()) return null;
  return snap.data();
}

// Añade una palabra a la sesión
export async function addWordToSession(code, word, hint, category) {
  await addDoc(collection(db, "sessions", code, "words"), {
    word, hint, category,
    addedAt: serverTimestamp(),
  });
}

// Escucha cambios en tiempo real de las palabras
export function listenToWords(code, callback) {
  return onSnapshot(collection(db, "sessions", code, "words"), (snap) => {
    const words = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(words);
  });
}

// Elimina una palabra de la sesión
export async function removeWordFromSession(code, wordId) {
  await deleteDoc(doc(db, "sessions", code, "words", wordId));
}

// Cierra la sesión
export async function closeSession(code) {
  await updateDoc(doc(db, "sessions", code), { status: "closed" });
}