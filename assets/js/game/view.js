/* ─────────────────────────────────────────────────────────────
   SYSTEM OVERRIDE — canvas view, input and lifecycle.

   Owns the animation frame, the key and touch listeners, and the
   overlay screens. Everything is torn down when the dialog closes
   so nothing keeps running in the background.
   ───────────────────────────────────────────────────────────── */

import { $, $$, reducedMotion, goToSection } from '../utils.js';
import { createGame, STATES } from './engine.js';

const INK = '#f5f5f7';
const VIOLET = '#8665ff';
const CYAN = '#55ddf5';
const GRID = 'rgba(245,245,247,0.045)';
const WALL = 'rgba(134,101,255,0.10)';
const WALL_EDGE = 'rgba(134,101,255,0.30)';

export function initGame() {
  const dialog = $('#game');
  const canvas = $('#game-canvas');
  const ctx = canvas.getContext('2d');

  const screens = {
    ready: $('#screen-ready'),
    paused: $('#screen-paused'),
    won: $('#screen-won'),
    lost: $('#screen-lost'),
  };

  const hudFrag = $('#hud-frag');
  const hudTime = $('#hud-time');

  const game = createGame();
  const input = { up: false, down: false, left: false, right: false };

  let frameId = 0;
  let last = 0;
  let particles = [];
  let listening = false;
  let cssSize = 560; // logical (CSS pixel) edge length of the square canvas

  /* ── Sizing ───────────────────────────────────────────── */

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    const size = Math.max(1, Math.round(box.width));
    cssSize = size;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  const resizeObserver = new ResizeObserver(resize);

  /* ── Input ────────────────────────────────────────────── */

  const KEY_MAP = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    a: 'left',
    s: 'down',
    d: 'right',
    W: 'up',
    A: 'left',
    S: 'down',
    D: 'right',
  };

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      // Let Escape pause rather than close while a run is live.
      if (game.state === STATES.PLAYING) {
        event.preventDefault();
        setPaused(true);
      }
      return;
    }

    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      startRun();
      return;
    }

    const dir = KEY_MAP[event.key];
    if (!dir) return;
    event.preventDefault();
    input[dir] = true;
  }

  function onKeyUp(event) {
    const dir = KEY_MAP[event.key];
    if (dir) input[dir] = false;
  }

  function clearInput() {
    input.up = input.down = input.left = input.right = false;
  }

  function wireTouch() {
    for (const button of $$('.game__pad button')) {
      const dir = button.dataset.dir;
      const press = (event) => {
        event.preventDefault();
        input[dir] = true;
        if (game.state === STATES.READY) startRun();
      };
      const release = (event) => {
        event.preventDefault();
        input[dir] = false;
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    }
  }

  /* ── Screens ──────────────────────────────────────────── */

  function showScreen(name) {
    for (const [key, node] of Object.entries(screens)) {
      node.hidden = key !== name;
    }
    if (name === null) for (const node of Object.values(screens)) node.hidden = true;
  }

  function syncScreen() {
    const s = game.snapshot();
    if (s.state === STATES.READY) showScreen('ready');
    else if (s.state === STATES.PAUSED) showScreen('paused');
    else if (s.state === STATES.WON) {
      $('#won-stats').textContent = `${s.collected}/${s.total} fragments · ${s.elapsed.toFixed(1)}s · score ${s.score}`;
      showScreen('won');
    } else if (s.state === STATES.LOST) {
      $('#lost-reason').textContent = s.lostReason;
      showScreen('lost');
    } else showScreen(null);
  }

  function setPaused(paused) {
    if (paused) game.pause();
    else game.resume();
    clearInput();
    syncScreen();
    if (!paused) {
      last = performance.now();
      loop(last);
    }
  }

  /* ── Loop ─────────────────────────────────────────────── */

  function loop(now) {
    frameId = 0;
    const dt = Math.min((now - last) / 1000, 1 / 20); // clamp after a tab switch
    last = now;

    const before = game.state;
    game.update(dt, input);
    stepParticles(dt);
    draw();
    updateHud();

    if (game.state !== before) {
      syncScreen();
      if (game.state === STATES.WON || game.state === STATES.LOST) {
        clearInput();
        return; // stop the loop; the run is over
      }
    }

    if (game.state === STATES.PLAYING) frameId = requestAnimationFrame(loop);
  }

  function startRun() {
    game.start();
    particles = [];
    clearInput();
    syncScreen();
    cancelAnimationFrame(frameId);
    last = performance.now();
    frameId = requestAnimationFrame(loop);
  }

  function updateHud() {
    const s = game.snapshot();
    hudFrag.textContent = `${s.collected}/${s.total}`;
    hudTime.textContent = `${s.elapsed.toFixed(1)}s`;
  }

  /* ── Particles (decorative, skipped for reduced motion) ── */

  function stepParticles(dt) {
    if (reducedMotion()) {
      particles = [];
      return;
    }

    const s = game.snapshot();
    if (s.state === STATES.PLAYING && particles.length < 48) {
      particles.push({ x: s.player.x, y: s.player.y, life: 1 });
    }

    particles = particles.filter((p) => {
      p.life -= dt * 1.7;
      return p.life > 0;
    });
  }

  /* ── Draw ─────────────────────────────────────────────── */

  function draw() {
    const s = game.snapshot();
    const size = cssSize;
    const cell = size / s.cols;

    ctx.clearRect(0, 0, size, size);

    // Grid
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < s.cols; i += 1) {
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
    }
    ctx.stroke();

    // Walls
    for (let y = 0; y < s.rows; y += 1) {
      for (let x = 0; x < s.cols; x += 1) {
        if (!s.walls[y][x]) continue;
        ctx.fillStyle = WALL;
        ctx.fillRect(x * cell, y * cell, cell, cell);
        ctx.strokeStyle = WALL_EDGE;
        ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
      }
    }

    // Exit
    const ex = s.exitCell.x * cell;
    const ey = s.exitCell.y * cell;
    ctx.save();
    if (s.exitOpen) {
      ctx.fillStyle = 'rgba(85,245,163,0.18)';
      ctx.strokeStyle = '#55f5a3';
    } else {
      ctx.fillStyle = 'rgba(245,245,247,0.03)';
      ctx.strokeStyle = 'rgba(245,245,247,0.16)';
      ctx.setLineDash([4, 4]);
    }
    ctx.fillRect(ex, ey, cell, cell);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ex + 1, ey + 1, cell - 2, cell - 2);
    ctx.restore();

    ctx.fillStyle = s.exitOpen ? '#55f5a3' : 'rgba(245,245,247,0.3)';
    ctx.font = `600 ${Math.round(cell * 0.34)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', ex + cell / 2, ey + cell / 2);

    // Particle trail
    for (const p of particles) {
      ctx.fillStyle = `rgba(85,221,245,${(p.life * 0.26).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x * cell, p.y * cell, cell * 0.18 * p.life, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fragments
    for (const fragment of s.fragments) {
      if (fragment.taken) continue;
      const fx = fragment.x * cell;
      const fy = fragment.y * cell;
      const r = cell * 0.2;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(reducedMotion() ? 0 : (s.elapsed % (Math.PI * 2)) * 1.2);
      ctx.strokeStyle = CYAN;
      ctx.fillStyle = 'rgba(85,221,245,0.16)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Sentries
    for (const sentry of s.sentries) {
      const sx = sentry.x * cell;
      const sy = sentry.y * cell;
      const r = s.radii.sentry * cell;
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.4);
      gradient.addColorStop(0, 'rgba(255,107,125,0.26)');
      gradient.addColorStop(1, 'rgba(255,107,125,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(sx - r * 2.4, sy - r * 2.4, r * 4.8, r * 4.8);

      ctx.strokeStyle = '#ff6b7d';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.rect(sx - r * 0.72, sy - r * 0.72, r * 1.44, r * 1.44);
      ctx.stroke();
    }

    // Player
    const px = s.player.x * cell;
    const py = s.player.y * cell;
    const pr = s.radii.player * cell;
    ctx.fillStyle = s.flash > 0 ? INK : VIOLET;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,245,247,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, pr + 3 + s.flash * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* ── Lifecycle ────────────────────────────────────────── */

  function attach() {
    if (listening) return;
    listening = true;
    addEventListener('keydown', onKeyDown);
    addEventListener('keyup', onKeyUp);
    addEventListener('blur', clearInput);
    resizeObserver.observe(canvas);
  }

  function detach() {
    listening = false;
    removeEventListener('keydown', onKeyDown);
    removeEventListener('keyup', onKeyUp);
    removeEventListener('blur', clearInput);
    resizeObserver.disconnect();
    cancelAnimationFrame(frameId);
    frameId = 0;
    clearInput();
  }

  // Pause when the tab is hidden, so nothing runs unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === STATES.PLAYING) setPaused(true);
  });

  dialog.addEventListener('close', () => {
    detach();
    game.reset();
    syncScreen();
  });

  $('#game-start').addEventListener('click', startRun);
  $('#game-resume').addEventListener('click', () => setPaused(false));
  $('#game-restart-paused').addEventListener('click', startRun);
  $('#won-again').addEventListener('click', startRun);
  $('#lost-again').addEventListener('click', startRun);
  $('#game-pause').addEventListener('click', () => {
    if (game.state === STATES.PLAYING) setPaused(true);
    else if (game.state === STATES.PAUSED) setPaused(false);
  });
  $('#won-projects').addEventListener('click', () => {
    dialog.close();
    goToSection('#projects');
  });

  wireTouch();

  return {
    open() {
      if (!dialog.open) dialog.showModal();
      attach();
      game.reset();
      syncScreen();
      updateHud();
      resize();
      $('#game-start').focus();
    },
  };
}
