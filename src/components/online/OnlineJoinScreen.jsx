import { joinGame, listenToGame, addCustomWordToGame, setPlayerReady, updateGameSettings } from "../../utils/sessionUtils";
import { useState, useEffect, useRef } from "react";

export default function OnlineJoinScreen({ code, onGameStart, user, userWords = [] }) {
  // Persistir nombres y playerId en sessionStorage para sobrevivir reloads
  const [playerId] = useState(() => {
    const saved = sessionStorage.getItem(`pid-${code}`);
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(2);
    sessionStorage.setItem(`pid-${code}`, newId);
    return newId;
  });

  const [savedNames] = useState(() => {
    const saved = sessionStorage.getItem(`names-${code}`);
    return saved ? JSON.parse(saved) : null;
  });

  const [step, setStep] = useState(() => savedNames ? "words" : "names");
  const [multiPlayer, setMultiPlayer] = useState(() => savedNames ? savedNames.length > 1 : false);
  const [names, setNames] = useState(() => savedNames || [""]);
  const [joined, setJoined] = useState(!!savedNames);
  const [word, setWord] = useState("");
  const [hint, setHint] = useState("");
  const [category, setCategory] = useState("");
  const [addedWords, setAddedWords] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
const onGameStartCalled = useRef(false);
const [gameStatus, setGameStatus] = useState(null);

  useEffect(() => {
    const unsub = listenToGame(code, g => {
      if (!g) return;
      setGameStatus(g.status);
      if (g.status === "cards" && joined && !onGameStartCalled.current) {
        onGameStartCalled.current = true;
        onGameStart(playerId);
      }
      if (g.status === "lobby" && joined) setStep("words");
    });
    return () => unsub();
  }, [code, joined]);

  useEffect(() => {
    if (joined && gameStatus === "cards" && !onGameStartCalled.current) {
      onGameStartCalled.current = true;
      onGameStart(playerId);
    }
  }, [joined, gameStatus]);

  const handleJoin = async () => {
    const finalNames = names.filter(n => n.trim());
    if (!finalNames.length) return;
    await joinGame(code, playerId, finalNames);
    sessionStorage.setItem(`names-${code}`, JSON.stringify(finalNames));
    sessionStorage.setItem(`pid-${code}`, playerId);
    setJoined(true);
    setStep("words");
  };

  const handleAddWord = async () => {
    if (!word.trim() || !hint.trim() || !category.trim()) return;
    await addCustomWordToGame(code, playerId, word.trim(), hint.trim(), category.trim());
    setAddedWords(prev => [...prev, { word, hint, category }]);
    setWord(""); setHint(""); setCategory("");
  };

  const handleImportWords = async () => {
    setImporting(true);
    for (const w of userWords) {
      await addCustomWordToGame(code, playerId, w.word, w.hint, w.category);
    }
    setImporting(false);
    setImportDone(true);
  };

  const handleReady = async () => {
    await setPlayerReady(code, playerId, true);
    setStep("waiting");
  };

  const handleEditNames = () => {
    sessionStorage.removeItem(`names-${code}`);
    setJoined(false);
    setStep("names");
  };

  const updateNames = count => {
    setNames(Array.from({ length: count }, (_, i) => names[i] || ""));
  };

  // ── Nombres ──
  if (step === "names") return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <div />
        <h2 className="words-title">Unirse — {code}</h2>
        <div style={{ width: 60 }} />
      </div>
      <div className="words-content">
        <div className="join-header">
          <span className="join-icon">🎮</span>
          <p>¿Juegas solo o por más jugadores?</p>
        </div>
        <div className="cat-toggle-row">
          <button className={`cat-mode-btn ${!multiPlayer ? "active" : ""}`}
            onClick={() => { setMultiPlayer(false); setNames([""]); }}>Solo yo</button>
          <button className={`cat-mode-btn ${multiPlayer ? "active" : ""}`}
            onClick={() => { setMultiPlayer(true); updateNames(2); }}>Por varios</button>
        </div>
        {multiPlayer && (
          <div style={{ background: "var(--surface2)", borderRadius: 12, border: "1.5px solid var(--border)", padding: "14px 16px" }}>
            <label className="form-label">¿Por cuántos jugadores?</label>
            <div className="counter-row" style={{ marginTop: 8 }}>
              <button className="counter-btn" onClick={() => updateNames(Math.max(2, names.length - 1))}>−</button>
              <span className="counter-val">{names.length}</span>
              <button className="counter-btn" onClick={() => updateNames(Math.min(6, names.length + 1))}>+</button>
            </div>
          </div>
        )}
        <div className="word-form">
          {names.map((name, i) => (
            <div key={i} className="form-field">
              <label className="form-label">{multiPlayer ? `Jugador ${i + 1}` : "Tu nombre"}</label>
              <input className="form-input" placeholder={`Nombre ${i + 1}`} value={name}
                onChange={e => { const arr = [...names]; arr[i] = e.target.value; setNames(arr); }} maxLength={20} />
            </div>
          ))}
        </div>
        <div className="start-sticky">
          <button className={`start-btn ${!names.every(n => n.trim()) ? "disabled" : ""}`}
            disabled={!names.every(n => n.trim())} onClick={handleJoin}>
            ✅ Confirmar nombre{names.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Palabras / Lobby ──
  if (step === "words") return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <div />
        <h2 className="words-title">Preparación</h2>
        <div style={{ width: 60 }} />
      </div>
      <div className="words-content">

        {/* Info jugadores de este dispositivo */}
        <div className="session-code-block" style={{ background: "var(--surface2)" }}>
          <span className="session-code-label">TUS JUGADORES</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {names.filter(n => n.trim()).map((n, i) => (
              <span key={i} className="citizen-chip" style={{ fontSize: "1rem" }}>{n}</span>
            ))}
          </div>
          <button className="back-btn" style={{ marginTop: 4 }} onClick={handleEditNames}>
            ✏️ Editar nombres / añadir jugador
          </button>
        </div>

        <div className="join-header">
          <span className="join-icon">📝</span>
          <p>Opcional — añade palabras para la partida</p>
        </div>

        {/* Importar */}
        {user && userWords.length > 0 && !importDone && (
          <div className="session-code-block" style={{ border: "1.5px solid rgba(76,201,240,0.2)", background: "rgba(76,201,240,0.04)" }}>
            <span className="session-code-label">TUS PALABRAS GUARDADAS</span>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
              {userWords.length} palabra{userWords.length !== 1 ? "s" : ""} en tu cuenta
            </p>
            <button className="modal-btn"
              style={{ background: "rgba(76,201,240,0.1)", color: "var(--citizen)", border: "1.5px solid rgba(76,201,240,0.3)" }}
              onClick={handleImportWords} disabled={importing}>
              {importing ? "Importando…" : `📥 Importar mis ${userWords.length} palabras`}
            </button>
          </div>
        )}
        {importDone && <div className="join-success">✓ Palabras importadas</div>}

        {addedWords.length > 0 && (
          <div className="words-list">
            {addedWords.map((w, i) => (
              <div key={i} className="word-row">
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
        )}

        <div className="word-form">
          <div className="form-field">
            <label className="form-label">Palabra</label>
            <input className="form-input" placeholder="Ej: Elefante" value={word} onChange={e => setWord(e.target.value)} maxLength={40} />
          </div>
          <div className="form-field">
            <label className="form-label">Pista</label>
            <input className="form-input" placeholder="Ej: Trompa" value={hint} onChange={e => setHint(e.target.value)} maxLength={40} />
          </div>
          <div className="form-field">
            <label className="form-label">Categoría</label>
            <input className="form-input" placeholder="Ej: Animales" value={category} onChange={e => setCategory(e.target.value)} maxLength={30} />
          </div>
          <button className={`modal-btn ${(!word.trim() || !hint.trim() || !category.trim()) ? "secondary" : ""}`}
            onClick={handleAddWord} disabled={!word.trim() || !hint.trim() || !category.trim()}>
            + Añadir palabra
          </button>
        </div>

        <div className="start-sticky">
          <button className="start-btn" onClick={handleReady}>
            ✅ Listo, esperar al host
          </button>
        </div>
      </div>
    </div>
  );

  // ── Esperando ──
  return (
    <div className="screen menu-screen">
      <div className="menu-card" style={{ textAlign: "center", gap: 20 }}>
        <span style={{ fontSize: "3rem" }}>⏳</span>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "0.1em" }}>
          Esperando al host…
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {names.filter(n => n.trim()).map((n, i) => (
            <span key={i} className="citizen-chip">{n}</span>
          ))}
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>La partida comenzará pronto</p>
        <div className="session-code-block">
          <span className="session-code-label">CÓDIGO</span>
          <span className="session-code" style={{ fontSize: "2.5rem" }}>{code}</span>
        </div>
        <button className="back-btn" onClick={handleEditNames}>✏️ Editar nombres</button>
      </div>
    </div>
  );
}