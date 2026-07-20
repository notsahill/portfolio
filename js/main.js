/* main.js - boot sequence, typing, scroll systems, command palette,
   terminal, architecture diagrams, tilt, cursor, contact form. */

(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ================= BOOT SEQUENCE ================= */
  (() => {
    const boot = $("#boot");
    if (!boot) return;
    if (REDUCED || sessionStorage.getItem("booted")) {
      boot.remove();
      document.body.classList.add("loaded");
      return;
    }
    const log = $("#bootLog");
    const bar = $("#bootBarFill");
    const lines = [
      ["sys", "SAHIL-OS v5.2.0 - boot sequence initiated"],
      ["", "mounting /dev/skills ............ [  <ok>OK</ok>  ]"],
      ["", "loading java.runtime ............ [  <ok>OK</ok>  ]"],
      ["", "starting spring.context ......... [  <ok>OK</ok>  ]"],
      ["", "provisioning aws.fargate ........ [  <ok>OK</ok>  ]"],
      ["", "warming llm.pipeline ............ [  <ok>OK</ok>  ]"],
      ["sys", "all systems nominal - rendering portfolio"],
    ];
    let i = 0;
    const total = lines.length;
    const next = () => {
      if (i >= total) {
        bar.style.width = "100%";
        setTimeout(() => {
          boot.classList.add("done");
          document.body.classList.add("loaded");
          sessionStorage.setItem("booted", "1");
          setTimeout(() => boot.remove(), 700);
        }, 260);
        return;
      }
      const [cls, txt] = lines[i];
      const html = txt.replace(/<ok>/g, '<span class="ok">').replace(/<\/ok>/g, "</span>");
      log.innerHTML += `<span class="${cls}">${html}</span>\n`;
      bar.style.width = `${((i + 1) / total) * 92}%`;
      i++;
      setTimeout(next, 110 + Math.random() * 130);
    };
    setTimeout(next, 200);
    // Safety: never trap the user behind the boot screen
    setTimeout(() => { if (document.body.contains(boot)) { boot.classList.add("done"); document.body.classList.add("loaded"); } }, 4000);
  })();

  /* ================= CUSTOM CURSOR ================= */
  (() => {
    if (REDUCED || matchMedia("(hover: none)").matches) return;
    const dot = $("#cursorDot"), glow = $("#cursorGlow");
    if (!dot) return;
    let x = -100, y = -100, gx = -100, gy = -100, shown = false;
    addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; document.body.classList.add("cursor-on"); }
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
      const t = e.target.closest("a, button, [data-tilt], input, textarea, .dg-node");
      document.body.classList.toggle("cursor-hover", !!t);
    }, { passive: true });
    (function follow() {
      gx += (x - gx) * 0.16; gy += (y - gy) * 0.16;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%,-50%)`;
      requestAnimationFrame(follow);
    })();
  })();

  /* ================= NAV / SCROLL ================= */
  const nav = $("#nav");
  const progress = $("#scrollProgress");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const st = scrollY;
      nav.classList.toggle("scrolled", st > 24);
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = `${max > 0 ? (st / max) * 100 : 0}%`;
      // timeline rail fill
      const tl = $("#timeline");
      if (tl) {
        const r = tl.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
        $("#tlFill").style.height = `${frac * 100}%`;
      }
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // mobile menu
  $("#menuBtn")?.addEventListener("click", () => document.body.classList.toggle("menu-open"));
  $$(".mobile-menu a").forEach((a) => a.addEventListener("click", () => document.body.classList.remove("menu-open")));

  // active nav link
  const sections = $$("main section[id]");
  const navLinks = $$(".nav-links a");
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach((s) => secObs.observe(s));

  /* ================= REVEAL ON SCROLL ================= */
  if (!REDUCED) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$(".io, .reveal").forEach((el) => io.observe(el));
  } else {
    $$(".io, .reveal").forEach((el) => el.classList.add("in"));
  }

  /* ================= COUNTERS ================= */
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      counterObs.unobserve(e.target);
      const el = e.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      if (!target) return;
      if (REDUCED) { el.textContent = target + suffix; return; }
      const t0 = performance.now(), dur = 1400;
      (function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.6 });
  $$(".stat-num[data-count]").forEach((el) => counterObs.observe(el));

  /* ================= TYPING EFFECTS ================= */
  function typeCycle(el, words, { typeMs = 65, holdMs = 2100, eraseMs = 32 } = {}) {
    if (!el) return;
    if (REDUCED) { el.textContent = words[0]; return; }
    let wi = 0, ci = 0, erasing = false;
    (function tick() {
      const w = words[wi];
      if (!erasing) {
        el.textContent = w.slice(0, ++ci);
        if (ci === w.length) { erasing = true; setTimeout(tick, holdMs); return; }
        setTimeout(tick, typeMs + Math.random() * 40);
      } else {
        el.textContent = w.slice(0, --ci);
        if (ci === 0) { erasing = false; wi = (wi + 1) % words.length; }
        setTimeout(tick, eraseMs);
      }
    })();
  }
  typeCycle($("#typed"), ["Backend Engineer", "Cloud Architect", "AI Builder", "System Designer"]);
  typeCycle($("#footerTyped"), ["echo \"building things that scale\"", "git push origin main --force-with-lease", "kubectl get pods -A | grep Running", "make coffee && make deploy"], { holdMs: 3200 });

  /* ================= HERO PARALLAX ================= */
  if (!REDUCED && matchMedia("(hover: hover)").matches) {
    const hero = $("#hero");
    const orbs = $$(".orb");
    const content = $(".hero-content");
    hero.addEventListener("pointermove", (e) => {
      const cx = (e.clientX / innerWidth - 0.5), cy = (e.clientY / innerHeight - 0.5);
      orbs.forEach((o, i) => {
        const f = (i + 1) * 14;
        o.style.translate = `${cx * f}px ${cy * f}px`;
      });
      content.style.transform = `translate(${cx * -10}px, ${cy * -8}px)`;
    }, { passive: true });
  }

  /* ================= MAGNETIC BUTTONS ================= */
  if (!REDUCED && matchMedia("(hover: hover)").matches) {
    $$("[data-magnet]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${dx * 0.12}px, ${dy * 0.18}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ================= PROJECT CARD TILT + GLOW ================= */
  if (!REDUCED && matchMedia("(hover: hover)").matches) {
    $$("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 7}deg) rotateX(${(0.5 - py) * 6}deg) translateY(-3px)`;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  /* ================= TIMELINE EXPAND ================= */
  $$("[data-expand]").forEach((item) => {
    const head = $(".tl-head", item);
    head.addEventListener("click", () => {
      const open = item.classList.toggle("open");
      head.setAttribute("aria-expanded", open);
    });
  });
  // open first entry by default
  $(".tl-item")?.classList.add("open");
  $(".tl-item .tl-head")?.setAttribute("aria-expanded", "true");

  /* ================= ACCENT THEME SWITCHER ================= */
  const THEMES = ["cyan", "violet", "ember", "matrix"];
  let themeIdx = Math.max(0, THEMES.indexOf(localStorage.getItem("folio-theme") || "cyan"));
  const applyTheme = () => {
    document.documentElement.dataset.theme = THEMES[themeIdx];
    localStorage.setItem("folio-theme", THEMES[themeIdx]);
  };
  applyTheme();
  const cycleTheme = () => { themeIdx = (themeIdx + 1) % THEMES.length; applyTheme(); };
  $("#accentBtn")?.addEventListener("click", cycleTheme);

  /* ================= AMBIENT SOUND (off by default) ================= */
  let audioCtx = null, audioNodes = null;
  function toggleSound() {
    const btn = $("#soundBtn");
    if (audioNodes) {
      audioNodes.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
      setTimeout(() => { audioNodes.oscA.stop(); audioNodes.oscB.stop(); audioNodes = null; }, 500);
      btn.classList.remove("on");
      return;
    }
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    const filt = audioCtx.createBiquadFilter();
    filt.type = "lowpass"; filt.frequency.value = 220;
    const oscA = audioCtx.createOscillator();
    oscA.type = "sine"; oscA.frequency.value = 55;
    const oscB = audioCtx.createOscillator();
    oscB.type = "sine"; oscB.frequency.value = 55.7; // slow beat
    oscA.connect(filt); oscB.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
    oscA.start(); oscB.start();
    gain.gain.linearRampToValueAtTime(0.045, audioCtx.currentTime + 1.2);
    audioNodes = { oscA, oscB, gain };
    btn.classList.add("on");
  }
  $("#soundBtn")?.addEventListener("click", toggleSound);

  /* ================= COMMAND PALETTE ================= */
  const palette = $("#palette");
  const pInput = $("#paletteInput");
  const pList = $("#paletteList");
  const COMMANDS = [
    { ico: "↟", label: "Go to top", k: "g h", run: () => scrollTo({ top: 0, behavior: "smooth" }) },
    { ico: "◍", label: "About", k: "g a", run: () => go("#about") },
    { ico: "⌥", label: "Skills", k: "g s", run: () => go("#skills") },
    { ico: "▣", label: "Projects", k: "g p", run: () => go("#projects") },
    { ico: "⧖", label: "Experience", k: "g e", run: () => go("#experience") },
    { ico: "☷", label: "Systems / Architecture", k: "g y", run: () => go("#systems") },
    { ico: "⎇", label: "GitHub", k: "g g", run: () => go("#github") },
    { ico: "✉", label: "Contact", k: "g c", run: () => go("#contact") },
    { ico: "◐", label: "Cycle accent theme", k: "t", run: cycleTheme },
    { ico: "♫", label: "Toggle ambient sound", k: "m", run: toggleSound },
    { ico: "␥", label: "Open terminal", k: "", run: () => { go("#terminal"); setTimeout(() => $("#termScreen").focus(), 600); } },
    { ico: "↗", label: "Open GitHub profile", k: "", run: () => open("https://github.com/notsahill", "_blank") },
    { ico: "↗", label: "Open LinkedIn", k: "", run: () => open("https://www.linkedin.com/in/md-sahil22/", "_blank") },
    { ico: "✉", label: "Email me", k: "", run: () => (location.href = "mailto:contactsahil.cs@gmail.com") },
  ];
  const go = (sel) => $(sel)?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
  let pSel = 0, pFiltered = COMMANDS;

  function renderPalette() {
    pList.innerHTML = pFiltered.map((c, i) =>
      `<li class="${i === pSel ? "sel" : ""}" data-i="${i}">
        <span class="pi-ico">${c.ico}</span><span>${c.label}</span>
        ${c.k ? `<span class="pi-k">${c.k}</span>` : ""}
      </li>`).join("") || `<li class="empty">no matches</li>`;
  }
  function openPalette() {
    palette.hidden = false;
    requestAnimationFrame(() => palette.classList.add("open"));
    pInput.value = ""; pFiltered = COMMANDS; pSel = 0;
    renderPalette();
    pInput.focus();
  }
  function closePalette() {
    palette.classList.remove("open");
    setTimeout(() => { palette.hidden = true; }, 200);
  }
  $("#paletteBtn")?.addEventListener("click", openPalette);
  $$("[data-open-palette]").forEach((b) => b.addEventListener("click", openPalette));
  palette.addEventListener("click", (e) => { if (e.target === palette) closePalette(); });
  pInput.addEventListener("input", () => {
    const q = pInput.value.toLowerCase();
    pFiltered = COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
    pSel = 0; renderPalette();
  });
  pList.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-i]");
    if (!li) return;
    closePalette();
    pFiltered[+li.dataset.i].run();
  });
  pInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); pSel = (pSel + 1) % pFiltered.length; renderPalette(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); pSel = (pSel - 1 + pFiltered.length) % pFiltered.length; renderPalette(); }
    else if (e.key === "Enter" && pFiltered[pSel]) { closePalette(); pFiltered[pSel].run(); }
  });

  /* ================= GLOBAL KEYBOARD SHORTCUTS ================= */
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette.hidden ? openPalette() : closePalette();
      return;
    }
    if (e.key === "Escape") {
      if (!palette.hidden) closePalette();
      document.body.classList.remove("menu-open");
      return;
    }
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.id === "termScreen") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "t") cycleTheme();
    else if (e.key === "m") toggleSound();
  });

  /* ================= ARCHITECTURE DIAGRAMS ================= */
  const NODE_INFO = {
    gw: ["API Gateway", "Single entry point. Auth, rate limiting, routing to internal services over private networking."],
    auth: ["Auth Service", "OTP-based authentication. Issues short-lived JWTs; refresh handled server-side."],
    reimb: ["Reimbursement Service", "State-machine driven transaction workflows. Every transition audited and idempotent."],
    itr: ["ITR Filing Service", "Orchestrates the tax-filing journey across dependent services with compensating actions."],
    pg: ["PostgreSQL", "Source of truth. One schema per service; no shared tables, no shortcuts."],
    redis: ["Redis", "Hot cache + distributed locks. TTLs tuned per access pattern."],
    sqs: ["SQS Queue", "Async backbone. At-least-once delivery, DLQ after 3 failed receives."],
    alb: ["Application Load Balancer", "TLS termination, health checks, weighted target groups for blue-green."],
    ecs: ["ECS Fargate", "Serverless containers. Task definitions synthesized by CDK - zero hand-written JSON."],
    lambda: ["Lambda", "Event-driven glue: S3 triggers, scheduled jobs, lightweight transforms."],
    rds: ["RDS", "Managed Postgres, multi-AZ. Right-sized after workload analysis (-30% cost)."],
    s3: ["S3", "Documents, payslips, artifacts. Lifecycle rules move cold data to IA."],
    cf: ["CloudFront", "Edge CDN for static assets and signed document URLs."],
    up: ["Upload", "User uploads payslip PDF/image to S3 via presigned URL."],
    ocr: ["Textract OCR", "Extracts raw text + table geometry from documents."],
    llm: ["LLM Extraction", "Prompted extraction into strict JSON schema. Validation rejects hallucinated fields."],
    emb: ["Embeddings", "Vector representations for semantic dedupe and retrieval."],
    vdb: ["Vector DB", "Similarity search over historical documents for few-shot context."],
    out: ["Structured Output", "Validated JSON lands in Postgres. 85% field accuracy, 4x parse success."],
    prod: ["Producer", "Domain events emitted on every state transition. Schema-versioned payloads."],
    bus: ["Event Bus", "Fan-out to consumers. Ordering per aggregate ID, retries with backoff."],
    con1: ["Notification Consumer", "Sends user notifications. Idempotency keys prevent duplicates."],
    con2: ["Analytics Consumer", "Streams events to the warehouse for product analytics."],
    dlq: ["Dead Letter Queue", "Poison messages parked here - alerting, inspection, replay tooling."],
    saga: ["Saga Coordinator", "Compensating transactions roll back multi-service workflows on partial failure."],
    k8s: ["K8s Pods", "Horizontal scaling - pods come and go, the system doesn't blink."],
  };

  const box = (id, x, y, w, label, extra = "") =>
    `<g class="dg-node ${extra}" data-node="${id}" transform="translate(${x},${y})">
       <rect width="${w}" height="34" rx="8"></rect>
       <text x="${w / 2}" y="21">${label}</text>
     </g>`;
  const link = (d) => `<path class="dg-link" d="${d}"></path>`;
  const packet = (d, dur, cls = "", delay = 0) =>
    `<circle class="dg-packet ${cls}" r="3.2">
       <animateMotion dur="${dur}s" begin="${delay}s" repeatCount="indefinite" path="${d}"/>
     </circle>`;

  const DIAGRAMS = {
    micro: `<svg viewBox="0 0 640 330" xmlns="http://www.w3.org/2000/svg" aria-label="Microservice architecture diagram">
      ${link("M90 60 H 240")}${link("M90 60 C 150 60 180 150 250 150")}${link("M90 60 C 150 60 170 245 250 245")}
      ${link("M330 150 H 420 ")}${link("M340 60 H 470")}${link("M330 245 C 380 245 390 180 425 168")}
      ${link("M480 168 h 40")}${link("M520 80 v 70")}
      ${box("gw", 20, 43, 70, "gateway")}
      ${box("auth", 240, 43, 100, "auth-svc")}
      ${box("reimb", 250, 133, 80, "reimb-svc")}
      ${box("itr", 250, 228, 80, "itr-svc")}
      ${box("pg", 425, 151, 55, "pg")}
      ${box("redis", 470, 43, 70, "redis")}
      ${box("sqs", 520, 151, 60, "sqs")}
      <text class="dg-label" x="165" y="50">REST / JWT</text>
      <text class="dg-label" x="380" y="140">JDBC</text>
      ${packet("M90 60 H 240", 2.2)}
      ${packet("M90 60 C 150 60 180 150 250 150", 2.8, "p2", 0.5)}
      ${packet("M90 60 C 150 60 170 245 250 245", 3.2, "", 1.1)}
      ${packet("M330 150 H 425", 1.8, "p3", 0.3)}
      ${packet("M330 245 C 380 245 390 180 425 168", 2.4, "p2", 1.4)}
      <g class="dg-node dg-pod" data-node="k8s" transform="translate(60,240)">
        <circle cx="0" cy="0" r="9"></circle>
        <circle cx="26" cy="10" r="9" style="animation-delay:1.6s"></circle>
        <circle cx="8" cy="28" r="9" style="animation-delay:3.1s"></circle>
        <text x="18" y="55">pods</text>
      </g>
    </svg>`,

    aws: `<svg viewBox="0 0 640 330" xmlns="http://www.w3.org/2000/svg" aria-label="AWS infrastructure diagram">
      ${link("M100 165 H 200")}${link("M290 165 H 360")}${link("M450 165 H 520")}
      ${link("M405 148 V 90 H 470")}${link("M405 182 V 250 H 470")}
      ${link("M100 148 V 70 H 190")}
      ${box("cf", 20, 148, 80, "cloudfront")}
      ${box("alb", 200, 148, 90, "alb")}
      ${box("ecs", 360, 148, 90, "ecs·fargate")}
      ${box("rds", 520, 148, 70, "rds")}
      ${box("lambda", 470, 73, 90, "lambda")}
      ${box("s3", 470, 233, 70, "s3")}
      ${box("k8s", 190, 53, 100, "waf / shield")}
      <text class="dg-label" x="150" y="158">https</text>
      <text class="dg-label" x="325" y="158">target-group</text>
      ${packet("M100 165 H 200", 2)}
      ${packet("M290 165 H 360", 1.6, "p2", 0.4)}
      ${packet("M450 165 H 520", 1.8, "p3", 0.8)}
      ${packet("M405 182 V 250 H 470", 2.6, "", 1.2)}
      ${packet("M405 148 V 90 H 470", 2.4, "p2", 0.2)}
    </svg>`,

    ai: `<svg viewBox="0 0 640 330" xmlns="http://www.w3.org/2000/svg" aria-label="AI document pipeline diagram">
      ${link("M120 100 H 190")}${link("M280 100 H 350")}${link("M440 100 H 500")}
      ${link("M235 117 V 190 H 300")}${link("M390 190 H 460 ")}${link("M395 117 C 395 160 420 175 460 183")}
      ${link("M545 117 V 190 H 520")}
      ${box("up", 30, 83, 90, "upload · s3")}
      ${box("ocr", 190, 83, 90, "textract")}
      ${box("llm", 350, 83, 90, "llm extract")}
      ${box("out", 500, 83, 100, "json ✓ 85%")}
      ${box("emb", 300, 173, 90, "embeddings")}
      ${box("vdb", 460, 173, 60, "pgvector")}
      <!-- tiny neural net -->
      <g class="dg-node" data-node="llm" transform="translate(60,210)">
        ${[0, 1, 2].map((i) => `<circle cx="0" cy="${i * 26}" r="6"></circle>`).join("")}
        ${[0, 1, 2, 3].map((i) => `<circle cx="52" cy="${i * 18 - 5}" r="6"></circle>`).join("")}
        ${[0, 1].map((i) => `<circle cx="104" cy="${12 + i * 26}" r="6"></circle>`).join("")}
        ${[0, 1, 2].map((i) => [0, 1, 2, 3].map((j) => `<line x1="6" y1="${i * 26}" x2="46" y2="${j * 18 - 5}" stroke="rgba(139,92,246,.25)" stroke-width="0.8"/>`).join("")).join("")}
        ${[0, 1, 2, 3].map((i) => [0, 1].map((j) => `<line x1="58" y1="${i * 18 - 5}" x2="98" y2="${12 + j * 26}" stroke="rgba(0,245,255,.2)" stroke-width="0.8"/>`).join("")).join("")}
        <text x="52" y="80">inference</text>
      </g>
      ${packet("M120 100 H 190", 1.8)}
      ${packet("M280 100 H 350", 2, "p2", 0.5)}
      ${packet("M440 100 H 500", 1.7, "p3", 1)}
      ${packet("M235 117 V 190 H 300", 2.6, "p2", 0.8)}
      ${packet("M390 190 H 460", 1.9, "", 1.5)}
    </svg>`,

    event: `<svg viewBox="0 0 640 330" xmlns="http://www.w3.org/2000/svg" aria-label="Event-driven architecture diagram">
      ${link("M140 90 C 200 90 210 150 265 158")}${link("M355 158 H 420 ")}${link("M355 170 C 390 185 390 240 420 247")}
      ${link("M310 176 V 240 H 240")}${link("M140 260 C 180 260 200 200 262 172")}
      ${box("prod", 40, 73, 100, "producer A")}
      ${box("prod", 40, 243, 100, "producer B")}
      ${box("bus", 265, 141, 90, "event bus")}
      ${box("con1", 420, 141, 100, "notify-consumer")}
      ${box("con2", 420, 230, 100, "analytics")}
      ${box("dlq", 150, 223, 90, "DLQ ☠")}
      ${box("saga", 265, 40, 110, "saga coordinator")}
      ${link("M320 141 V 74")}
      <text class="dg-label" x="200" y="120">emit</text>
      <text class="dg-label" x="390" y="150">fan-out</text>
      ${packet("M140 90 C 200 90 210 150 265 158", 2.2)}
      ${packet("M140 260 C 180 260 200 200 262 172", 2.6, "p2", 0.9)}
      ${packet("M355 158 H 420", 1.6, "p3", 0.4)}
      ${packet("M355 170 C 390 185 390 240 420 247", 2.1, "", 1.2)}
      ${packet("M310 176 V 240 H 240", 2.8, "p2", 1.8)}
    </svg>`,
  };

  const diagramHost = $("#diagramHost");
  const niTitle = $("#niTitle"), niDesc = $("#niDesc"), niHint = $(".ni-hint");
  function mountDiagram(key) {
    diagramHost.innerHTML = DIAGRAMS[key];
    niTitle.textContent = ""; niDesc.textContent = "";
    niHint.textContent = "◉ select a component";
    $$(".dg-node", diagramHost).forEach((n) => {
      n.addEventListener("click", () => {
        $$(".dg-node", diagramHost).forEach((m) => m.classList.remove("sel"));
        n.classList.add("sel");
        const info = NODE_INFO[n.dataset.node];
        if (info) {
          niHint.textContent = "◉ component";
          niTitle.textContent = info[0];
          niDesc.textContent = info[1];
        }
      });
    });
  }
  mountDiagram("micro");
  $$(".sys-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".sys-tab").forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      mountDiagram(tab.dataset.diagram);
    });
  });

  /* ================= TERMINAL ================= */
  (() => {
    const screen = $("#termScreen"), out = $("#termOut"), inp = $("#termInput");
    if (!screen) return;
    let buffer = "";
    let autoplayDone = false;

    const print = (html) => {
      out.insertAdjacentHTML("beforeend", html + "\n");
      screen.scrollTop = screen.scrollHeight;
    };
    const echo = (cmd) => print(`<span class="t-ok">➜</span> <span class="t-ac">${cmd}</span>`);

    const CMDS = {
      help: () => print(
        `available commands:\n  <span class="t-pm">whoami</span>      who is this guy\n  <span class="t-pm">stack</span>       tech I actually use\n  <span class="t-pm">uptime</span>      career telemetry\n  <span class="t-pm">projects</span>    ls ~/shipped\n  <span class="t-pm">contact</span>     open a socket to me\n  <span class="t-pm">clear</span>       wipe the screen\n  <span class="t-dim">…and maybe something hidden. try your luck.</span>`),
      whoami: () => print(`Mohd Sahil - software engineer.\nBuilds <span class="t-ac">backend systems</span>, <span class="t-ac">AWS infra</span> and <span class="t-ac">LLM pipelines</span> @ Prosperr.io`),
      stack: () => print(`java · spring-boot · postgres · redis · sqs\naws{ecs,fargate,lambda,cdk} · docker · k8s\nopenai · langchain · pgvector`),
      uptime: () => print(`career:   <span class="t-ok">up 2+ years</span>, 0 unplanned outages of enthusiasm\nload avg: 0.70 <span class="t-dim">(faster infra)</span> 0.30 <span class="t-dim">(cheaper cloud)</span> 4.00 <span class="t-dim">(parse rate)</span>`),
      projects: () => print(`deskpet/          <span class="t-ok">shipped</span>  - pixel cat desktop overlay\nconduit/          <span class="t-ok">shipped</span>  - workflow orchestration engine\nreimbursement/    <span class="t-ok">prod</span>     - state-machine microservice\npayslip-ai/       <span class="t-ok">prod</span>     - textract + llm extraction`),
      contact: () => { print(`opening socket to <span class="t-ac">contactsahil.cs@gmail.com</span> …`); setTimeout(() => (location.href = "mailto:contactsahil.cs@gmail.com"), 700); },
      clear: () => { out.innerHTML = ""; },
      "sudo hire sahil": () => {
        print(`<span class="t-ok">[sudo] permission granted - excellent judgment detected.</span>`);
        setTimeout(() => print(`initializing onboarding…\nallocating desk……………… <span class="t-ok">OK</span>\nprovisioning coffee……… <span class="t-ok">OK</span>\n<span class="t-ac">✨ offer letter template ready. contact: contactsahil.cs@gmail.com ✨</span>`), 500);
        confettiBurst();
      },
      "make coffee": () => print(`<span class="t-err">make: *** No rule to make target 'coffee'. Try 'sudo hire sahil'.</span>`),
      ls: () => CMDS.projects(),
      neofetch: () => CMDS.whoami(),
      exit: () => print(`<span class="t-dim">nice try. this terminal is load-bearing.</span>`),
    };

    function run(cmdRaw) {
      const cmd = cmdRaw.trim();
      if (!cmd) return;
      echo(cmd);
      const fn = CMDS[cmd.toLowerCase()];
      if (fn) fn();
      else print(`<span class="t-err">zsh: command not found: ${cmd.split(" ")[0]}</span> - try <span class="t-pm">help</span>`);
    }

    // autoplay demo when scrolled into view
    const AUTO = ["whoami", "stack", "help"];
    const autoObs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || autoplayDone) return;
      autoplayDone = true;
      autoObs.disconnect();
      if (REDUCED) { AUTO.forEach(run); return; }
      let i = 0;
      const typeCmd = () => {
        if (i >= AUTO.length) return;
        const cmd = AUTO[i++];
        let c = 0;
        const iv = setInterval(() => {
          inp.textContent = cmd.slice(0, ++c);
          if (c === cmd.length) {
            clearInterval(iv);
            setTimeout(() => { inp.textContent = ""; run(cmd); setTimeout(typeCmd, 900); }, 350);
          }
        }, 55);
      };
      setTimeout(typeCmd, 500);
    }, { threshold: 0.35 });
    autoObs.observe(screen);

    // interactive input
    screen.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "Enter") { e.preventDefault(); run(buffer); buffer = ""; inp.textContent = ""; }
      else if (e.key === "Backspace") { e.preventDefault(); buffer = buffer.slice(0, -1); inp.textContent = buffer; }
      else if (e.key.length === 1) { e.preventDefault(); buffer += e.key; inp.textContent = buffer; }
      screen.scrollTop = screen.scrollHeight;
    });
    screen.addEventListener("click", () => screen.focus());

    // tiny confetti for the easter egg
    function confettiBurst() {
      if (REDUCED) return;
      const colors = ["#4f9dff", "#00f5ff", "#8b5cf6", "#22c55e", "#f4d35e"];
      const rect = screen.getBoundingClientRect();
      for (let i = 0; i < 40; i++) {
        const p = document.createElement("span");
        const size = 4 + Math.random() * 5;
        p.style.cssText = `position:fixed;z-index:9000;pointer-events:none;width:${size}px;height:${size}px;border-radius:2px;
          background:${colors[i % colors.length]};left:${rect.left + rect.width / 2}px;top:${rect.top + 40}px;`;
        document.body.appendChild(p);
        const ang = Math.random() * Math.PI * 2, v = 120 + Math.random() * 240;
        const dx = Math.cos(ang) * v, dy = Math.sin(ang) * v - 160;
        p.animate(
          [{ transform: "translate(0,0) rotate(0)", opacity: 1 },
           { transform: `translate(${dx}px, ${dy + 320}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
          { duration: 1100 + Math.random() * 700, easing: "cubic-bezier(.16,1,.3,1)" }
        ).onfinish = () => p.remove();
      }
    }
  })();

  /* ================= GITHUB STATS ================= */
  (async () => {
    try {
      const res = await fetch("https://api.github.com/users/notsahill");
      if (!res.ok) throw 0;
      const d = await res.json();
      const set = (id, v) => {
        const el = $(id);
        if (!el) return;
        el.dataset.count = v;
        el.textContent = "0";
        counterObs.observe(el);
      };
      set("#ghRepos", d.public_repos ?? 0);
      set("#ghFollowers", d.followers ?? 0);
    } catch {
      $("#ghRepos") && ($("#ghRepos").textContent = "12+");
      $("#ghFollowers") && ($("#ghFollowers").textContent = "-");
    }
  })();

  /* ================= CONTACT FORM ================= */
  (() => {
    const form = $("#contactForm");
    if (!form) return;
    const fields = {
      name: { el: $("#cfName"), test: (v) => v.trim().length >= 2, msg: "Name needs at least 2 characters" },
      email: { el: $("#cfEmail"), test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), msg: "That email doesn't parse" },
      message: { el: $("#cfMsg"), test: (v) => v.trim().length >= 10, msg: "Give me at least 10 characters to work with" },
    };
    const validate = (f) => {
      const wrap = f.el.closest(".field");
      const ok = f.test(f.el.value);
      wrap.classList.toggle("err", !ok && f.el.value !== "");
      wrap.classList.toggle("ok", ok);
      $(".field-msg", wrap).textContent = ok || f.el.value === "" ? "" : f.msg;
      return ok;
    };
    Object.values(fields).forEach((f) => {
      f.el.addEventListener("blur", () => validate(f));
      f.el.addEventListener("input", () => { if (f.el.closest(".field").classList.contains("err")) validate(f); });
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const allOk = Object.values(fields).map((f) => {
        const ok = validate(f);
        if (!ok) f.el.closest(".field").classList.add("err");
        return ok;
      }).every(Boolean);
      if (!allOk) return;
      form.classList.add("sending");
      setTimeout(() => {
        form.classList.remove("sending");
        form.classList.add("sent");
        const subject = encodeURIComponent(`Portfolio contact from ${fields.name.el.value}`);
        const body = encodeURIComponent(`${fields.message.el.value}\n\n- ${fields.name.el.value} (${fields.email.el.value})`);
        location.href = `mailto:contactsahil.cs@gmail.com?subject=${subject}&body=${body}`;
        setTimeout(() => form.classList.remove("sent"), 4000);
      }, 900);
    });
  })();

  /* ================= ANIMATED FAVICON ================= */
  (() => {
    if (REDUCED) return;
    const favicon = $("#favicon");
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const ctx = cv.getContext("2d");
    let on = true;
    setInterval(() => {
      if (document.hidden) return;
      on = !on;
      ctx.clearRect(0, 0, 64, 64);
      ctx.fillStyle = "#050816";
      ctx.beginPath(); ctx.roundRect(0, 0, 64, 64, 14); ctx.fill();
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#4f9dff";
      ctx.font = "600 30px monospace";
      ctx.textAlign = "center";
      ctx.fillText(on ? "S_" : "S", 32, 42);
      favicon.href = cv.toDataURL("image/png");
    }, 900);
  })();
})();
