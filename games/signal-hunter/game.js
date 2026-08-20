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
  const waveEl = document.getElementById("wave");
  const livesEl = document.getElementById("lives");
  const lbEl = document.getElementById("game-leaderboard");

  const GAME_ID = "signal-hunter";
  const BASE_W = 720;
  const BASE_H = 480;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = BASE_W;
  let H = BASE_H;
  let scale = 1;

  let running = false;
  let phase = "reveal"; // reveal | hunt
  let score = 0;
  let combo = 0;
  let wave = 1;
  let lives = 3;
  let signals = [];
  let timeLeft = 0;
  let maxTime = 1;
  let lastTs = 0;
  let particles = [];
  let floaters = [];
  let scanAngle = 0;
  let shake = 0;
  let flash = 0;
  let audioCtx = null;

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

  function unlockAudio() {
    if (audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
  }

  function beep(freq, dur, type = "sine", gain = 0.07) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur);
  }

  function signalCount() {
    return Math.min(8, 2 + Math.floor((wave - 1) / 2));
  }

  function speedForWave() {
    return (0.85 + wave * 0.16) * scale;
  }

  function revealDuration() {
    return Math.max(0.62, 1.22 - wave * 0.055);
  }

  function huntDuration() {
    return Math.max(3.4, 6.4 - wave * 0.2);
  }

  function hitRadius() {
    return Math.max(18, 28 - wave * 0.55) * scale;
  }

  function createSignal() {
    const r = 9 * scale;
    const speed = speedForWave();
    const ang = rand(0, Math.PI * 2);
    return {
      x: rand(r + 24, W - r - 24),
      y: rand(r + 24, H - r - 24),
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r,
      collected: false,
      hue: 186
    };
  }

  function spawnWave() {
    const n = signalCount();
    const minDist = 72 * scale;
    signals = [];
    let guard = 0;
    while (signals.length < n && guard < 400) {
      guard += 1;
      const s = createSignal();
      const clash = signals.some(o => {
        const dx = o.x - s.x;
        const dy = o.y - s.y;
        return dx * dx + dy * dy < minDist * minDist;
      });
      if (!clash) signals.push(s);
    }
    while (signals.length < n) signals.push(createSignal());

    phase = "reveal";
    maxTime = revealDuration();
    timeLeft = maxTime;
    scanAngle = -Math.PI / 2;
    beep(520, 0.12, "triangle", 0.05);
    if (audioCtx) {
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(780, t + 0.09);
      g.gain.setValueAtTime(0.05, t + 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t + 0.09);
      o.stop(t + 0.25);
    }

  }

  function startGame() {
    unlockAudio();
    score = 0;
    combo = 0;
    wave = 1;
    lives = 3;
    particles = [];
    floaters = [];
    shake = 0;
    flash = 0;
    updateHud();
    spawnWave();
    running = true;
    overlay.classList.add("hidden");
    finalBlock.classList.add("hidden");
    startBtn.classList.remove("hidden");
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame(reason) {
    running = false;
    overlayTitle.textContent = "Signal Lost";
    overlayDesc.innerHTML = `${reason}<br>You scored <strong>${score.toLocaleString()}</strong> · Wave ${wave}.`;
    finalScoreEl.textContent = score.toLocaleString();
    finalBlock.classList.remove("hidden");
    startBtn.classList.add("hidden");
    overlay.classList.remove("hidden");
    beep(140, 0.35, "sawtooth", 0.05);
    renderGameLeaderboard();
  }

  function updateHud() {
    scoreEl.textContent = score.toLocaleString();
    waveEl.textContent = wave;
    livesEl.textContent = lives;
  }

  function addParticles(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x, y,
        vx: rand(-3.2, 3.2) * scale,
        vy: rand(-3.2, 3.2) * scale,
        life: rand(0.28, 0.7),
        color,
        r: rand(1.4, 2.8) * scale
      });
    }
  }

  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0.85, vy: -28 * scale });
  }

  function bounce(s) {
    if (s.x < s.r) { s.x = s.r; s.vx = Math.abs(s.vx); }
    if (s.x > W - s.r) { s.x = W - s.r; s.vx = -Math.abs(s.vx); }
    if (s.y < s.r) { s.y = s.r; s.vy = Math.abs(s.vy); }
    if (s.y > H - s.r) { s.y = H - s.r; s.vy = -Math.abs(s.vy); }
  }

  function updateSignals(dt) {
    const noise = wave >= 6 ? 0.35 * scale : 0;
    for (const s of signals) {
      if (s.collected) continue;
      s.x += s.vx * dt * 60;
      s.y += s.vy * dt * 60;
      if (noise) {
        s.vx += rand(-noise, noise) * dt;
        s.vy += rand(-noise, noise) * dt;
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const target = speedForWave();
        s.vx = (s.vx / sp) * target;
        s.vy = (s.vy / sp) * target;
      }
      bounce(s);
    }
  }

  function update(dt) {
    scanAngle += dt * (phase === "reveal" ? 4.2 : 1.4);
    if (shake > 0) shake = Math.max(0, shake - dt * 3.4);
    if (flash > 0) flash = Math.max(0, flash - dt * 4);

    updateSignals(dt);
    timeLeft -= dt;

    if (phase === "reveal" && timeLeft <= 0) {
      phase = "hunt";
      maxTime = huntDuration();
      timeLeft = maxTime;
      beep(240, 0.2, "square", 0.04);
    } else if (phase === "hunt" && timeLeft <= 0) {
      endGame("The window closed.");
      return;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 4 * scale * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.y += f.vy * dt;
      f.life -= dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(0, 240, 255, 0.045)";
    ctx.lineWidth = 1;
    const step = 40 * scale;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function drawScan() {
    const cx = W / 2;
    const cy = H / 2;
    const len = Math.hypot(W, H);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(scanAngle);
    const grad = ctx.createLinearGradient(0, 0, len * 0.55, 0);
    if (phase === "reveal") {
      grad.addColorStop(0, "rgba(0, 240, 255, 0.22)");
      grad.addColorStop(1, "rgba(0, 240, 255, 0)");
    } else {
      grad.addColorStop(0, "rgba(0, 240, 255, 0.05)");
      grad.addColorStop(1, "rgba(0, 240, 255, 0)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len * 0.55, -0.18, 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSignal(s, visible) {
    if (s.collected) return;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (visible ? 1.15 : 1), 0, Math.PI * 2);
    if (visible) {
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.4);
      grad.addColorStop(0, "hsla(186, 100%, 70%, 0.95)");
      grad.addColorStop(0.45, "hsla(186, 100%, 50%, 0.55)");
      grad.addColorStop(1, "hsla(186, 100%, 40%, 0)");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = "#e8ffff";
      ctx.fill();
      // motion tick
      ctx.strokeStyle = "rgba(0, 240, 255, 0.7)";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.35, s.y - s.vy * 0.35);
      ctx.stroke();
    }
  }

  function draw() {
    const ox = reduceMotion || shake <= 0 ? 0 : (Math.random() - 0.5) * shake * 10 * scale;
    const oy = reduceMotion || shake <= 0 ? 0 : (Math.random() - 0.5) * shake * 10 * scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#070b12";
    ctx.fillRect(0, 0, W, H);
    ctx.translate(ox, oy);

    drawGrid();
    drawScan();

    const visible = phase === "reveal";
    for (const s of signals) drawSignal(s, visible);

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = `bold ${12 * scale}px JetBrains Mono, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 42, 109, ${0.18 * flash})`;
      ctx.fillRect(-ox, -oy, W, H);
    }

    // timer bar
    const barH = 6 * scale;
    const pct = Math.max(0, timeLeft / maxTime);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(-ox, H - barH - oy, W, barH);
    ctx.fillStyle = phase === "reveal" ? "#00f0ff" : (pct > 0.3 ? "#00ffa3" : "#ff2a6d");
    ctx.fillRect(-ox, H - barH - oy, W * pct, barH);

    ctx.fillStyle = phase === "reveal" ? "rgba(0, 240, 255, 0.92)" : "rgba(255, 200, 87, 0.92)";
    ctx.font = `bold ${13 * scale}px JetBrains Mono, monospace`;
    ctx.textAlign = "center";
    const remaining = signals.filter(s => !s.collected).length;
    const label = phase === "reveal"
      ? "RADAR — MEMORIZE PATHS"
      : `HUNT — ${remaining} SIGNAL${remaining === 1 ? "" : "S"} LEFT`;
    ctx.fillText(label, W / 2 - ox, 22 * scale - oy);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleClick(clientX, clientY) {
    if (!running || phase !== "hunt") return;
    const { x, y } = canvasPoint(clientX, clientY);
    const radius = hitRadius();

    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < signals.length; i++) {
      const s = signals[i];
      if (s.collected) continue;
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }

    if (best !== -1 && bestD <= radius) {
      const s = signals[best];
      s.collected = true;
      combo += 1;
      const base = 120 + wave * 35;
      const prox = Math.floor((1 - bestD / radius) * 80);
      const timeBonus = Math.floor(timeLeft * 16);
      const comboBonus = combo * 18;
      const gained = base + prox + timeBonus + comboBonus;
      score += gained;
      addParticles(s.x, s.y, "#00ffa3", 16);
      addFloater(s.x, s.y - 10 * scale, `+${gained}`, "#00ffa3");
      beep(660 + combo * 40, 0.09, "sine", 0.06);
      updateHud();

      if (signals.every(sig => sig.collected)) {
        const clear = 180 + wave * 40;
        score += clear;
        addFloater(W / 2, H / 2, `WAVE CLEAR +${clear}`, "#00f0ff");
        wave += 1;
        combo += 1;
        updateHud();
        beep(880, 0.12, "triangle", 0.06);
        if (audioCtx) {
          const t = audioCtx.currentTime;
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(1100, t + 0.08);
          g.gain.setValueAtTime(0.06, t + 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(t + 0.08);
          o.stop(t + 0.24);
        }
        spawnWave();
      }
      return;
    }

    lives -= 1;
    combo = 0;
    shake = 0.7;
    flash = 1;
    addParticles(x, y, "#ff2a6d", 10);
    addFloater(x, y, "MISS", "#ff2a6d");
    beep(180, 0.16, "square", 0.05);
    updateHud();
    if (lives <= 0) endGame("Probes exhausted.");
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

  submitBtn.addEventListener("click", async () => {
    const name = playerNameInput.value;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    try {
      if (window.Leaderboard) {
        await Leaderboard.submitScore(GAME_ID, name, score);
        await renderGameLeaderboard();
      }
      submitBtn.textContent = "Submitted!";
    } catch (err) {
      console.error(err);
      submitBtn.textContent = "Error – try again";
    }
    setTimeout(() => {
      submitBtn.textContent = "Submit Score";
      submitBtn.disabled = false;
    }, 1800);
  });

  async function renderGameLeaderboard() {
    if (!lbEl || !window.Leaderboard) return;
    lbEl.innerHTML = `<li class="empty">Loading…</li>`;
    try {
      const top = await Leaderboard.getTop10(GAME_ID);
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
    } catch (err) {
      console.error(err);
      lbEl.innerHTML = `<li class="empty">Failed to load</li>`;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  }

  window.addEventListener("resize", () => {
    resize();
    if (!running) draw();
  });

  resize();
  renderGameLeaderboard();
  draw();
})();
