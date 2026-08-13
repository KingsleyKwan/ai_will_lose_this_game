# AI Will Lose This Game

A collection of browser games deliberately designed so that **humans perform well** while current general-purpose AI agents (LLMs / VLMs) struggle.

These games target known AI weaknesses:
- Continuous spatial tracking & precise motor control
- Real-time multi-object attention
- On-the-fly rule induction in novel environments
- Intuitive physics and timing
- High visual noise + sparse feedback

Inspired by research such as WebGames, ARC-AGI-3, and cognitive benchmarks that still show large human–AI gaps.

## Live Demo

Once GitHub Pages is enabled: `https://kingsleykwan.github.io/ai_will_lose_this_game/`

## Games

| Game | Status | Why AI struggles |
|------|--------|------------------|
| **Focus Lock** | ✅ Playable | Continuous multi-object tracking + precise clicking under time pressure and visual clutter |
| Signal Hunter | Coming soon | Partial observability + spatial memory |
| Rule Forge | Coming soon | Novel rule induction (ARC-style) |
| Physics Edge | Coming soon | Intuitive physics & continuous control |

## How to Play

1. Open the landing page.
2. Choose a game.
3. Try to beat the global top 10 (currently local + planned remote leaderboard).

## Tech

- Pure HTML / CSS / Vanilla JS (no build step)
- Canvas for games
- Ready for GitHub Pages
- Leaderboard designed to be swapped from localStorage to a real backend (Supabase / Cloudflare / etc.)

## Contributing / Next Steps

- Add more games that exploit remaining AI weaknesses
- Wire a real persistent leaderboard (Supabase recommended)
- Optional: expose simple action API so people can test AI agents against the games

---

Made for fun and to highlight where human cognition still has the edge.
