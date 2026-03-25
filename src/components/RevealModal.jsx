import { useState } from "react";

export default function RevealModal({ player, onClose }) {
  const [phase, setPhase] = useState("identity");
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {phase === "identity" ? (
          <>
            <div className="modal-name">{player.name}</div>
            {!player.isImpostor && (
              <>
                <div className="modal-word-display">
                  <span className="modal-word-label">TU PALABRA ES</span>
                  <span className="modal-big-word">{player.word}</span>
                  <span className="modal-category-badge">{player.category}</span>
                </div>
                {player.hint && (
                  <div className="modal-info">
                    <div className="info-row">
                      <span className="info-label">PISTA</span>
                      <span className="info-value hint">{player.hint}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            {player.isImpostor && (
              <>
                <div className="modal-role impostor">👹 IMPOSTOR</div>
                <div className="modal-info impostor-info">
                  {player.category && (
                    <div className="info-row">
                      <span className="info-label">CATEGORÍA</span>
                      <span className="info-value">{player.category}</span>
                    </div>
                  )}
                  {player.hint && (
                    <>
                      <div className="info-divider" />
                      <div className="info-row">
                        <span className="info-label">PISTA</span>
                        <span className="info-value hint">{player.hint}</span>
                      </div>
                    </>
                  )}
                  {!player.category && !player.hint && (
                    <p className="impostor-msg">Intenta pasar desapercibido entre los ciudadanos…</p>
                  )}
                </div>
              </>
            )}
            <button className="modal-btn" onClick={() => setPhase("confirm")}>
              Entendido, ocultar
            </button>
          </>
        ) : (
          <>
            <div className="confirm-icon">🔒</div>
            <p className="confirm-text">¿Seguro que quieres cerrar?<br />Nadie más podrá ver tu tarjeta.</p>
            <div className="confirm-btns">
              <button className="modal-btn secondary" onClick={() => setPhase("identity")}>Volver</button>
              <button className="modal-btn" onClick={onClose}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}