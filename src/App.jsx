import { useState, useEffect } from "react";
import { buildPlayers, mergeWordBank } from "./utils/gameLogic";
import { useAuth } from "./hooks/useAuth";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { createGame, joinGame } from "./utils/sessionUtils";
import MainMenu from "./components/MainMenu";
import SetupScreen from "./components/SetupScreen";
import CardsScreen from "./components/CardsScreen";
import RevealImpostorsScreen from "./components/RevealImpostorsScreen";
import WordsScreen from "./components/WordsScreen";
import HostSessionScreen from "./components/HostSessionScreen";
import JoinSessionScreen from "./components/JoinSessionScreen";
import OnlineLobbyHost from "./components/online/OnlineLobbyHost";
import OnlineJoinScreen from "./components/online/OnlineJoinScreen";
import OnlineGameScreen from "./components/online/OnlineGameScreen";
import "./index.css";

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [players, setPlayers] = useState([]);
  const [savedConfig, setSavedConfig] = useState(null);
  const [customWords, setCustomWords] = useState([]);
  const [onlineGameCode, setOnlineGameCode] = useState(null);
  const [onlinePlayerId, setOnlinePlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [hostPlayerId, setHostPlayerId] = useState(null);
  const { user, login, logout } = useAuth();

  useEffect(() => {
    if (!user) { setCustomWords([]); return; }
    const ref = collection(db, "users", user.uid, "words");
    const unsub = onSnapshot(ref, snap => {
      setCustomWords(snap.docs.map(d => ({ ...d.data(), firestoreId: d.id })));
    });
    return () => unsub();
  }, [user]);

  const path = window.location.pathname;

  if (user === undefined) return (
    <div className="screen menu-screen">
      <p style={{ color: "var(--muted)" }}>Cargando…</p>
    </div>
  );

  const joinMatch = path.match(/^\/join\/([A-Z0-9]{6})$/i);
  if (joinMatch) return <JoinSessionScreen code={joinMatch[1].toUpperCase()} />;

  // Ruta /game/:code — jugadores que entran por link
  const gameMatch = path.match(/^\/game\/([A-Z0-9]{6})$/i);
  if (gameMatch && screen !== "online-game") {
    const code = gameMatch[1].toUpperCase();
    return (
      <OnlineJoinScreen
        code={code}
        user={user}
        userWords={customWords}
        onGameStart={(pid) => {
          setOnlineGameCode(code);
          setOnlinePlayerId(pid);
          setIsHost(false);
          setScreen("online-game");
          window.history.pushState({}, "", "/");
        }}
      />
    );
  }

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
      {screen === "menu" && (
        <MainMenu
          onOffline={() => setScreen("setup")}
          onWords={() => setScreen("words")}
          onSession={() => setScreen("host-session")}
          onOnline={() => setScreen("online-host-name")}
          user={user}
          onLogin={login}
          onLogout={logout}
        />
      )}

      {screen === "online-host-name" && (
        <HostNameScreen
          user={user}
          onBack={() => setScreen("menu")}
          onCreated={(code, pid) => {
            setOnlineGameCode(code);
            setHostPlayerId(pid);
            setIsHost(true);
            setScreen("online-lobby");
          }}
        />
      )}

      {screen === "online-lobby" && (
        <OnlineLobbyHost
          user={user}
          customWords={customWords}
          code={onlineGameCode}
          hostPlayerId={hostPlayerId}
          onBack={() => setScreen("menu")}
          onGameStart={() => {
            setOnlinePlayerId(hostPlayerId);
            setScreen("online-game");
          }}
        />
      )}

      {screen === "setup" && (
        <SetupScreen onStart={handleStartGame} onBack={() => setScreen("menu")} savedConfig={savedConfig} customWords={customWords} />
      )}
      {screen === "cards" && (
        <CardsScreen players={players} onBack={() => setScreen("setup")} onRevealImpostors={() => setScreen("reveal")} />
      )}
      {screen === "reveal" && (
        <RevealImpostorsScreen players={players} onEnd={() => { setPlayers([]); setScreen("menu"); }} />
      )}
      {screen === "words" && (
        <WordsScreen customWords={customWords} onSave={setCustomWords} onBack={() => setScreen("menu")} user={user} />
      )}
      {screen === "host-session" && (
        <HostSessionScreen onBack={() => setScreen("menu")} onStartWithWords={handleSessionWords} />
      )}
      {screen === "online-game" && (
        <OnlineGameScreen
          code={onlineGameCode}
          playerId={onlinePlayerId}
          isHost={isHost}
          wordBank={mergeWordBank(customWords)}
          onReturnToLobby={() => {
            if (isHost) {
              setScreen("online-lobby");
            } else {
              // Jugadores vuelven a la pantalla de join sin perder sus datos
              // La URL ya está en "/" así que forzamos re-render con el código
              window.history.pushState({}, "", `/game/${onlineGameCode}`);
              setScreen("menu"); // trigger re-render
            }
          }}
        />
      )}
    </>
  );
}

function HostNameScreen({ user, onBack, onCreated }) {
  const [name, setName] = useState(user?.displayName?.split(" ")[0] || "");
  const [loading, setLoading] = useState(false);
  const [pid] = useState(() => user?.uid || Math.random().toString(36).substring(2));

  const handleCreate = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    const code = await createGame(pid, name.trim());
    await joinGame(code, pid, [name.trim()]);
    setLoading(false);
    onCreated(code, pid);
  };

  return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <button className="back-btn" onClick={onBack}>← Atrás</button>
        <h2 className="words-title">Modo Online</h2>
        <div style={{ width: 60 }} />
      </div>
      <div className="words-content">
        <div className="join-header">
          <span className="join-icon">👑</span>
          <p>Eres el host. ¿Con qué nombre juegas?</p>
        </div>
        <div className="word-form">
          <div className="form-field">
            <label className="form-label">Tu nombre</label>
            <input className="form-input" placeholder="Tu nombre" value={name}
              onChange={e => setName(e.target.value)} maxLength={20} />
          </div>
        </div>
        <div className="start-sticky">
          <button className={`start-btn ${!name.trim() || loading ? "disabled" : ""}`}
            disabled={!name.trim() || loading} onClick={handleCreate}>
            {loading ? "Creando partida…" : "Crear partida →"}
          </button>
        </div>
      </div>
    </div>
  );
}