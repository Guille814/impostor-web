import { useState, useEffect } from "react";
import {
    listenToGame, listenToPlayers, listenToVotes,
    castVote, resolveVote, startVoting,
    impostorGuessedWord, returnToLobby, continueAfterVote
} from "../../utils/sessionUtils";
import { getMostVoted } from "../../utils/onlineGameLogic";

export default function OnlineGameScreen({ code, playerId, isHost, wordBank, onReturnToLobby }) {
    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState([]);
    const [votes, setVotes] = useState([]);
    const [myVotes, setMyVotes] = useState({});
    const [cardsSeen, setCardsSeen] = useState(new Set());
    const [showCard, setShowCard] = useState(null);
    const [resolving, setResolving] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [passPhoneTo, setPassPhoneTo] = useState(null);

    useEffect(() => {
        const u1 = listenToGame(code, g => {
            setGame(g);
            if (g?.status === "lobby") onReturnToLobby();
        });
        const u2 = listenToPlayers(code, setPlayers);
        const u3 = listenToVotes(code, setVotes);
        return () => { u1(); u2(); u3(); };
    }, [code]);

    useEffect(() => {
        if (game?.status === "voting") setMyVotes({});
    }, [game?.status]);

    useEffect(() => {
        if (game?.status === "cards") setCardsSeen(new Set());
    }, [game?.word]);

    const me = players.find(p => p.id === playerId);
    const activePlayers = players.filter(p => !p.isEliminated);
    const totalVoters = activePlayers.reduce((sum, p) => sum + (p.names?.length || 1), 0);
    const allVoted = votes.length >= totalVoters && totalVoters > 0;
    const myImpostorIndices = new Set(me?.impostorNameIndices || []);
    const isThisNameImpostor = me?.isImpostor && myImpostorIndices.has(showCard?.index);

    useEffect(() => {
        if (!isHost || !allVoted || game?.status !== "voting" || resolving) return;
        setResolving(true);
        const t = setTimeout(async () => {
            const mostVoted = getMostVoted(votes);
            if (mostVoted) await resolveVote(code, mostVoted);
            setResolving(false);
        }, 1500);
        return () => clearTimeout(t);
    }, [votes.length, allVoted, game?.status]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/game/${code}`);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const InviteButton = () => (
        <button className="back-btn" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={handleCopyLink}>
            {linkCopied ? "✓ Copiado" : "🔗 Invitar"}
        </button>
    );

    if (!game) return <div className="screen menu-screen"><p style={{ color: "var(--muted)" }}>Cargando…</p></div>;

    if (game.status === "cards") {
        const myNames = me?.names || [];
        return (
            <div className="screen cards-screen">
                <div className="cards-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 560 }}>
                    <InviteButton />
                    {isHost && (
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="back-btn" onClick={() => startVoting(code)}>🗳️ Votar</button>
                            <button className="back-btn" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
                                onClick={() => impostorGuessedWord(code)}>💡 Impostor adivinó</button>
                        </div>
                    )}
                </div>
                <div className="cards-header">
                    <h2>Tus tarjetas</h2>
                    <p>Toca cada tarjeta para ver tu rol</p>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(cardsSeen.size / Math.max(myNames.length, 1)) * 100}%` }} />
                    </div>
                    <span className="progress-text">{cardsSeen.size} / {myNames.length} vistas</span>
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
                <div style={{ width: "100%", maxWidth: 560, marginTop: 20, padding: "0 4px" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                        Jugadores activos
                    </p>
                    <div className="reveal-citizens-list">
                        {activePlayers.map(p => p.names?.map((name, i) => (
                            <span key={`${p.id}-${i}`} className="citizen-chip">{name}</span>
                        )))}
                    </div>
                </div>
                {showCard && (
                    <div className="modal-overlay">
                        <div className="modal-card">
                            <div className="modal-name">{showCard.name}</div>
                            {isThisNameImpostor ? (
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

    if (game.status === "voting") {
        const myPlayer = players.find(p => p.id === playerId);
        const myAllNames = myPlayer?.names || [];
        const myActiveNames = myPlayer?.isEliminated ? [] : myAllNames;
        const myVoteKeys = myActiveNames.map((_, i) => `${playerId}-${i}`);
        const myVotesPlaced = votes.filter(v => myVoteKeys.includes(v.voterId));
        const allMineVoted = myActiveNames.length === 0 || myVotesPlaced.length >= myActiveNames.length;
        const nextVoterIndex = myActiveNames.findIndex((_, ni) => !myVotes[`${playerId}-${ni}`]);
        const currentVoterName = nextVoterIndex >= 0 ? myActiveNames[nextVoterIndex] : null;

        const allEligibleNames = [];
        for (const p of activePlayers) {
            p.names?.forEach((name, ni) => {
                const isSelf = p.id === playerId && ni === nextVoterIndex;
                if (!isSelf) {
                    allEligibleNames.push({ deviceId: p.id, nameIndex: ni, name, voteTargetId: `${p.id}-name-${ni}` });
                }
            });
        }

        return (
            <div className="screen cards-screen">
                <div className="cards-topbar" style={{ width: "100%", maxWidth: 560 }}>
                    <InviteButton />
                </div>
                <div className="cards-header">
                    <h2>🗳️ Votación</h2>
                    <p>
                        {allMineVoted ? "Habéis votado — esperando al resto"
                            : myActiveNames.length > 1 ? `Turno de votar: ${currentVoterName}`
                            : "Vota a quién crees que es el impostor"}
                    </p>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(votes.length / Math.max(totalVoters, 1)) * 100}%` }} />
                    </div>
                    <span className="progress-text">{votes.length} / {totalVoters} votos totales</span>
                </div>
                {!allMineVoted ? (
                    <div className="cards-grid">
                        {allEligibleNames.map(({ deviceId, nameIndex, name, voteTargetId }) => (
                            <div key={`${deviceId}-${nameIndex}`} className="player-card unseen"
                                onClick={() => {
                                    if (nextVoterIndex === -1) return;
                                    const voteKey = `${playerId}-${nextVoterIndex}`;
                                    setMyVotes(prev => ({ ...prev, [voteKey]: voteTargetId }));
                                    castVote(code, voteKey, voteTargetId);
                                    const remaining = myActiveNames.findIndex((_, ni) => ni > nextVoterIndex && !myVotes[`${playerId}-${ni}`]);
                                    if (remaining !== -1) setPassPhoneTo(myActiveNames[remaining]);
                                }}>
                                <span className="card-eye">👤</span>
                                <span className="card-name">{name}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="words-empty" style={{ marginTop: 40 }}>
                        <span className="words-empty-icon">✅</span>
                        <p>{myActiveNames.length > 1 ? "Todos habéis votado" : "Has votado"}</p>
                        <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Esperando al resto…</p>
                    </div>
                )}
                {passPhoneTo && (
                    <div className="modal-overlay">
                        <div className="modal-card">
                            <div className="confirm-icon">📱</div>
                            <p className="confirm-text">Pasa el móvil a<br />
                                <strong style={{ color: "var(--citizen)", fontSize: "1.2rem" }}>{passPhoneTo}</strong>
                            </p>
                            <button className="modal-btn" onClick={() => setPassPhoneTo(null)}>
                                Listo, soy {passPhoneTo}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (game.status === "vote_result") {
        const wasImpostor = game.lastEliminatedWasImpostor;
        const eliminatedDisplayName = game.lastEliminatedName || "Jugador";
        const remainingImpostors = activePlayers.filter(p => p.isImpostor && p.id !== game.lastEliminated).length;

        return (
            <div className="screen reveal-screen">
                <div className="reveal-card">
                    <div className="reveal-header">
                        <span className="reveal-skull">{wasImpostor ? "👹" : "😇"}</span>
                        <h2>{eliminatedDisplayName} era…</h2>
                    </div>
                    <div className="impostor-reveal-row"
                        style={wasImpostor ? {} : { borderColor: "rgba(76,201,240,0.3)", background: "rgba(76,201,240,0.08)" }}>
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
                            <InviteButton />
                            {isHost && <button className="start-btn" onClick={() => returnToLobby(code)}>🔄 Volver al lobby</button>}
                            {!isHost && <p style={{ color: "var(--muted)", textAlign: "center", fontSize: "0.9rem" }}>Esperando al host…</p>}
                        </>
                    ) : (
                        <>
                            <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center" }}>
                                Quedan <strong style={{ color: "var(--accent)" }}>{remainingImpostors}</strong> impostor{remainingImpostors !== 1 ? "es" : ""} activo{remainingImpostors !== 1 ? "s" : ""}
                            </p>
                            <InviteButton />
                            {isHost && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                                    <button className="start-btn" onClick={() => startVoting(code)}>🗳️ Nueva votación</button>
                                    <button className="back-btn" style={{ textAlign: "center" }} onClick={() => continueAfterVote(code)}>← Volver a tarjetas</button>
                                </div>
                            )}
                            {!isHost && <p style={{ color: "var(--muted)", textAlign: "center", fontSize: "0.9rem" }}>Esperando al host…</p>}
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (game.status === "finished") {
        return (
            <div className="screen reveal-screen">
                <div className="reveal-card">
                    <div className="reveal-header">
                        <span className="reveal-skull">💡</span>
                        <h2>{game.endReason === "impostor_guessed" ? "¡El impostor adivinó!" : "¡Partida terminada!"}</h2>
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
                    <InviteButton />
                    {isHost && <button className="start-btn" onClick={() => returnToLobby(code)}>🔄 Volver al lobby</button>}
                    {!isHost && <p style={{ color: "var(--muted)", textAlign: "center", fontSize: "0.9rem" }}>Esperando al host…</p>}
                </div>
            </div>
        );
    }

    return null;
}