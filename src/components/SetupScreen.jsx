import { useState } from "react";
import { DEFAULT_WORD_BANK } from "../data/wordBank";
import { mergeWordBank, applyWordFilters } from "../utils/gameLogic";

export default function SetupScreen({ onStart, onBack, savedConfig, customWords }) {
  const [playerCount, setPlayerCount] = useState(savedConfig?.names?.length || 4);
  const [names, setNames] = useState(savedConfig?.names || ["", "", "", ""]);
  const [impostorCount, setImpostorCount] = useState(savedConfig?.impostorCount || 1);
  const [impostorSeesTheme, setImpostorSeesTheme] = useState(savedConfig?.impostorSeesTheme || false);
  const [impostorSeesHint, setImpostorSeesHint] = useState(savedConfig?.impostorSeesHint || false);

  // Banco completo (default + custom)
  const fullBank = mergeWordBank(customWords);
  const allCats = Object.keys(fullBank);

  // Categorías activas (todas por defecto)
  const [activeCats, setActiveCats] = useState(() => new Set(allCats));
  // Palabras desactivadas individualmente: Set de "Cat::Palabra"
  const [disabledWords, setDisabledWords] = useState(() => new Set());
  // Qué categoría está expandida para ver sus palabras
  const [expandedCat, setExpandedCat] = useState(null);
  // Panel de palabras colapsado por defecto
  const [wordsPanelOpen, setWordsPanelOpen] = useState(false);

  const updateCount = (val) => {
    const n = Math.max(3, Math.min(12, val));
    setPlayerCount(n);
    setNames(prev => { const arr = [...prev]; while (arr.length < n) arr.push(""); return arr.slice(0, n); });
    setImpostorCount(ic => Math.min(ic, Math.floor(n / 2)));
  };

  const toggleCat = (cat) => {
    setActiveCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size === 1) return prev; // al menos 1 activa
        next.delete(cat);
        if (expandedCat === cat) setExpandedCat(null);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const toggleWord = (cat, word) => {
    const key = `${cat}::${word}`;
    setDisabledWords(prev => {
      const next = new Set(prev);
      // No permitir desactivar si solo queda 1 palabra activa en esa cat
      const activeInCat = fullBank[cat].filter(w => !next.has(`${cat}::${w.word}`));
      if (!next.has(key) && activeInCat.length <= 1) return prev;
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Conteo de palabras activas total
  const totalActive = allCats.reduce((sum, cat) => {
    if (!activeCats.has(cat)) return sum;
    return sum + fullBank[cat].filter(w => !disabledWords.has(`${cat}::${w.word}`)).length;
  }, 0);

  const validNames = names.every(n => n.trim().length > 0);
  const canStart = validNames && totalActive >= 1;

  const handleStart = () => {
    if (!canStart) return;
    const wordBank = applyWordFilters(fullBank, activeCats, disabledWords);
    onStart({ names: names.map(n => n.trim()), impostorCount, impostorSeesTheme, impostorSeesHint, wordBank });
  };

  return (
    <div className="screen setup-screen">
      <div className="setup-card">
        <div className="setup-topbar">
          <button className="back-btn" onClick={onBack}>← Menú</button>
          <span className="setup-mode-badge">🎮 Offline</span>
        </div>
        <div className="logo" style={{paddingTop: 0}}>
          <h1>IMPOSTOR</h1>
          <p className="tagline">Configura la partida</p>
        </div>

        {/* Jugadores */}
        <div className="section">
          <label>Número de jugadores</label>
          <div className="counter-row">
            <button className="counter-btn" onClick={() => updateCount(playerCount - 1)}>−</button>
            <span className="counter-val">{playerCount}</span>
            <button className="counter-btn" onClick={() => updateCount(playerCount + 1)}>+</button>
          </div>
        </div>
        <div className="section names-section">
          <label>Nombres de los jugadores</label>
          <div className="names-grid">
            {names.map((name, i) => (
              <div key={i} className="name-input-wrap">
                <span className="name-num">{i + 1}</span>
                <input className="name-input" placeholder={`Jugador ${i + 1}`} value={name}
                  onChange={e => { const arr = [...names]; arr[i] = e.target.value; setNames(arr); }} maxLength={20} />
              </div>
            ))}
          </div>
        </div>

        {/* Impostores */}
        <div className="section">
          <label>Número de impostores</label>
          <div className="counter-row">
            <button className="counter-btn" onClick={() => setImpostorCount(Math.max(1, impostorCount - 1))}>−</button>
            <span className="counter-val impostor-count">{impostorCount}</span>
            <button className="counter-btn" onClick={() => setImpostorCount(Math.min(Math.floor(playerCount / 2), impostorCount + 1))}>+</button>
          </div>
        </div>

        {/* Opciones impostor */}
        <div className="section toggles-section">
          <label>Opciones del impostor</label>
          <div className="toggle-row">
            <span>El impostor ve la temática</span>
            <button className={`toggle ${impostorSeesTheme ? "on" : "off"}`} onClick={() => setImpostorSeesTheme(!impostorSeesTheme)}>{impostorSeesTheme ? "SÍ" : "NO"}</button>
          </div>
          <div className="toggle-row">
            <span>El impostor ve la pista</span>
            <button className={`toggle ${impostorSeesHint ? "on" : "off"}`} onClick={() => setImpostorSeesHint(!impostorSeesHint)}>{impostorSeesHint ? "SÍ" : "NO"}</button>
          </div>
        </div>

        {/* Selector de palabras — panel colapsable */}
        <div className="section words-panel-section">
          <button className="words-panel-trigger" onClick={() => setWordsPanelOpen(o => !o)}>
            <div className="words-panel-trigger-left">
              <span className="words-panel-icon">🗂️</span>
              <div>
                <span className="words-panel-title">Palabras a usar</span>
                <span className="words-panel-sub">{totalActive} palabras · {activeCats.size} categoría{activeCats.size !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <span className="words-panel-chevron">{wordsPanelOpen ? "▲" : "▼"}</span>
          </button>

          {wordsPanelOpen && (
            <div className="cats-sel-list">
              {allCats.map(cat => {
                const isActive = activeCats.has(cat);
                const wordsInCat = fullBank[cat];
                const activeCount = wordsInCat.filter(w => !disabledWords.has(`${cat}::${w.word}`)).length;
                const isExpanded = expandedCat === cat;
                const isCustomOnly = !DEFAULT_WORD_BANK[cat];

                return (
                  <div key={cat} className={`cat-sel-block ${isActive ? "active" : "inactive"}`}>
                    <div className="cat-sel-row">
                      <button className={`cat-sel-toggle ${isActive ? "on" : "off"}`} onClick={() => toggleCat(cat)}>
                        {isActive ? "✓" : "○"}
                      </button>
                      <span className="cat-sel-name">
                        {cat}
                        {isCustomOnly && <span className="custom-badge">mía</span>}
                      </span>
                      <span className="cat-sel-counter">{isActive ? `${activeCount}/${wordsInCat.length}` : wordsInCat.length}</span>
                      {isActive && (
                        <button className="cat-sel-expand" onClick={() => setExpandedCat(isExpanded ? null : cat)}>
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      )}
                    </div>
                    {isActive && isExpanded && (
                      <div className="words-sel-grid">
                        {wordsInCat.map(w => {
                          const key = `${cat}::${w.word}`;
                          const isOn = !disabledWords.has(key);
                          const activeInCat = wordsInCat.filter(ww => !disabledWords.has(`${cat}::${ww.word}`)).length;
                          const cantDisable = isOn && activeInCat <= 1;
                          return (
                            <button key={w.word}
                              className={`word-sel-chip ${isOn ? "on" : "off"} ${cantDisable ? "locked" : ""}`}
                              onClick={() => !cantDisable && toggleWord(cat, w.word)}>
                              {isOn ? "✓" : "○"} {w.word}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botón sticky al fondo */}
        <div className="start-sticky">
          <button className={`start-btn ${!canStart ? "disabled" : ""}`} disabled={!canStart} onClick={handleStart}>
            {!validNames ? "Escribe todos los nombres" : "⚡ COMENZAR PARTIDA"}
          </button>
        </div>
      </div>
    </div>
  );
}