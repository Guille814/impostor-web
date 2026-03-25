export default function RevealImpostorsScreen({ players, onEnd }) {
  const impostors = players.filter(p => p.isImpostor);
  const citizens = players.filter(p => !p.isImpostor);
  return (
    <div className="screen reveal-screen">
      <div className="reveal-card">
        <div className="reveal-header">
          <span className="reveal-skull">💀</span>
          <h2>Los impostores eran…</h2>
        </div>
        <div className="impostors-list">
          {impostors.map((p, i) => (
            <div key={i} className="impostor-reveal-row">
              <span className="impostor-reveal-icon">👹</span>
              <span className="impostor-reveal-name">{p.name}</span>
            </div>
          ))}
        </div>
        <div className="reveal-divider" />
        <div className="reveal-word-block">
          <span className="reveal-word-label">LA PALABRA ERA</span>
          <span className="reveal-big-word">{citizens[0]?.word}</span>
          <span className="reveal-category-badge">{citizens[0]?.category}</span>
        </div>
        <div className="reveal-citizens">
          <span className="reveal-citizens-label">Ciudadanos</span>
          <div className="reveal-citizens-list">
            {citizens.map((p, i) => <span key={i} className="citizen-chip">{p.name}</span>)}
          </div>
        </div>
        <button className="start-btn" onClick={onEnd}>🔄 Nueva partida</button>
      </div>
    </div>
  );
}