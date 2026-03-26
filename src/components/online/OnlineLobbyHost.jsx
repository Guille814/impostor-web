import { useState, useEffect } from "react";
import {
    listenToPlayers, listenToCustomWords, updateGameSettings,
    startGame, leaveGame, addCustomWordToGame, setPlayerReady
} from "../../utils/sessionUtils";
import { mergeWordBank } from "../../utils/gameLogic";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";


export default function OnlineLobbyHost({ user, customWords, code, hostPlayerId, onGameStart, onBack }) {
    const [players, setPlayers] = useState([]);
    const [gameCustomWords, setGameCustomWords] = useState([]);
    const [impostorCount, setImpostorCount] = useState(1);
    const [copied, setCopied] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importDone, setImportDone] = useState(false);

    useEffect(() => {
        const u1 = listenToPlayers(code, setPlayers);
        const u2 = listenToCustomWords(code, setGameCustomWords);
        return () => { u1(); u2(); };
    }, [code]);

    const shareUrl = `${window.location.origin}/game/${code}`;
    const totalPlayers = players.reduce((sum, p) => sum + (p.names?.length || 1), 0);
    const maxImpostors = Math.max(1, totalPlayers - 1);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImportWords = async () => {
        setImporting(true);
        for (const w of customWords) {
            await addCustomWordToGame(code, hostPlayerId, w.word, w.hint, w.category);
        }
        setImporting(false);
        setImportDone(true);
    };

    const handleStart = async () => {
        if (players.length < 2) return;
        const merged = mergeWordBank([...customWords, ...gameCustomWords]);
        await updateGameSettings(code, { impostorCount });
        await startGame(code, players, merged);
        onGameStart();
    };

    const handleRemoveName = async (playerId, nameIndex) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;
        const newNames = player.names.filter((_, i) => i !== nameIndex);
        if (newNames.length === 0) {
            // Si no quedan nombres, borrar el dispositivo entero
            await leaveGame(code, playerId);
        } else {
            // Actualizar con los nombres restantes
            await updateDoc(doc(db, "games", code, "players", playerId), { names: newNames });
        }
    };

    return (
        <div className="screen words-screen">
            <div className="words-topbar">
                <button className="back-btn" onClick={onBack}>← Salir</button>
                <h2 className="words-title">Lobby · {code}</h2>
                <div style={{ width: 60 }} />
            </div>

            <div className="words-content">
                {/* Invitar */}
                <div className="session-code-block">
                    <span className="session-code-label">CÓDIGO DE PARTIDA</span>
                    <span className="session-code">{code}</span>
                    <p className="session-url">{shareUrl}</p>
                    <button className="modal-btn" onClick={handleCopy}>
                        {copied ? "✓ Enlace copiado" : "🔗 Copiar enlace para invitar"}
                    </button>
                </div>

                {/* Jugadores */}
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
                            <div key={p.id}>
                                {p.names?.map((name, ni) => (
                                    <div key={`${p.id}-${ni}`} className="word-row" style={{ marginBottom: 6 }}>
                                        <div className="word-row-info">
                                            <span className="word-row-word">
                                                {name}
                                                {p.id === hostPlayerId && ni === 0 && (
                                                    <span className="custom-badge" style={{ marginLeft: 8 }}>host</span>
                                                )}
                                            </span>
                                            <span className="word-row-hint">
                                                {p.names.length > 1 ? `📱 Compartiendo móvil` : "📱 Móvil propio"}
                                                {p.ready && <span style={{ marginLeft: 8, color: "var(--green)" }}>· listo</span>}
                                            </span>
                                        </div>
                                        {!(p.id === hostPlayerId && ni === 0) && (
                                            <button className="icon-btn delete" onClick={() => handleRemoveName(p.id, ni)}>🗑️</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* Importar palabras */}
                {user && customWords.length > 0 && !importDone && (
                    <div className="session-code-block" style={{ border: "1.5px solid rgba(76,201,240,0.2)", background: "rgba(76,201,240,0.04)" }}>
                        <span className="session-code-label">TUS PALABRAS GUARDADAS</span>
                        <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
                            Tienes {customWords.length} palabra{customWords.length !== 1 ? "s" : ""} en tu cuenta
                        </p>
                        <button className="modal-btn"
                            style={{ background: "rgba(76,201,240,0.1)", color: "var(--citizen)", border: "1.5px solid rgba(76,201,240,0.3)" }}
                            onClick={handleImportWords} disabled={importing}>
                            {importing ? "Importando…" : `📥 Importar mis ${customWords.length} palabras`}
                        </button>
                    </div>
                )}
                {importDone && <div className="join-success">✓ Palabras importadas</div>}

                {/* Palabras en partida */}
                {gameCustomWords.length > 0 && (
                    <>
                        <div className="session-words-header">
                            <span className="session-words-label">PALABRAS EN LA PARTIDA ({gameCustomWords.length})</span>
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

                {/* Config */}
                <div style={{ background: "var(--surface2)", borderRadius: 12, border: "1.5px solid var(--border)", padding: "14px 16px" }}>
                    <label className="form-label">Impostores en la partida</label>
                    <div className="counter-row" style={{ marginTop: 8 }}>
                        <button className="counter-btn" onClick={() => setImpostorCount(Math.max(1, impostorCount - 1))}>−</button>
                        <span className="counter-val impostor-count">{impostorCount}</span>
                        <button className="counter-btn" onClick={() => setImpostorCount(Math.min(maxImpostors, impostorCount + 1))}>+</button>
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