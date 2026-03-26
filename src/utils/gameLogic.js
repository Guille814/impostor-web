import { DEFAULT_WORD_BANK } from "../data/wordBank";

export function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function mergeWordBank(customWords) {
  const merged = {};
  // Primero las categorías custom-only (las que no existen en el banco por defecto)
  for (const entry of customWords) {
    if (!DEFAULT_WORD_BANK[entry.category]) {
      if (!merged[entry.category]) merged[entry.category] = [];
      merged[entry.category].push({ word: entry.word, hint: entry.hint });
    }
  }
  // Luego las categorías predefinidas
  for (const [cat, words] of Object.entries(DEFAULT_WORD_BANK)) {
    merged[cat] = [...words];
  }
  // Añadir palabras custom a categorías predefinidas existentes
  for (const entry of customWords) {
    if (DEFAULT_WORD_BANK[entry.category]) {
      merged[entry.category].push({ word: entry.word, hint: entry.hint });
    }
  }
  return merged;
}

export function applyWordFilters(fullBank, activeCats, disabledWords) {
  const result = {};
  for (const [cat, words] of Object.entries(fullBank)) {
    if (!activeCats.has(cat)) continue;
    const filtered = words.filter(w => !disabledWords.has(`${cat}::${w.word}`));
    if (filtered.length > 0) result[cat] = filtered;
  }
  return result;
}

export function buildPlayers({ names, impostorCount, impostorSeesTheme, impostorSeesHint, wordBank }) {
  const categories = Object.keys(wordBank);
  const category = pickRandom(categories);
  const entry = pickRandom(wordBank[category]);
  const shuffledNames = shuffle(names);
  const allIndexes = shuffle([...Array(shuffledNames.length).keys()]);
  const impostorIndexes = new Set(allIndexes.slice(0, impostorCount));
  return shuffledNames.map((name, i) => {
    const isImpostor = impostorIndexes.has(i);
    if (isImpostor) return {
      name, isImpostor: true,
      category: impostorSeesTheme ? category : null,
      word: null,
      hint: impostorSeesHint ? entry.hint : null,
    };
    return { name, isImpostor: false, category, word: entry.word, hint: entry.hint };
  });
}