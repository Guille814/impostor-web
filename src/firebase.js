import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD2VhD4zor5fsnDtYhfbOD39UBINaW7CIo",
  authDomain: "impostor-a48cb.firebaseapp.com",
  projectId: "impostor-a48cb",
  storageBucket: "impostor-a48cb.firebasestorage.app",
  messagingSenderId: "1005678498406",
  appId: "1:1005678498406:web:02e02b72edf77e7f41d3a7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();