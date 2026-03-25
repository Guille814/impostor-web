import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState(undefined);
  const loggingIn = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const login = async () => {
    if (loggingIn.current) return;
    loggingIn.current = true;
    try {
      await signInWithPopup(auth, googleProvider);
    } finally {
      loggingIn.current = false;
    }
  };

  const logout = () => signOut(auth);

  return { user, login, logout };
}