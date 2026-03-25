import { useState, useEffect } from "react";
import { checkSession, addWordToSession } from "../utils/sessionUtils";

export default function JoinSessionScreen({ code }) {
  const [status, setStatus] = useState("loading"); // loading | open | closed | notfound
  const [word, setWord] = useState("");
  const [hint, setHint] = useState("");
  const [category, setCategory] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const session = await checkSession(code);
      if (!session) setStatus("notfound");
      else if (session.status === "closed") setStatus("closed");
      else setStatus("open");
    };
    verify();
  }, [code]);

  const handleSend = async () => {
    if (!word.trim() || !hint.trim() || !category.trim()) return;
    setSending(true);
    await addWordToSession(code, word.trim(), hint.trim(), category.trim());
    setWord(""); setHint(""); setCategory("");
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  if (status === "loading") return (
    <div className="screen menu-screen">
      <p style={{ color: "var(--muted)" }}>Verificando sesión…</p>
    </div>
  );

  if (status === "notfound") return (
    <div className="screen menu-screen">
      <div className="menu-card" style={{ textAlign: "center", gap: 16 }}>
        <span style={{ fontSize: "3rem" }}>❌</span>
        <p>Sesión no encontrada o expirada.</p>
      </div>
    </div>
  );

  if (status === "closed") return (
    <div className="screen menu-screen">
      <div className="menu-card" style={{ textAlign: "center", gap: 16 }}>
        <span style={{ fontSize: "3rem" }}>🔒</span>
        <p>Esta sesión ya está cerrada.</p>
      </div>
    </div>
  );

  return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <div />
        <h2 className="words-title">Añadir palabra</h2>
        <div style={{ width: 60 }} />
      </div>

      <div className="words-content">
        <div className="join-header">
          <span className="join-icon">👁️</span>
          <p>Sesión <strong>{code}</strong> — añade tus palabras secretas</p>
        </div>

        {sent && (
          <div className="join-success">✓ Palabra añadida correctamente</div>
        )}

        <div className="word-form">
          <div className="form-field">
            <label className="form-label">Palabra</label>
            <input className="form-input" placeholder="Ej: Elefante" value={word}
              onChange={e => setWord(e.target.value)} maxLength={40} />
          </div>
          <div className="form-field">
            <label className="form-label">Pista (una palabra relacionada)</label>
            <input className="form-input" placeholder="Ej: Trompa" value={hint}
              onChange={e => setHint(e.target.value)} maxLength={40} />
          </div>
          <div className="form-field">
            <label className="form-label">Categoría</label>
            <input className="form-input" placeholder="Ej: Animales" value={category}
              onChange={e => setCategory(e.target.value)} maxLength={30} />
          </div>

          <div className="start-sticky">
            <button
              className={`start-btn ${(!word.trim() || !hint.trim() || !category.trim() || sending) ? "disabled" : ""}`}
              disabled={!word.trim() || !hint.trim() || !category.trim() || sending}
              onClick={handleSend}
            >
              {sending ? "Enviando…" : "✅ Enviar palabra"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}