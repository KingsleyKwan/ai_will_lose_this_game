# AI Will Lose This Game

A collection of browser games deliberately designed so that **humans perform well** while current general-purpose AI agents (LLMs / VLMs) struggle.

These games target known AI weaknesses:
- Continuous spatial tracking & precise motor control
- Real-time multi-object attention + visual working memory
- Partial observability and motion prediction
- On-the-fly rule induction in novel environments
- Intuitive physics and timing under noise

Inspired by research gaps shown in WebGames, ARC-AGI-3 and similar cognitive benchmarks.

## Play Now

1. Go to the repository **Settings → Pages**
2. Set Source to **Deploy from a branch** → `main` / `/ (root)`
3. After a minute the site will be live at:  
   **https://kingsleykwan.github.io/ai_will_lose_this_game/**

Or just open `index.html` locally.

## Current Games

| Game | Status | Why AI struggles |
|------|--------|------------------|
| **Focus Lock** | ✅ Playable | Multi-object tracking + short-term visual memory. Targets become identical after a brief glow — you must track the correct one by continuous motion. |
| **Signal Hunter** | ✅ Playable | Partial observability + motion prediction. A radar pulse reveals drifting beacons, then they vanish. Click where they *will be*. Screenshot agents see an empty field. |
| Rule Forge | Coming soon | Novel rule induction (ARC-style) |
| Physics Edge | Coming soon | Embodied physics intuition |

## Global Leaderboard (Supabase)

Scores are stored in **Supabase** so every player sees the same Top 10.

If Supabase is not configured, the site automatically falls back to `localStorage` (per-browser only).

### Setup (5 minutes)

1. Create a free project at [supabase.com](https://supabase.com)
2. In the Supabase dashboard open **SQL Editor** → New query
3. Paste and run the entire contents of [`supabase-setup.sql`](./supabase-setup.sql)
4. Go to **Project Settings → API**
5. Copy **Project URL** and the **anon public** key
6. Open [`js/config.js`](./js/config.js) and fill them in:

```js
window.SUPABASE_CONFIG = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```

7. Commit & push (or just refresh if running locally)

The landing page note will change from “stored in this browser” to “Global scores powered by Supabase” when the connection succeeds.

### Security notes

- The provided RLS policies allow public `SELECT` and `INSERT` only (no update/delete).
- Name length and score range are constrained in the policy.
- For production traffic you may later add rate limiting, CAPTCHA, or require auth.

## How Focus Lock works

1. Several identical-looking circles move around the field.
2. One of them briefly **glows**.
3. After the glow disappears you must **click the same circle** by tracking its motion.
4. Speed, number of distractors and time pressure increase with consecutive successes.
5. Wrong click or timeout ends the run.

## How Signal Hunter works

1. Hidden beacons spawn and start drifting.
2. A brief **radar pulse** lights them up so you can lock onto paths.
3. The pulse dies. The beacons stay invisible but keep moving (and bounce off walls).
4. Click each remembered trajectory — aim ahead, not at the last glow.
5. Three misses or a timeout ends the run. Each wave adds more beacons and speed.

## Tech

- Pure HTML / CSS / Vanilla JS (no build step)
- Canvas 2D
- Supabase JS (CDN) for the global leaderboard
- Ready for GitHub Pages
- Mobile-friendly (touch support)

## Roadmap

- [x] Landing page + game selection
- [x] First game (Focus Lock)
- [x] Second game (Signal Hunter)
- [x] Local top-10 leaderboard
- [x] Persistent remote leaderboard (Supabase)
- [ ] More games (Rule Forge, Physics Edge…)
- [ ] Optional simple action API so people can test AI agents against the games

---

Made to highlight where human cognition still has a clear edge.
