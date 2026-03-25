import { useState } from "react";
import { DEFAULT_WORD_BANK } from "../data/wordBank";

export default function WordsScreen({ customWords, onSave, onBack }) {
  const [words, setWords] = useState(customWords);
  const [view, setView] = useState("list"); // list | add | edit
  const [editIndex, setEditIndex] = useState(null);
  const [filterCat, setFilterCat] = useState("Todas");
  const [formWord, setFormWord] = useState("");
  const [formHint, setFormHint] = useState("");
  const [formCat, setFormCat] = useState("");
  const [formNewCat, setFormNewCat] = useState("");
  const [useNewCat, setUseNewCat] = useState(false);

  const allDefaultCats = Object.keys(DEFAULT_WORD_BANK);
  const allCustomCats = [...new Set(words.map(w => w.category))];
  const allCats = [...new Set([...allDefaultCats, ...allCustomCats])];

  const resetForm = () => { setFormWord(""); setFormHint(""); setFormCat(""); setFormNewCat(""); setUseNewCat(false); };

  const openAdd = () => { resetForm(); setView("add"); };
  const openEdit = (i) => {
    const e = words[i];
    setEditIndex(i); setFormWord(e.word); setFormHint(e.hint);
    setFormCat(e.category); setFormNewCat(""); setUseNewCat(false);
    setView("edit");
  };
  const handleDelete = (i) => {
    const next = words.filter((_, idx) => idx !== i);
    setWords(next); onSave(next);
  };
  const handleSave = () => {
    const cat = useNewCat ? formNewCat.trim() : formCat;
    if (!formWord.trim() || !formHint.trim() || !cat) return;
    const entry = { word: formWord.trim(), hint: formHint.trim(), category: cat };
    const next = view === "edit"
      ? words.map((w, i) => i === editIndex ? entry : w)
      : [...words, entry];
    setWords(next); onSave(next); setView("list"); resetForm();
  };

  const filteredWords = filterCat === "Todas" ? words : words.filter(w => w.category === filterCat);
  const formValid = formWord.trim() && formHint.trim() && (useNewCat ? formNewCat.trim() : formCat);

  if (view === "list") return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <button className="back-btn" onClick={onBack}>← Atrás</button>
        <h2 className="words-title">Mis Palabras</h2>
        <button className="add-word-btn" onClick={openAdd}>+ Añadir</button>
      </div>
      <div className="words-content">
        {allCustomCats.length > 0 && (
          <div className="cat-filter-scroll">
            {["Todas", ...allCustomCats].map(cat => (
              <button key={cat} className={`cat-chip ${filterCat === cat ? "active" : ""}`} onClick={() => setFilterCat(cat)}>{cat}</button>
            ))}
          </div>
        )}
        {words.length === 0 ? (
          <div className="words-empty">
            <span className="words-empty-icon">📭</span>
            <p>Aún no tienes palabras personalizadas</p>
            <button className="start-btn" onClick={openAdd} style={{marginTop: 8}}>+ Añadir primera palabra</button>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="words-empty"><span className="words-empty-icon">🔍</span><p>No hay palabras en esta categoría</p></div>
        ) : (
          <div className="words-list">
            {filteredWords.map((w) => {
              const realIndex = words.indexOf(w);
              return (
                <div key={realIndex} className="word-row">
                  <div className="word-row-info">
                    <span className="word-row-word">{w.word}</span>
                    <div className="word-row-meta">
                      <span className="word-row-cat">{w.category}</span>
                      <span className="word-row-hint">💡 {w.hint}</span>
                    </div>
                  </div>
                  <div className="word-row-actions">
                    <button className="icon-btn edit" onClick={() => openEdit(realIndex)}>✏️</button>
                    <button className="icon-btn delete" onClick={() => handleDelete(realIndex)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="screen words-screen">
      <div className="words-topbar">
        <button className="back-btn" onClick={() => { setView("list"); resetForm(); }}>← Atrás</button>
        <h2 className="words-title">{view === "edit" ? "Editar palabra" : "Nueva palabra"}</h2>
        <div style={{width: 80}} />
      </div>
      <div className="words-content">
        <div className="word-form">
          <div className="form-field">
            <label className="form-label">Palabra</label>
            <input className="form-input" placeholder="Ej: Elefante" value={formWord} onChange={e => setFormWord(e.target.value)} maxLength={40} />
          </div>
          <div className="form-field">
            <label className="form-label">Pista (una palabra relacionada)</label>
            <input className="form-input" placeholder="Ej: Trompa" value={formHint} onChange={e => setFormHint(e.target.value)} maxLength={40} />
          </div>
          <div className="form-field">
            <label className="form-label">Categoría</label>
            <div className="cat-toggle-row">
              <button className={`cat-mode-btn ${!useNewCat ? "active" : ""}`} onClick={() => setUseNewCat(false)}>Existente</button>
              <button className={`cat-mode-btn ${useNewCat ? "active" : ""}`} onClick={() => setUseNewCat(true)}>Nueva categoría</button>
            </div>
            {useNewCat ? (
              <input className="form-input" placeholder="Nombre de nueva categoría" value={formNewCat} onChange={e => setFormNewCat(e.target.value)} maxLength={30} />
            ) : (
              <div className="cat-select-grid">
                {allCats.map(cat => (
                  <button key={cat} className={`cat-select-chip ${formCat === cat ? "selected" : ""}`} onClick={() => setFormCat(cat)}>{cat}</button>
                ))}
              </div>
            )}
          </div>
          <button className={`start-btn ${!formValid ? "disabled" : ""}`} disabled={!formValid} onClick={handleSave}>
            {view === "edit" ? "💾 Guardar cambios" : "✅ Añadir palabra"}
          </button>
        </div>
      </div>
    </div>
  );
}