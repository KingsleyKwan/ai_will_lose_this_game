/**
 * Simple leaderboard utility.
 * Currently uses localStorage so the site works offline / on pure GitHub Pages.
 * Designed so a remote backend (Supabase, Cloudflare, etc.) can be swapped in later
 * by replacing the storage methods.
 */

const LB_PREFIX = "aiwltg_lb_";

function getLeaderboard(gameId) {
  try {
    const raw = localStorage.getItem(LB_PREFIX + gameId);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(gameId, list) {
  // Keep only top 20 to avoid bloat
  const trimmed = list.slice(0, 20);
  localStorage.setItem(LB_PREFIX + gameId, JSON.stringify(trimmed));
}

/**
 * Submit a score. Returns the new ranked list (top 10 shown to user).
 * name can be empty → "Anonymous"
 */
function submitScore(gameId, name, score) {
  const cleanName = (name || "Anonymous").trim().slice(0, 20) || "Anonymous";
  const list = getLeaderboard(gameId);

  list.push({
    name: cleanName,
    score: Math.floor(score),
    ts: Date.now()
  });

  // Sort descending by score, then by most recent
  list.sort((a, b) => b.score - a.score || b.ts - a.ts);

  saveLeaderboard(gameId, list);
  return list.slice(0, 10);
}

function getTop10(gameId) {
  return getLeaderboard(gameId).slice(0, 10);
}

// Expose globally
window.Leaderboard = {
  getTop10,
  submitScore,
  getLeaderboard
};
