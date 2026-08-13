(() => {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayDesc = document.getElementById("overlay-desc");
  const startBtn = document.getElementById("start-btn");
  const finalBlock = document.getElementById("final-score-block");
  const finalScoreEl = document.getElementById("final-score");
  const playerNameInput = document.getElementById("player-name");
  const submitBtn = document.getElementById("submit-score-btn");
  const retryBtn = document.getElementById("retry-btn");

  const scoreEl = document.getElementById("score");
  const comboEl = document.getElementById("combo");
  const levelEl = document.getElementById("level");
  const lbEl = document.getElementById("game-leaderboard");

  // --- Config ---
  const BASE_W = 720;
  const BASE_H = 480;
  let W = BASE_W;
  let H = BASE_H;
  let scale = 1;

  // --- State ---
  let running = false;
  let score = 0;
  let combo = 0;
  let level = 1;
  let targets = [];
  let trueIndex = 0;
  let timeLeft = 0;
  let maxTime = 3.2;
  let lastTs = 0;
  let highlightTimer = 0;
  let particles = [];

  function resize() {
    const maxW = Math.min(window.innerWidth - 32, BASE_W);
    const maxH = Math.min(window.innerHeight - 180, BASE_H);
    const ratio = BASE_W / BASE_H;
    if (maxW / maxH > ratio) {
      H = maxH;
      W = H * ratio;
    } else {
      W = maxW;
      H = W / ratio;
    }
    scale = W / BASE_W;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createTarget() {
    const r = rand(14, 22) * scale;
    return {
      x: rand(r + 10, W - r - 10),
      y: rand(r + 10, H - r - 10),
      vx: rand(-1.8, 1.8) * (0.9 + level * 0.12) * scale,
      vy: rand(-1.8, 1.8) * (0.9 + level * 0.12) * scale,
      r,
      phase: Math.random() * Math.PI * 2,
      wobble: rand(0.4, 1.2)
    };
  }

  function spawnRound() {
    const count = Math.min(5 + Math.floor(level * 1.3), 14);
    targets = [];
    for (let i = 0; i < count; i++) {
      targets.push(createTarget());
    }
    trueIndex = Math.floor(Math.random() * targets.length);
    maxTime = Math.max(1.35, 3.4 - level * 0.18);
    timeLeft = maxTime;
    highlightTimer = 0.9; // brief window where true target glows
  }

  function startGame() {
    score = 0;
    combo = 0;
    level = 1;
    particles = [];
    updateHud();
    spawnRound();
    running = true;
    overlay.classList.add("hidden");
    finalBlock.classList.add("hidden");
    startBtn.classList.remove("hidden");
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    overlayTitle.textContent = "Run Over";
    overlayDesc.innerHTML = `You scored <strong>${score.toLocaleString()}</strong> points.`;
    finalScoreEl.textContent = score.toLocaleString();
    finalBlock.classList.remove("hidden");
    startBtn.classList.add("hidden");
    overlay.classList.remove("hidden");
    renderGameLeaderboard();
  }

  function updateHud() {
    scoreEl.textContent = score.toLocaleString();
    comboEl.textContent = combo;
    levelEl.textContent = level;
  }

  function addParticles(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x, y,
        vx: rand(-3, 3) * scale,
        vy: rand(-3, 3) * scale,
        life: rand(0.3, 0.7),
        color
      });
    }
  }

  function update(dt) {
    for (const t of targets) {
      t.phase += dt * t.wobble;
      t.x += t.vx + Math.sin(t.phase) * 0.45 * scale;
      t.y += t.vy + Math.cos(t.phase * 0.9) * 0.45 * scale;

      if (t.x < t.r || t.x > W - t.r) t.vx *= -1;
      if (t.y < t.r || t.y > H - t.r) t.vy *= -1;
      t.x = Math.max(t.r, Math.min(W - t.r, t.x));
      t.y = Math.max(t.r, Math.min(H - t.r, t.y));
    }

    if (highlightTimer > 0) {
      highlightTimer -= dt;
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        combo = 0;
        endGame();
        return;
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function draw() {
    ctx.fillStyle = "#0d1018";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";
    ctx.lineWidth = 1;
    const step = 40 * scale;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const showHighlight = highlightTimer > 0;

    targets.forEach((t, i) => {
      const isTrue = i === trueIndex;

      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);

      if (showHighlight && isTrue) {
        // Only the true target glows during the short highlight window
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r * 1.7);
        grad.addColorStop(0, "hsla(160, 100%, 62%, 0.95)");
        grad.addColorStop(0.55, "hsla(160, 100%, 50%, 0.45)");
        grad.addColorStop(1, "hsla(160, 100%, 40%, 0)");
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(160, 100%, 55%, 0.95)";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.2 * scale;
        ctx.stroke();
      } else {
        // All targets look identical after highlight — player must track by motion
        ctx.fillStyle = "hsla(210, 55%, 52%, 0.88)";
        ctx.fill();
        ctx.strokeStyle = "hsla(210, 60%, 70%, 0.35)";
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
      }
    });

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (!showHighlight && running) {
      const barH = 6 * scale;
      const pct = Math.max(0, timeLeft / maxTime);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(0, H - barH, W, barH);
      ctx.fillStyle = pct > 0.35 ? "#00ffa3" : "#ff2a6d";
      ctx.fillRect(0, H - barH, W * pct, barH);
    }

    if (showHighlight && running) {
      ctx.fillStyle = "rgba(0, 240, 255, 0.9)";
      ctx.font = `bold ${13 * scale}px JetBrains Mono, monospace`;
      ctx.textAlign = "center";
      ctx.fillText("MEMORIZE THE GLOWING ONE", W / 2, 22 * scale);
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function handleClick(clientX, clientY) {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    let hit = -1;
    // Prefer the true target if overlapping (rare)
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy <= t.r * t.r) {
        hit = i;
        if (i === trueIndex) break;
      }
    }

    if (hit === -1) return;

    if (hit === trueIndex) {
      combo += 1;
      const base = 100 + level * 25;
      const timeBonus = Math.floor(timeLeft * 40);
      const comboBonus = Math.floor(combo * 15);
      score += base + timeBonus + comboBonus;
      addParticles(targets[hit].x, targets[hit].y, "#00ffa3", 14);

      if (combo % 3 === 0) level += 1;
      updateHud();
      spawnRound();
    } else {
      combo = 0;
      addParticles(targets[hit].x, targets[hit].y, "#ff2a6d", 8);
      endGame();
    }
  }

  canvas.addEventListener("click", e => {
    e.preventDefault();
    handleClick(e.clientX, e.clientY);
  });

  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    if (e.touches.length) {
      handleClick(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  startBtn.addEventListener("click", startGame);
  retryBtn.addEventListener("click", startGame);

  submitBtn.addEventListener("click", () => {
    const name = playerNameInput.value;
    if (window.Leaderboard) {
      Leaderboard.submitScore("focus-lock", name, score);
      renderGameLeaderboard();
    }
    submitBtn.textContent = "Submitted!";
    submitBtn.disabled = true;
    setTimeout(() => {
      submitBtn.textContent = "Submit Score";
      submitBtn.disabled = false;
    }, 1500);
  });

  function renderGameLeaderboard() {
    if (!lbEl || !window.Leaderboard) return;
    const top = Leaderboard.getTop10("focus-lock");
    if (!top.length) {
      lbEl.innerHTML = `<li class="empty">No scores yet</li>`;
      return;
    }
    lbEl.innerHTML = top.map(e => `
      <li>
        <span class="name">${escapeHtml(e.name)}</span>
        <span class="score">${e.score.toLocaleString()}</span>
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

  window.addEventListener("resize", () => {
    resize();
    if (!running) draw();
  });

  // Init
  resize();
  renderGameLeaderboard();
  draw();
})();
