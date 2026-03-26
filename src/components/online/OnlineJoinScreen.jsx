import { useState, useEffect } from "react";
import { joinGame, leaveGame, listenToGame, addCustomWordToGame } from "../../utils/sessionUtils";

export default function OnlineJoinScreen({ code, onGameReady }) {
  const [step, setStep] = useState("names"); // names | words | waiting
  const [multiPlayer, setMultiPlayer] = useState(false);
  const [extraCount, setExtraCount] = useState(1);
  const [names, setNames] = useState([""]);
  const [playerId] = useState(() => Math.random().toString(36).substring(2));
  const [word, setWord] = useState("");
  const [hint, setHint] = useState("");
  const [category, setCategory] = useState("");
  const [addedWords, setAddedWords] = useState([]);
  const [game, setGame] = useState(null);

  useEffect(() => {
    const unsub = listenToGame(code, (g) => {
      setGame(g);
      if (g?.status === "cards") onGameReady(code, playerId);
    });
    return () => unsub();
  }, [code]);

  const handleJoin = async () => {
    const finalNames = names.filter(n => n.trim());
    if (!finalNames.length) return;
    await joinGame(code, playerId, finalNames);
    setStep("words");
  };

  const handleAddWord = async () => {
    if (!word.trim() || !hint.trim() || !category.trim()) return;
    await addCustomWordToGame(code, playerId, word.trim(), hint.trim(), category.trim());
    setAddedWords(prev => [...prev, { word, hint, category }]);
    setWord(""); setHint(""); setCategory("");
  };

  const updateNames = (count) => {
    setNames(Array.from({ length: count }, (_, i) => names[i] || ""));
  };

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
          <button className={`cat-mode-btn ${!multiPlayer ? "active" : ""}`} onClick={() => { setMultiPlayer(false); setNames([""]); }}>Solo yo</button>
          <button className={`cat-mode-btn ${multiPlayer ? "active" : ""}`} onClick={() => { setMultiPlayer(true); updateNames(2); }}>Por varios</button>
        </div>

        {multiPlayer && (
          <div className="section" style={{ background: "var(--surface2)", borderRadius: 12, border: "1.5px solid var(--border)", padding: "14px 16px" }}>
            <label className="form-label">¿Por cuántos jugadores?</label>
            <div className="counter-row" style={{ marginTop: 8 }}>
              <button className="counter-btn" onClick={() => { const n = Math.max(2, names.length - 1); updateNames(n); }}>−</button>
              <span className="counter-val">{names.length}</span>
              <button className="counter-btn" onClick={() => { const n = Math.min(6, names.length + 1); updateNames(n); }}>+</button>
            </div>
          </div>
        )}

        <div className="word-form">
          {names.map((name, i) => (
            <div key={i} className="form-field">
              <label className="form-label">{multiPlayer ? `Jugador ${i + 1}` : "Tu nombre"}</label>
              <input className="form-input" placeholder={`Jugador ${i + 1}`} value={name}
                onChange={e => { const arr = [...names]; arr[i] = e.target.value; setNames(arr); }} maxLength={20} />
            </div>
          ))}
        </div>

        <div className="start-sticky">
          <button
            className={`start-btn ${!names.every(n => n.trim()) ? "disabled" : ""}`}
            disabled={!names.every(n => n.trim())}
            onClick={handleJoin}
          >
            ✅ Confirmar nombre{names.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "words") return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <div />
        <h2 className="words-title">Añadir palabras</h2>
        <div style={{ width: 60 }} />
      </div>
      <div className="words-content">
        <div className="join-header">
          <span className="join-icon">📝</span>
          <p>Añade palabras secretas para la partida.<br />Solo tú y el host las veis.</p>
        </div>

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
          <button
            className={`modal-btn ${(!word.trim() || !hint.trim() || !category.trim()) ? "secondary" : ""}`}
            onClick={handleAddWord}
            disabled={!word.trim() || !hint.trim() || !category.trim()}
          >
            + Añadir palabra
          </button>
        </div>

        <div className="start-sticky">
          <button className="start-btn" onClick={() => setStep("waiting")}>
            ✅ Listo, esperar al host
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen menu-screen">
      <div className="menu-card" style={{ textAlign: "center", gap: 20 }}>
        <span style={{ fontSize: "3rem" }}>⏳</span>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "0.1em" }}>
          Esperando al host…
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          La partida comenzará pronto
        </p>
        <div className="session-code-block">
          <span className="session-code-label">CÓDIGO</span>
          <span className="session-code" style={{ fontSize: "2.5rem" }}>{code}</span>
        </div>
      </div>
    </div>
  );
}