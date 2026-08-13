/**
 * Leaderboard utility
 * - Uses Supabase when config is filled in (true global scores)
 * - Falls back to localStorage when Supabase is not configured or fails
 */

const LB_PREFIX = "aiwltg_lb_";

let supabaseClient = null;
let usingRemote = false;

function initSupabase() {
  const cfg = window.SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey) {
    console.info("[Leaderboard] Supabase keys not set → using localStorage");
    return false;
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.warn("[Leaderboard] Supabase JS not loaded → using localStorage");
    return false;
  }
  try {
    supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    usingRemote = true;
    console.info("[Leaderboard] Connected to Supabase");
    return true;
  } catch (err) {
    console.error("[Leaderboard] Failed to init Supabase", err);
    return false;
  }
}

// ---------- localStorage helpers ----------

function localGet(gameId) {
  try {
    const raw = localStorage.getItem(LB_PREFIX + gameId);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function localSave(gameId, list) {
  localStorage.setItem(LB_PREFIX + gameId, JSON.stringify(list.slice(0, 20)));
}

function localSubmit(gameId, name, score) {
  const list = localGet(gameId);
  list.push({ name, score: Math.floor(score), ts: Date.now() });
  list.sort((a, b) => b.score - a.score || b.ts - a.ts);
  localSave(gameId, list);
  return list.slice(0, 10);
}

// ---------- Public API (all async) ----------

/**
 * @returns {Promise<Array<{name: string, score: number, ts?: number}>>}
 */
async function getTop10(gameId) {
  if (usingRemote && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("scores")
        .select("player_name, score, created_at")
        .eq("game_id", gameId)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(row => ({
        name: row.player_name,
        score: row.score,
        ts: row.created_at ? new Date(row.created_at).getTime() : 0
      }));
    } catch (err) {
      console.warn("[Leaderboard] Remote fetch failed, falling back to local", err);
    }
  }
  return localGet(gameId).slice(0, 10);
}

/**
 * Submit a score and return the updated top 10.
 * @returns {Promise<Array<{name: string, score: number}>>}
 */
async function submitScore(gameId, name, score) {
  const cleanName = (name || "Anonymous").trim().slice(0, 20) || "Anonymous";
  const cleanScore = Math.floor(Number(score) || 0);

  if (usingRemote && supabaseClient) {
    try {
      const { error } = await supabaseClient.from("scores").insert({
        game_id: gameId,
        player_name: cleanName,
        score: cleanScore
      });

      if (error) throw error;

      // Also keep a local copy so the player still sees their score offline
      localSubmit(gameId, cleanName, cleanScore);

      return await getTop10(gameId);
    } catch (err) {
      console.warn("[Leaderboard] Remote submit failed, saving locally", err);
    }
  }

  return localSubmit(gameId, cleanName, cleanScore);
}

function isRemote() {
  return usingRemote;
}

// Init immediately when the script loads (config + supabase CDN must be loaded first)
initSupabase();

window.Leaderboard = {
  getTop10,
  submitScore,
  isRemote,
  // kept for compatibility
  getLeaderboard: getTop10
};
