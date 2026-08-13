# AI Will Lose This Game

A collection of browser games deliberately designed so that **humans perform well** while current general-purpose AI agents (LLMs / VLMs) struggle.

These games target known AI weaknesses:
- Continuous spatial tracking & precise motor control
- Real-time multi-object attention + visual working memory
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
| **Focus Lock** | ✅ Playable | Multi-object tracking + short-term visual memory. Targets become identical after a brief glow — you must track the correct one by continuous motion. Latency + spatial precision hurt general agents. |
| Signal Hunter | Coming soon | Partial observability + spatial memory |
| Rule Forge | Coming soon | Novel rule induction (ARC-style) |
| Physics Edge | Coming soon | Embodied physics intuition |

## How Focus Lock works

1. Several identical-looking circles move around the field.
2. One of them briefly **glows**.
3. After the glow disappears you must **click the same circle** by tracking its motion.
4. Speed, number of distractors and time pressure increase with consecutive successes.
5. Wrong click or timeout ends the run.

## Leaderboard

Top 10 scores are shown on both the landing page and the game page.

**Current implementation:** `localStorage` (works offline / pure static hosting).

**Next step:** Swap the storage layer in `js/leaderboard.js` for a real backend (Supabase, Cloudflare D1/KV, or Firebase) so scores become truly global across players.

The API surface is already clean:

```js
Leaderboard.submitScore(gameId, name, score)
Leaderboard.getTop10(gameId)
```

## Tech

- Pure HTML / CSS / Vanilla JS (no build step)
- Canvas 2D
- Ready for GitHub Pages
- Mobile-friendly (touch support)

## Roadmap

- [x] Landing page + game selection
- [x] First game (Focus Lock)
- [x] Local top-10 leaderboard
- [ ] Persistent remote leaderboard
- [ ] More games (Signal Hunter, Rule Forge, Physics Edge…)
- [ ] Optional simple action API so people can test AI agents against the games

---

Made to highlight where human cognition still has a clear edge.
