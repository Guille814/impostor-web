import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export function useUserWords(user) {
  const [customWords, setCustomWords] = useState([]);
  const prevUid = useRef(null);

  useEffect(() => {
    if (user === undefined) return; // auth todavía cargando
    if (!user) {
      prevUid.current = null;
      setCustomWords([]);
      return;
    }
    if (user.uid === prevUid.current) return;
    prevUid.current = user.uid;

    getDoc(doc(db, "users", user.uid))
      .then(snap => {
        setCustomWords(snap.exists() ? (snap.data().words ?? []) : []);
      })
      .catch(err => console.error("[useUserWords] Error al cargar palabras:", err));
  }, [user]);

  const saveWords = async (words) => {
    setCustomWords(words);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { words }, { merge: true });
      } catch (err) {
        console.error("[useUserWords] Error al guardar palabras:", err);
      }
    }
  };

  return { customWords, saveWords };
}
