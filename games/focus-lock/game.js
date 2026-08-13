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

  function createTarget(isTrue = false) {
    const r = rand(14, 22) * scale;
    return {
      x: rand(r + 10, W - r - 10),
      y: rand(r + 10, H - r - 10),
      vx: rand(-1.8, 1.8) * (0.9 + level * 0.12) * scale,
      vy: rand(-1.8, 1.8) * (0.9 + level * 0.12) * scale,
      r,
      hue: isTrue ? 160 + rand(-20, 20) : rand(0, 360),
      phase: Math.random() * Math.PI * 2,
      wobble: rand(0.4, 1.2)
    };
  }

  function spawnRound() {
    const count = Math.min(5 + Math.floor(level * 1.3), 14);
    targets = [];
    for (let i = 0; i < count; i++) {
      targets.push(createTarget(false));
    }
    trueIndex = Math.floor(Math.random() * targets.length);
    targets[trueIndex].hue = 155; // cyan-green for true target during highlight
    maxTime = Math.max(1.35, 3.4 - level * 0.18);
    timeLeft = maxTime;
    highlightTimer = 0.85; // brief highlight window
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
    // Move targets
    for (const t of targets) {
      t.phase += dt * t.wobble;
      t.x += t.vx + Math.sin(t.phase) * 0.4 * scale;
      t.y += t.vy + Math.cos(t.phase * 0.9) * 0.4 * scale;

      // Bounce
      if (t.x < t.r || t.x > W - t.r) t.vx *= -1;
      if (t.y < t.r || t.y > H - t.r) t.vy *= -1;
      t.x = Math.max(t.r, Math.min(W - t.r, t.x));
      t.y = Math.max(t.r, Math.min(H - t.r, t.y));
    }

    // Timer
    if (highlightTimer > 0) {
      highlightTimer -= dt;
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        // Timeout = miss
        combo = 0;
        endGame();
        return;
      }
    }

    // Particles
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

    // Subtle grid
    ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";
    ctx.lineWidth = 1;
    const step = 40 * scale;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Targets
    const showHighlight = highlightTimer > 0;
    targets.forEach((t, i) => {
      const isTrue = i === trueIndex;
      const alpha = showHighlight && isTrue ? 1 : 0.85;

      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);

      if (showHighlight && isTrue) {
        // Glowing true target
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r * 1.6);
        grad.addColorStop(0, `hsla(160, 100%, 60%, 0.9)`);
        grad.addColorStop(0.6, `hsla(160, 100%, 50%, 0.5)`);
        grad.addColorStop(1, `hsla(160, 100%, 40%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(160, 100%, 55%, 0.95)`;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
      } else {
        ctx.fillStyle = `hsla(${t.hue}, 70%, 55%, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${t.hue}, 70%, 70%, 0.4)`;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
      }
    });

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Timer bar (only after highlight)
    if (!showHighlight && running) {
      const barH = 6 * scale;
      const pct = Math.max(0, timeLeft / maxTime);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(0, H - barH, W, barH);
      ctx.fillStyle = pct > 0.35 ? "#00ffa3" : "#ff2a6d";
      ctx.fillRect(0, H - barH, W * pct, barH);
    }

    // Hint text during highlight
    if (showHighlight && running) {
      ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
      ctx.font = `${13 * scale}px JetBrains Mono`;
      ctx.textAlign = "center";
      ctx.fillText("LOCK THE GLOWING TARGET", W / 2, 22 * scale);
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

    // During highlight window we still allow early lock
    let hit = -1;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy <= t.r * t.r) {
        hit = i;
        break;
      }
    }

    if (hit === -1) return; // miss click does nothing (or could punish)

    if (hit === trueIndex) {
      // Success
      combo += 1;
      const base = 100 + level * 25;
      const timeBonus = Math.floor(timeLeft * 40);
      const comboBonus = Math.floor(combo * 15);
      const gained = base + timeBonus + comboBonus;
      score += gained;
      addParticles(targets[hit].x, targets[hit].y, "#00ffa3", 14);

      if (combo % 3 === 0) level += 1;
      updateHud();
      spawnRound();
    } else {
      // Wrong target
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
      // Also refresh landing page leaderboard if user goes back
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
