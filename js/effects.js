/* effects.js - canvas animations: particle network, binary rain,
   wireframe sphere, skills radar, contribution grid.
   All loops pause when offscreen or tab hidden; all respect reduced motion. */

(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCED) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const css = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* Runs a rAF loop only while `el` is on screen and tab is visible. */
  function loopWhileVisible(el, draw) {
    let running = false;
    let rafId = 0;
    const tick = (t) => {
      if (!running) return;
      draw(t);
      rafId = requestAnimationFrame(tick);
    };
    const start = () => { if (!running) { running = true; rafId = requestAnimationFrame(tick); } };
    const stop = () => { running = false; cancelAnimationFrame(rafId); };
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0.02 }
    );
    io.observe(el);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) start();
      }
    });
  }

  function sizeCanvas(cv) {
    const r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * DPR));
    cv.height = Math.max(1, Math.round(r.height * DPR));
    return cv.getContext("2d");
  }

  /* ---------- 1. Hero particle network ---------- */
  (() => {
    const cv = document.getElementById("netCanvas");
    if (!cv) return;
    let ctx = sizeCanvas(cv);
    const mouse = { x: -9999, y: -9999 };
    let pts = [];

    function build() {
      ctx = sizeCanvas(cv);
      const n = Math.min(90, Math.round((cv.width * cv.height) / (26000 * DPR * DPR)));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        vx: (Math.random() - 0.5) * 0.22 * DPR,
        vy: (Math.random() - 0.5) * 0.22 * DPR,
        r: (Math.random() * 1.4 + 0.6) * DPR,
      }));
    }
    build();
    addEventListener("resize", build);
    cv.parentElement.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * DPR;
      mouse.y = (e.clientY - r.top) * DPR;
    });
    cv.parentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

    const LINK = 130 * DPR;
    loopWhileVisible(cv, () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const primary = css("--primary") || "#4f9dff";
      const accent = css("--accent") || "#00f5ff";

      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > cv.width) p.vx *= -1;
        if (p.y < 0 || p.y > cv.height) p.vy *= -1;
        // gentle attraction to cursor
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 32000 * DPR * DPR && d2 > 400) {
          p.x += dx * 0.0012; p.y += dy * 0.0012;
        }
      }
      ctx.lineWidth = 0.6 * DPR;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.globalAlpha = (1 - d / LINK) * 0.35;
            ctx.strokeStyle = primary;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      for (const p of pts) {
        ctx.fillStyle = Math.random() < 0.02 ? accent : primary;
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  })();

  /* ---------- 2. Binary rain (very subtle) ---------- */
  (() => {
    const cv = document.getElementById("rainCanvas");
    if (!cv) return;
    let ctx = sizeCanvas(cv);
    const FS = 13 * DPR;
    let cols = [];
    function build() {
      ctx = sizeCanvas(cv);
      cols = Array.from({ length: Math.floor(cv.width / (FS * 1.6)) }, () => ({
        y: Math.random() * cv.height,
        sp: (Math.random() * 0.6 + 0.35) * DPR,
      }));
    }
    build();
    addEventListener("resize", build);

    let last = 0;
    loopWhileVisible(cv, (t) => {
      if (t - last < 66) return; // ~15fps is plenty for background text
      last = t;
      ctx.fillStyle = "rgba(5,8,22,0.22)";
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.font = `${FS}px JetBrains Mono, monospace`;
      cols.forEach((c, i) => {
        ctx.fillStyle = Math.random() < 0.04 ? "rgba(0,245,255,0.5)" : "rgba(79,157,255,0.16)";
        ctx.fillText(Math.random() < 0.5 ? "0" : "1", i * FS * 1.6, c.y);
        c.y += c.sp * 14;
        if (c.y > cv.height + 20) c.y = -20;
      });
    });
  })();

  /* ---------- 3. Wireframe sphere ---------- */
  (() => {
    const cv = document.getElementById("sphereCanvas");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const R = W * 0.38;
    const pts = [];
    const LAT = 8, LON = 12;
    for (let i = 1; i < LAT; i++) {
      const phi = (Math.PI * i) / LAT;
      for (let j = 0; j < LON; j++) {
        const th = (2 * Math.PI * j) / LON;
        pts.push([Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)]);
      }
    }
    loopWhileVisible(cv, (t) => {
      const a = t * 0.00028;
      const ca = Math.cos(a), sa = Math.sin(a);
      const tilt = 0.45, ct = Math.cos(tilt), st = Math.sin(tilt);
      ctx.clearRect(0, 0, W, H);
      const primary = css("--primary") || "#4f9dff";
      const proj = pts.map(([x, y, z]) => {
        const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
        const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
        return [W / 2 + x1 * R, H / 2 + y2 * R, z2];
      });
      ctx.lineWidth = 0.7;
      for (let i = 0; i < proj.length; i++) {
        const rowEnd = i % LON === LON - 1;
        const nbrs = [rowEnd ? i - LON + 1 : i + 1, i + LON];
        for (const n of nbrs) {
          if (n >= proj.length) continue;
          const depth = (proj[i][2] + proj[n][2]) / 2;
          ctx.globalAlpha = 0.12 + (depth + 1) * 0.2;
          ctx.strokeStyle = primary;
          ctx.beginPath();
          ctx.moveTo(proj[i][0], proj[i][1]);
          ctx.lineTo(proj[n][0], proj[n][1]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    });
  })();

  /* ---------- 4. Skills radar ---------- */
  (() => {
    const cv = document.getElementById("radarCanvas");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const CX = W / 2, CY = H / 2 + 8, R = Math.min(W, H) * 0.36;
    const axes = [
      ["Backend", 0.95], ["Cloud", 0.9], ["DevOps", 0.82],
      ["Databases", 0.85], ["AI", 0.78], ["Frontend", 0.66],
    ];
    let prog = 0;
    loopWhileVisible(cv, () => {
      prog = Math.min(1, prog + 0.02);
      const e = 1 - Math.pow(1 - prog, 3); // ease-out cubic
      ctx.clearRect(0, 0, W, H);
      const primary = css("--primary") || "#4f9dff";
      const accent = css("--accent") || "#00f5ff";
      const N = axes.length;
      const ang = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;

      ctx.strokeStyle = "rgba(148,170,255,0.15)";
      ctx.fillStyle = "rgba(148,170,255,0.65)";
      ctx.font = `10.5px JetBrains Mono, monospace`;
      ctx.textAlign = "center";
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const r = (R * ring) / 4;
          const x = CX + Math.cos(ang(i)) * r, y = CY + Math.sin(ang(i)) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < N; i++) {
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(CX + Math.cos(ang(i)) * R, CY + Math.sin(ang(i)) * R);
        ctx.stroke();
        const lx = CX + Math.cos(ang(i)) * (R + 22);
        const ly = CY + Math.sin(ang(i)) * (R + 16) + 4;
        ctx.fillText(axes[i][0], lx, ly);
      }
      // data polygon
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const v = axes[i % N][1] * e;
        const x = CX + Math.cos(ang(i)) * R * v, y = CY + Math.sin(ang(i)) * R * v;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, CY - R, 0, CY + R);
      g.addColorStop(0, accent + "44");
      g.addColorStop(1, primary + "22");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      for (let i = 0; i < N; i++) {
        const v = axes[i][1] * e;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(CX + Math.cos(ang(i)) * R * v, CY + Math.sin(ang(i)) * R * v, 3, 0, 7);
        ctx.fill();
      }
      ctx.lineWidth = 1;
    });
  })();

  /* ---------- 5. Contribution grid (stylized) ---------- */
  (() => {
    const cv = document.getElementById("contribCanvas");
    if (!cv) return;
    const ctx = sizeCanvas(cv);
    const COLS = 52, ROWS = 7;
    const GAP = 2.5 * DPR;
    const cell = Math.min((cv.width - GAP * COLS) / COLS, (cv.height - GAP * ROWS) / ROWS);
    // deterministic pseudo-random "activity" with weekly rhythm
    const seed = (i) => {
      const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const grid = [];
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        const weekday = r > 0 && r < 6 ? 1 : 0.45;
        const wave = 0.5 + 0.5 * Math.sin(c * 0.35);
        grid.push(Math.pow(seed(c * 7 + r) * weekday * (0.4 + wave), 1.4));
      }
    let t0 = null;
    loopWhileVisible(cv, (t) => {
      if (t0 === null) t0 = t;
      const elapsed = (t - t0) / 1000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const primary = css("--primary") || "#4f9dff";
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const v = grid[c * ROWS + r];
          const reveal = Math.min(1, Math.max(0, elapsed * 32 - c) );
          if (reveal <= 0) continue;
          const shimmer = 0.85 + 0.15 * Math.sin(elapsed * 1.5 + c * 0.4 + r);
          const a = (0.06 + v * 0.85) * reveal * shimmer;
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = v > 0.55 ? (css("--accent") || "#00f5ff") : primary;
          const x = c * (cell + GAP), y = r * (cell + GAP);
          ctx.beginPath();
          ctx.roundRect(x, y, cell, cell, 2 * DPR);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    });
  })();
})();
