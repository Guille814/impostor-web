import { useState, useEffect } from "react";
import { createGame, listenToPlayers, updateGameSettings, startGame, listenToCustomWords } from "../../utils/sessionUtils";
import { DEFAULT_WORD_BANK } from "../../data/wordBank";
import { mergeWordBank } from "../../utils/gameLogic";

export default function OnlineLobbyHost({ user, customWords, onBack, onGameStart }) {
  const [code, setCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameCustomWords, setGameCustomWords] = useState([]);
  const [impostorCount, setImpostorCount] = useState(1);
  const [impostorsPerRound, setImpostorsPerRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const hostName = user?.displayName || "Host";
      const newCode = await createGame(user?.uid || "anon", hostName);
      setCode(newCode);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!code) return;
    const unsub1 = listenToPlayers(code, setPlayers);
    const unsub2 = listenToCustomWords(code, setGameCustomWords);
    return () => { unsub1(); unsub2(); };
  }, [code]);

  const shareUrl = code ? `${window.location.origin}/game/${code}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPlayers = players.reduce((sum, p) => sum + (p.names?.length || 1), 0);
  const maxImpostors = Math.floor(totalPlayers / 2) || 1;

  const handleStart = async () => {
    if (players.length < 2) return;
    // Banco de palabras: default + custom del host + custom de la partida
    const merged = mergeWordBank([...customWords, ...gameCustomWords]);
    await updateGameSettings(code, { impostorCount, impostorsPerRound });
    await startGame(code, players, merged);
    onGameStart(code);
  };

  if (loading) return (
    <div className="screen menu-screen">
      <p style={{ color: "var(--muted)" }}>Creando partida…</p>
    </div>
  );

  return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <button className="back-btn" onClick={onBack}>← Atrás</button>
        <h2 className="words-title">Nueva partida</h2>
        <div style={{ width: 60 }} />
      </div>

      <div className="words-content">
        {/* Código */}
        <div className="session-code-block">
          <span className="session-code-label">CÓDIGO DE PARTIDA</span>
          <span className="session-code">{code}</span>
          <p className="session-url">{shareUrl}</p>
          <button className="modal-btn" onClick={handleCopy}>
            {copied ? "✓ Copiado" : "📋 Copiar enlace"}
          </button>
        </div>

        {/* Jugadores conectados */}
        <div className="session-words-header">
          <span className="session-words-label">JUGADORES ({totalPlayers})</span>
        </div>

        {players.length === 0 ? (
          <div className="words-empty">
            <span className="words-empty-icon">⏳</span>
            <p>Esperando jugadores…</p>
          </div>
        ) : (
          <div className="words-list">
            {players.map(p => (
              <div key={p.id} className="word-row">
                <div className="word-row-info">
                  <span className="word-row-word">{p.names?.join(", ")}</span>
                  <span className="word-row-hint">📱 {p.names?.length > 1 ? `${p.names.length} jugadores` : "1 jugador"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Palabras añadidas por jugadores */}
        {gameCustomWords.length > 0 && (
          <>
            <div className="session-words-header">
              <span className="session-words-label">PALABRAS AÑADIDAS ({gameCustomWords.length})</span>
            </div>
            <div className="words-list">
              {gameCustomWords.map(w => (
                <div key={w.id} className="word-row">
                  <div className="word-row-info">
                    <span className="word-row-word">{w.word}</span>
                    <div className="word-row-meta">
                      <span className="word-row-cat">{w.category}</span>
                      <span className="word-row-hint">💡 {w.hint}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Configuración */}
        <div className="section" style={{ background: "var(--surface2)", borderRadius: 12, border: "1.5px solid var(--border)" }}>
          <div style={{ padding: "14px 16px" }}>
            <label className="form-label">Impostores en la partida</label>
            <div className="counter-row" style={{ marginTop: 8 }}>
              <button className="counter-btn" onClick={() => setImpostorCount(Math.max(1, impostorCount - 1))}>−</button>
              <span className="counter-val impostor-count">{impostorCount}</span>
              <button className="counter-btn" onClick={() => setImpostorCount(Math.min(maxImpostors, impostorCount + 1))}>+</button>
            </div>
          </div>
          <div style={{ padding: "0 16px 14px" }}>
            <label className="form-label">Eliminados por votación</label>
            <div className="counter-row" style={{ marginTop: 8 }}>
              <button className="counter-btn" onClick={() => setImpostorsPerRound(Math.max(1, impostorsPerRound - 1))}>−</button>
              <span className="counter-val">{impostorsPerRound}</span>
              <button className="counter-btn" onClick={() => setImpostorsPerRound(Math.min(impostorCount, impostorsPerRound + 1))}>+</button>
            </div>
          </div>
        </div>

        <div className="start-sticky">
          <button
            className={`start-btn ${players.length < 2 ? "disabled" : ""}`}
            disabled={players.length < 2}
            onClick={handleStart}
          >
            {players.length < 2 ? "Esperando jugadores…" : "⚡ INICIAR PARTIDA"}
          </button>
        </div>
      </div>
    </div>
  );
}