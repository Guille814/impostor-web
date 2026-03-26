import { useState, useEffect } from "react";
import { buildPlayers } from "./utils/gameLogic";
import { useAuth } from "./hooks/useAuth";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";
import MainMenu from "./components/MainMenu";
import SetupScreen from "./components/SetupScreen";
import CardsScreen from "./components/CardsScreen";
import RevealImpostorsScreen from "./components/RevealImpostorsScreen";
import WordsScreen from "./components/WordsScreen";
import HostSessionScreen from "./components/HostSessionScreen";
import JoinSessionScreen from "./components/JoinSessionScreen";
import "./index.css";

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [players, setPlayers] = useState([]);
  const [savedConfig, setSavedConfig] = useState(null);
  const [customWords, setCustomWords] = useState([]);
  const { user, login, logout } = useAuth();

  const path = window.location.pathname;
  const joinMatch = path.match(/^\/join\/([A-Z0-9]{6})$/i);
  if (joinMatch) {
    return <JoinSessionScreen code={joinMatch[1].toUpperCase()} />;
  }

  // Carga palabras desde Firestore si hay usuario logueado
  useEffect(() => {
    if (!user) {
      setCustomWords([]);
      return;
    }
    const ref = collection(db, "users", user.uid, "words");
    const unsub = onSnapshot(ref, (snap) => {
      const loaded = snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
      setCustomWords(loaded);
    });
    return () => unsub();
  }, [user]);

  if (user === undefined) return (
    <div className="screen menu-screen">
      <p style={{ color: "var(--muted)" }}>Cargando…</p>
    </div>
  );

  const handleStartGame = (config) => {
    setSavedConfig(config);
    setPlayers(buildPlayers(config));
    setScreen("cards");
  };

  const handleSessionWords = (sessionWords) => {
    setCustomWords(prev => [...prev, ...sessionWords]);
    setScreen("setup");
  };

  return (
    <>
      {screen === "menu"         && <MainMenu onOffline={() => setScreen("setup")} onWords={() => setScreen("words")} onSession={() => setScreen("host-session")} user={user} onLogin={login} onLogout={logout} />}
      {screen === "setup"        && <SetupScreen onStart={handleStartGame} onBack={() => setScreen("menu")} savedConfig={savedConfig} customWords={customWords} />}
      {screen === "cards"        && <CardsScreen players={players} onBack={() => setScreen("setup")} onRevealImpostors={() => setScreen("reveal")} />}
      {screen === "reveal"       && <RevealImpostorsScreen players={players} onEnd={() => { setPlayers([]); setScreen("menu"); }} />}
      {screen === "words"        && <WordsScreen customWords={customWords} onSave={setCustomWords} onBack={() => setScreen("menu")} user={user} />}
      {screen === "host-session" && <HostSessionScreen onBack={() => setScreen("menu")} onStartWithWords={handleSessionWords} />}
    </>
  );
}