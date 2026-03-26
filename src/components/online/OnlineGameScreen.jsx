import { useState, useEffect } from "react";
import {
  listenToGame, listenToPlayers, listenToVotes,
  castVote, resolveVote, startVoting, continueAfterVote,
  impostorGuessedWord, updateGameSettings
} from "../../utils/sessionUtils";
import { getMostVoted } from "../../utils/onlineGameLogic";

export default function OnlineGameScreen({ code, playerId, isHost, onEnd }) {
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [votes, setVotes] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [cardsSeen, setCardsSeen] = useState(new Set());
  const [showCard, setShowCard] = useState(null);

  useEffect(() => {
    const u1 = listenToGame(code, setGame);
    const u2 = listenToPlayers(code, setPlayers);
    const u3 = listenToVotes(code, setVotes);
    return () => { u1(); u2(); u3(); };
  }, [code]);

  const me = players.find(p => p.id === playerId);
  const activePlayers = players.filter(p => !p.isEliminated);
  const totalVoters = activePlayers.length;
  const allVoted = votes.length >= totalVoters;

  // Host resuelve cuando todos han votado
  useEffect(() => {
    if (!isHost || !allVoted || game?.status !== "voting" || votes.length === 0) return;
    const mostVoted = getMostVoted(votes);
    if (mostVoted) {
      resolveVote(code, mostVoted, players);
    }
  }, [votes, allVoted, game?.status]);

  if (!game) return <div className="screen menu-screen"><p style={{ color: "var(--muted)" }}>Cargando…</p></div>;

  // ── FASE: TARJETAS ──────────────────────────────────────────────
  if (game.status === "cards") {
    const myNames = me?.names || [];
    const allSeen = myNames.every((_, i) => cardsSeen.has(`${playerId}-${i}`));

    return (
      <div className="screen cards-screen">
        {isHost && (
          <div className="cards-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Host · {code}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="back-btn" onClick={() => startVoting(code)}>🗳️ Votar</button>
              <button className="back-btn" style={{ color: "var(--accent)", borderColor: "var(--accent)" }} onClick={() => impostorGuessedWord(code)}>💡 Impostor adivinó</button>
            </div>
          </div>
        )}

        <div className="cards-header">
          <h2>Tus tarjetas</h2>
          <p>Toca cada tarjeta para ver tu rol</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(cardsSeen.size / Math.max(myNames.length, 1)) * 100}%` }} />
          </div>
        </div>

        <div className="cards-grid">
          {myNames.map((name, i) => {
            const key = `${playerId}-${i}`;
            const seen = cardsSeen.has(key);
            return (
              <div key={i} className={`player-card ${seen ? "seen" : "unseen"}`}
                onClick={() => !seen && setShowCard({ name, index: i, key })}>
                {seen
                  ? <><span className="card-check">✓</span><span className="card-name">{name}</span></>
                  : <><span className="card-eye">👁️</span><span className="card-name">{name}</span><span className="card-tap">Toca para ver</span></>
                }
              </div>
            );
          })}
        </div>

        {/* Lista de jugadores activos (sin roles) */}
        <div style={{ width: "100%", maxWidth: 560, marginTop: 20 }}>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Jugadores en partida</p>
          <div className="reveal-citizens-list">
            {activePlayers.map(p => p.names?.map((name, i) => (
              <span key={`${p.id}-${i}`} className="citizen-chip">{name}</span>
            )))}
          </div>
        </div>

        {/* Modal de tarjeta */}
        {showCard && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-name">{showCard.name}</div>
              {me?.isImpostor ? (
                <>
                  <div className="modal-role impostor">👹 IMPOSTOR</div>
                  <div className="modal-info impostor-info">
                    {game.category && <div className="info-row"><span className="info-label">CATEGORÍA</span><span className="info-value">{game.category}</span></div>}
                    <p className="impostor-msg">Intenta pasar desapercibido…</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-word-display">
                    <span className="modal-word-label">TU PALABRA ES</span>
                    <span className="modal-big-word">{game.word}</span>
                    <span className="modal-category-badge">{game.category}</span>
                  </div>
                  {game.hint && (
                    <div className="modal-info">
                      <div className="info-row"><span className="info-label">PISTA</span><span className="info-value hint">{game.hint}</span></div>
                    </div>
                  )}
                </>
              )}
              <button className="modal-btn" onClick={() => {
                setCardsSeen(prev => new Set([...prev, showCard.key]));
                setShowCard(null);
              }}>Entendido, ocultar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── FASE: VOTACIÓN ──────────────────────────────────────────────
  if (game.status === "voting") {
    const eligibleTargets = activePlayers.filter(p => p.id !== playerId);

    return (
      <div className="screen cards-screen">
        <div className="cards-header">
          <h2>🗳️ Votación</h2>
          <p>Vota a quién crees que es el impostor</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(votes.length / Math.max(totalVoters, 1)) * 100}%` }} />
          </div>
          <span className="progress-text">{votes.length} / {totalVoters} votos</span>
        </div>

        <div className="cards-grid">
          {eligibleTargets.map(p =>
            p.names?.map((name, i) => {
              const targetId = p.id;
              const voted = myVote === targetId;
              return (
                <div key={`${p.id}-${i}`}
                  className={`player-card unseen ${voted ? "voted" : ""}`}
                  style={voted ? { borderColor: "var(--accent)", background: "rgba(230,57,70,0.1)" } : {}}
                  onClick={() => {
                    if (myVote) return;
                    setMyVote(targetId);
                    castVote(code, `${playerId}-${i}`, targetId);
                  }}>
                  <span className="card-eye">{voted ? "🎯" : "👤"}</span>
                  <span className="card-name">{name}</span>
                  {voted && <span className="card-tap">Tu voto</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── FASE: RESULTADO DE VOTO ─────────────────────────────────────
  if (game.status === "vote_result") {
    const eliminated = players.find(p => p.id === game.lastEliminated);
    const wasImpostor = game.lastEliminatedWasImpostor;
    const remainingImpostors = activePlayers.filter(p => p.isImpostor && p.id !== game.lastEliminated).length;

    return (
      <div className="screen reveal-screen">
        <div className="reveal-card">
          <div className="reveal-header">
            <span className="reveal-skull">{wasImpostor ? "👹" : "😇"}</span>
            <h2>{eliminated?.names?.join(" / ")} era…</h2>
          </div>

          <div className={`impostor-reveal-row`} style={wasImpostor ? {} : { borderColor: "rgba(76,201,240,0.3)", background: "rgba(76,201,240,0.08)" }}>
            <span className="impostor-reveal-icon">{wasImpostor ? "👹" : "🙂"}</span>
            <span className="impostor-reveal-name" style={wasImpostor ? {} : { color: "var(--citizen)" }}>
              {wasImpostor ? "IMPOSTOR" : "CIUDADANO"}
            </span>
          </div>

          {game.winner ? (
            <>
              <div className="reveal-divider" />
              <div className="reveal-word-block">
                <span className="reveal-word-label">LA PALABRA ERA</span>
                <span className="reveal-big-word">{game.word}</span>
                <span className="reveal-category-badge">{game.category}</span>
              </div>
              <div className="impostor-reveal-row" style={{ borderColor: game.winner === "citizens" ? "rgba(46,196,182,0.3)" : "rgba(230,57,70,0.3)" }}>
                <span className="impostor-reveal-name" style={{ color: game.winner === "citizens" ? "var(--green)" : "var(--accent)", fontSize: "1.4rem" }}>
                  {game.winner === "citizens" ? "🏆 Ganan los ciudadanos" : "👹 Ganan los impostores"}
                </span>
              </div>
              {isHost && (
                <button className="start-btn" onClick={onEnd}>🔄 Nueva partida</button>
              )}
            </>
          ) : (
            <>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center" }}>
                Quedan <strong style={{ color: "var(--accent)" }}>{remainingImpostors}</strong> impostor{remainingImpostors !== 1 ? "es" : ""} activo{remainingImpostors !== 1 ? "s" : ""}
              </p>
              {isHost && (
                <button className="start-btn" onClick={() => continueAfterVote(code)}>
                  Continuar partida →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── FASE: IMPOSTOR ADIVINÓ ──────────────────────────────────────
  if (game.status === "finished") {
    return (
      <div className="screen reveal-screen">
        <div className="reveal-card">
          <div className="reveal-header">
            <span className="reveal-skull">💡</span>
            <h2>{game.endReason === "impostor_guessed" ? "¡El impostor adivinó la palabra!" : "¡Partida terminada!"}</h2>
          </div>
          <div className="reveal-word-block">
            <span className="reveal-word-label">LA PALABRA ERA</span>
            <span className="reveal-big-word">{game.word}</span>
            <span className="reveal-category-badge">{game.category}</span>
          </div>
          <div className="impostor-reveal-row" style={{ borderColor: game.winner === "citizens" ? "rgba(46,196,182,0.3)" : "rgba(230,57,70,0.3)" }}>
            <span className="impostor-reveal-name" style={{ color: game.winner === "citizens" ? "var(--green)" : "var(--accent)", fontSize: "1.4rem" }}>
              {game.winner === "citizens" ? "🏆 Ganan los ciudadanos" : "👹 Ganan los impostores"}
            </span>
          </div>
          {isHost && (
            <button className="start-btn" onClick={onEnd}>🔄 Nueva partida</button>
          )}
        </div>
      </div>
    );
  }

  return null;
}