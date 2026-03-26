export function buildWordBankFromCustomWords(customWords) {
  const bank = {};
  for (const w of customWords) {
    if (!bank[w.category]) bank[w.category] = [];
    bank[w.category].push({ word: w.word, hint: w.hint });
  }
  return bank;
}

export function getMostVoted(votes) {
  const count = {};
  for (const v of votes) {
    count[v.targetId] = (count[v.targetId] || 0) + 1;
  }
  let max = 0;
  let winner = null;
  for (const [id, c] of Object.entries(count)) {
    if (c > max) { max = c; winner = id; }
  }
  return winner;
}

export function checkWinCondition(players) {
  const active = players.filter(p => !p.isEliminated);
  const impostors = active.filter(p => p.isImpostor);
  const citizens = active.filter(p => !p.isImpostor);
  if (impostors.length === 0) return "citizens";
  if (impostors.length > citizens.length) return "impostors"; // > no >=
  return null;
}