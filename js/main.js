function renderGames() {
  const grid = document.getElementById("games-grid");
  if (!grid) return;

  grid.innerHTML = GAMES.map(game => {
    const isPlayable = game.status === "playable";
    return `
      <article class="game-card ${isPlayable ? "" : "disabled"}">
        <div class="status">${isPlayable ? "● Playable" : "Coming Soon"}</div>
        <h3>${game.title}</h3>
        <p>${game.description}</p>
        <div class="why">${game.why}</div>
        ${isPlayable
          ? `<a class="play-btn" href="${game.path}">Play Now →</a>`
          : `<span class="play-btn" style="opacity:0.4;cursor:default">Locked</span>`
        }
      </article>
    `;
  }).join("");
}

function renderLeaderboard() {
  const el = document.getElementById("global-leaderboard");
  if (!el || !window.Leaderboard) return;

  const top = Leaderboard.getTop10("focus-lock");
  if (!top.length) {
    el.innerHTML = `<li class="empty">No scores yet. Be the first.</li>`;
    return;
  }

  el.innerHTML = top.map(entry => `
    <li>
      <span class="name">${escapeHtml(entry.name)}</span>
      <span class="score">${entry.score.toLocaleString()}</span>
    </li>
  `).join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

document.addEventListener("DOMContentLoaded", () => {
  renderGames();
  renderLeaderboard();
});
