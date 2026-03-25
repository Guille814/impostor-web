import { useState } from "react";
import RevealModal from "./RevealModal";

export default function CardsScreen({ players, onBack, onRevealImpostors }) {
  const [revealed, setRevealed] = useState(null);
  const [seen, setSeen] = useState(new Set());
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const allSeen = seen.size === players.length;

  const closeCard = () => {
    setSeen(prev => new Set([...prev, revealed]));
    setRevealed(null);
  };

  return (
    <div className="screen cards-screen">
      <div className="cards-topbar">
        <button className="back-btn" onClick={() => setShowBackConfirm(true)}>← Atrás</button>
      </div>
      <div className="cards-header">
        <h2>Ronda de tarjetas</h2>
        <p>Cada jugador toca su tarjeta en privado</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(seen.size / players.length) * 100}%` }} />
        </div>
        <span className="progress-text">{seen.size} / {players.length} vistos</span>
      </div>
      <div className="cards-grid">
        {players.map((p, i) => (
          <div key={i} className={`player-card ${seen.has(i) ? "seen" : "unseen"}`}
            onClick={() => !seen.has(i) && setRevealed(i)}>
            {seen.has(i)
              ? <><span className="card-check">✓</span><span className="card-name">{p.name}</span></>
              : <><span className="card-eye">👁️</span><span className="card-name">{p.name}</span><span className="card-tap">Toca para ver</span></>
            }
          </div>
        ))}
      </div>
      {allSeen && (
        <div className="all-seen-banner">
          <p>¡Todos han visto su rol! Empezad a debatir 🗣️</p>
          <button className="reveal-impostors-btn" onClick={onRevealImpostors}>👹 Revelar impostores</button>
        </div>
      )}
      {revealed !== null && <RevealModal player={players[revealed]} onClose={closeCard} />}
      {showBackConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="confirm-icon">⚠️</div>
            <p className="confirm-text">¿Volver a la configuración?<br />Se perderá la partida actual.</p>
            <div className="confirm-btns">
              <button className="modal-btn secondary" onClick={() => setShowBackConfirm(false)}>Cancelar</button>
              <button className="modal-btn" onClick={onBack}>Volver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}