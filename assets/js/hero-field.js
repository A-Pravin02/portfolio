/* ─────────────────────────────────────────────────────────────
   HERO FIELD — a live authorization network behind the hero.

   Nodes are agents and checkpoints; packets are requests travelling
   between them. Each arrival resolves to allow, hold or block, which
   is what AgentBridge actually does — so the hero's moving image is
   the subject matter rather than decoration.

   Self-contained canvas. Stops when offscreen or when the tab is
   hidden, and renders a single still frame for reduced motion.
   ───────────────────────────────────────────────────────────── */

const INK = '164, 182, 204';
const BLUE = '61, 139, 255';
const LIME = '205, 255, 79';
const WARN = '255, 122, 138';

const NODE_MAX = 86;
const NODE_MIN = 30;
const AREA_PER_NODE = 15000; // px² of hero per node
const LINK_DIST = 185; // px at CSS scale
const MAX_PACKETS = 34;
const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
const TIERS = 5;

/** Verdicts carry the weighting the real policy engine produces. */
const VERDICTS = [
  { tone: BLUE, weight: 0.64 },
  { tone: LIME, weight: 0.24 },
  { tone: WARN, weight: 0.12 },
];

function pickVerdict() {
  let r = Math.random();
  for (const v of VERDICTS) {
    if (r < v.weight) return v.tone;
    r -= v.weight;
  }
  return BLUE;
}

export function mountHeroField(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

  let w = 0;
  let h = 0;
  let nodes = [];
  let packets = [];
  let frameId = 0;
  let last = 0;
  let visible = true;
  let pointer = { x: -9999, y: -9999 };
  const tiers = Array.from({ length: TIERS }, () => []);

  /* ── Build ────────────────────────────────────────────── */

  function seed() {
    // Scale with the hero's area so a phone does not carry a
    // desktop-sized mesh for no visual gain.
    const count = Math.round(
      Math.min(NODE_MAX, Math.max(NODE_MIN, (w * h) / AREA_PER_NODE)),
    );

    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      r: Math.random() < 0.18 ? 2.6 : 1.4, // a few hubs, mostly leaves
      pulse: 0,
      tone: INK,
    }));
    packets = [];
  }

  function spawnPacket() {
    if (packets.length >= MAX_PACKETS || nodes.length < 2) return;
    const from = nodes[(Math.random() * nodes.length) | 0];

    // Only travel along a link that actually exists on screen.
    const reachable = nodes.filter(
      (n) => n !== from && Math.hypot(n.x - from.x, n.y - from.y) < LINK_DIST,
    );
    if (!reachable.length) return;

    const to = reachable[(Math.random() * reachable.length) | 0];
    packets.push({ from, to, t: 0, speed: 0.35 + Math.random() * 0.45, tone: pickVerdict() });
  }

  /* ── Size ─────────────────────────────────────────────── */

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw(0);
  }

  /* ── Step ─────────────────────────────────────────────── */

  function step(dt) {
    for (const n of nodes) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;

      // Wrap rather than bounce, so the field never looks like a box.
      if (n.x < -20) n.x = w + 20;
      if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20;
      if (n.y > h + 20) n.y = -20;

      if (n.pulse > 0) n.pulse = Math.max(0, n.pulse - dt * 1.6);
    }

    for (let i = packets.length - 1; i >= 0; i -= 1) {
      const p = packets[i];
      p.t += p.speed * dt;
      if (p.t >= 1) {
        // Arrival resolves: the receiving node takes the verdict colour.
        p.to.pulse = 1;
        p.to.tone = p.tone;
        packets.splice(i, 1);
      }
    }

    if (Math.random() < dt * 9) spawnPacket();
  }

  /* ── Draw ─────────────────────────────────────────────── */

  function draw() {
    ctx.clearRect(0, 0, w, h);

    /* Links, bucketed by opacity. Stroking each line separately meant
       thousands of path calls a frame; batching into a handful of
       tiers keeps the same gradient look for a fraction of the cost.
       Distances stay squared to avoid a sqrt per pair. */
    for (const tier of tiers) tier.length = 0;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > LINK_DIST_SQ) continue;
        const fade = 1 - Math.sqrt(d2) / LINK_DIST;
        const tier = tiers[Math.min(TIERS - 1, (fade * TIERS) | 0)];
        tier.push(a.x, a.y, b.x, b.y);
      }
    }

    ctx.lineWidth = 1;
    for (let k = 0; k < TIERS; k += 1) {
      const pts = tiers[k];
      if (!pts.length) continue;
      ctx.strokeStyle = `rgba(${BLUE}, ${(((k + 0.5) / TIERS) * 0.3).toFixed(3)})`;
      ctx.beginPath();
      for (let n = 0; n < pts.length; n += 4) {
        ctx.moveTo(pts[n], pts[n + 1]);
        ctx.lineTo(pts[n + 2], pts[n + 3]);
      }
      ctx.stroke();
    }

    // Nodes, brightening near the pointer.
    for (const n of nodes) {
      const near = Math.max(0, 1 - Math.hypot(n.x - pointer.x, n.y - pointer.y) / 180);
      const glow = Math.max(n.pulse, near * 0.7);
      const alpha = 0.42 + glow * 0.55;

      ctx.fillStyle = `rgba(${n.pulse > 0 ? n.tone : INK}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + glow * 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (glow > 0.05) {
        ctx.strokeStyle = `rgba(${n.pulse > 0 ? n.tone : BLUE}, ${(glow * 0.3).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 4 + glow * 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Packets in flight, with a short trail.
    for (const p of packets) {
      const x = p.from.x + (p.to.x - p.from.x) * p.t;
      const y = p.from.y + (p.to.y - p.from.y) * p.t;
      const tailT = Math.max(0, p.t - 0.22);
      const tx = p.from.x + (p.to.x - p.from.x) * tailT;
      const ty = p.from.y + (p.to.y - p.from.y) * tailT;

      const grad = ctx.createLinearGradient(tx, ty, x, y);
      grad.addColorStop(0, `rgba(${p.tone}, 0)`);
      grad.addColorStop(1, `rgba(${p.tone}, 0.75)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = `rgba(${p.tone}, 0.9)`;
      ctx.beginPath();
      ctx.arc(x, y, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Loop ─────────────────────────────────────────────── */

  function frame(now) {
    frameId = 0;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    step(dt);
    draw();
    if (visible && !motionQuery.matches) frameId = requestAnimationFrame(frame);
  }

  function run() {
    if (motionQuery.matches) {
      // One still frame: a network at rest still reads as a network.
      for (let i = 0; i < 40; i += 1) step(1 / 30);
      draw();
      return;
    }
    if (frameId) return;
    last = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  /* ── Wiring ───────────────────────────────────────────── */

  new ResizeObserver(resize).observe(canvas);

  // Only animate while the hero is actually on screen.
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) run();
      else stop();
    },
    { threshold: 0 },
  ).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (visible) run();
  });

  addEventListener(
    'pointermove',
    (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },
    { passive: true },
  );

  addEventListener('pointerleave', () => {
    pointer = { x: -9999, y: -9999 };
  });

  motionQuery.addEventListener('change', () => {
    stop();
    run();
  });

  resize();
  run();
}
