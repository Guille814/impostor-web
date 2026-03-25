import { useState, useEffect } from "react";
import { generateSessionCode, createSession, listenToWords, removeWordFromSession, closeSession } from "../utils/sessionUtils";

export default function HostSessionScreen({ onBack, onStartWithWords }) {
  const [code, setCode] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const newCode = generateSessionCode();
      await createSession(newCode);
      setCode(newCode);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!code) return;
    const unsub = listenToWords(code, setWords);
    return () => unsub();
  }, [code]);

  const shareUrl = code ? `${window.location.origin}/join/${code}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    await closeSession(code);
    onStartWithWords(words.map(w => ({ word: w.word, hint: w.hint, category: w.category })));
  };

  if (loading) return (
    <div className="screen menu-screen">
      <p style={{ color: "var(--muted)" }}>Creando sesión…</p>
    </div>
  );

  return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <button className="back-btn" onClick={onBack}>← Atrás</button>
        <h2 className="words-title">Sesión de palabras</h2>
        <div style={{ width: 60 }} />
      </div>

      <div className="words-content">
        {/* Código y link */}
        <div className="session-code-block">
          <span className="session-code-label">CÓDIGO DE SESIÓN</span>
          <span className="session-code">{code}</span>
          <p className="session-url">{shareUrl}</p>
          <button className="modal-btn" onClick={handleCopy}>
            {copied ? "✓ Copiado" : "📋 Copiar enlace"}
          </button>
        </div>

        {/* Palabras en tiempo real */}
        <div className="session-words-header">
          <span className="session-words-label">PALABRAS RECIBIDAS</span>
          <span className="words-sel-count">{words.length}</span>
        </div>

        {words.length === 0 ? (
          <div className="words-empty">
            <span className="words-empty-icon">⏳</span>
            <p>Esperando que los invitados añadan palabras…</p>
          </div>
        ) : (
          <div className="words-list">
            {words.map((w) => (
              <div key={w.id} className="word-row">
                <div className="word-row-info">
                  <span className="word-row-word">{w.word}</span>
                  <div className="word-row-meta">
                    <span className="word-row-cat">{w.category}</span>
                    <span className="word-row-hint">💡 {w.hint}</span>
                  </div>
                </div>
                <button className="icon-btn delete" onClick={() => removeWordFromSession(code, w.id)}>🗑️</button>
              </div>
            ))}
          </div>
        )}

        {/* Botón iniciar */}
        {words.length > 0 && (
          <div className="start-sticky">
            <button className="start-btn" onClick={handleStart}>
              ⚡ Usar estas palabras
            </button>
          </div>
        )}
      </div>
    </div>
  );
}