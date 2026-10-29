/* ─────────────────────────────────────────────────────────────
   MAZE OVERRIDE — canvas view, input and lifecycle.

   Owns the animation frame, the key and touch listeners, and the
   overlay screens. Everything is torn down when the dialog closes
   so nothing keeps running in the background.
   ───────────────────────────────────────────────────────────── */

import { $, $$, reducedMotion, goToSection } from '../utils.js';
import { createGame, STATES } from './engine.js';

const WALL = '#3f31a8';
const WALL_EDGE = '#8665ff';
const PELLET = '#f0d7a8';
const PAC = '#ffd34d';
const FRIGHT = '#3b63ff';
const FRIGHT_FLASH = '#f5f5f7';
const DOOR = '#ffa8dc';

const DIR_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

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

  const hudScore = $('#hud-score');
  const hudPellets = $('#hud-pellets');
  const hudLives = $('#hud-lives');

  const game = createGame();

  let frameId = 0;
  let last = 0;
  let listening = false;
  let cell = 20;

  /* ── Sizing ───────────────────────────────────────────── */

  function resize() {
    const s = game.snapshot();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // The board is taller than it is wide, so a short viewport constrains
    // width, not height. Fit to whichever runs out first.
    // clientWidth includes the stage's padding, so take it back off —
    // otherwise the board is drawn wider than the box that clips it.
    const stage = canvas.parentElement;
    const stagePad = getComputedStyle(stage);
    const available = Math.max(
      1,
      stage.clientWidth - parseFloat(stagePad.paddingLeft) - parseFloat(stagePad.paddingRight),
    );
    const heightBudget = Math.max(200, Math.min(innerHeight * 0.56, 620));
    const width = Math.max(1, Math.round(Math.min(available, (heightBudget * s.cols) / s.rows)));

    // Writing the width feeds the ResizeObserver, so only move when it
    // actually changes — otherwise the two bounce off each other.
    if (Math.abs(canvas.clientWidth - width) > 0.5) canvas.style.width = `${width}px`;

    cell = width / s.cols;
    const height = Math.round(cell * s.rows);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
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
      // Escape pauses a live run rather than closing the dialog.
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
    if (game.state === STATES.READY) startRun();
    game.setDirection(dir);
  }

  function wireTouch() {
    for (const button of $$('.game__pad button')) {
      const dir = button.dataset.dir;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (game.state === STATES.READY) startRun();
        game.setDirection(dir);
      });
    }

    // Swipe anywhere on the board, for people who ignore the pad.
    let from = null;
    canvas.addEventListener('pointerdown', (event) => {
      from = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointerup', (event) => {
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      from = null;
      if (Math.hypot(dx, dy) < 24) return;
      if (game.state === STATES.READY) startRun();
      if (Math.abs(dx) > Math.abs(dy)) game.setDirection(dx > 0 ? 'right' : 'left');
      else game.setDirection(dy > 0 ? 'down' : 'up');
    });
  }

  /* ── Screens ──────────────────────────────────────────── */

  function showScreen(name) {
    for (const [key, node] of Object.entries(screens)) node.hidden = key !== name;
  }

  function syncScreen() {
    const s = game.snapshot();
    if (s.state === STATES.READY) showScreen('ready');
    else if (s.state === STATES.PAUSED) showScreen('paused');
    else if (s.state === STATES.WON) {
      $('#won-stats').textContent = `${s.total} pellets · ${s.elapsed.toFixed(
        1,
      )}s · ${s.lives} lives left · score ${s.score}`;
      showScreen('won');
    } else if (s.state === STATES.LOST) {
      $('#lost-reason').textContent = `${s.lostReason} You cleared ${s.eaten} of ${s.total} pellets for ${s.score} points.`;
      showScreen('lost');
    } else showScreen(null);
  }

  function setPaused(paused) {
    if (paused) game.pause();
    else game.resume();
    syncScreen();
    if (!paused) {
      last = performance.now();
      frameId = requestAnimationFrame(loop);
    }
  }

  /* ── Loop ─────────────────────────────────────────────── */

  function loop(now) {
    frameId = 0;
    const dt = Math.min((now - last) / 1000, 1 / 20); // clamp after a tab switch
    last = now;

    const before = game.state;
    game.update(dt, null);
    draw();
    updateHud();

    if (game.state !== before) {
      syncScreen();
      if (game.state === STATES.WON || game.state === STATES.LOST) return;
    }

    if (game.state === STATES.PLAYING) frameId = requestAnimationFrame(loop);
  }

  function startRun() {
    game.start();
    syncScreen();
    cancelAnimationFrame(frameId);
    last = performance.now();
    frameId = requestAnimationFrame(loop);
  }

  function updateHud() {
    const s = game.snapshot();
    hudScore.textContent = String(s.score);
    hudPellets.textContent = `${s.eaten}/${s.total}`;
    hudLives.textContent = '●'.repeat(Math.max(0, s.lives)) || '—';
  }

  /* ── Draw ─────────────────────────────────────────────── */

  function draw() {
    const s = game.snapshot();
    const w = s.cols * cell;
    const h = s.rows * cell;

    ctx.clearRect(0, 0, w, h);

    /* Maze. Each wall tile is drawn as a rounded block, with edges only
       where it meets open space, so corridors read as channels. */
    for (let y = 0; y < s.rows; y += 1) {
      for (let x = 0; x < s.cols; x += 1) {
        if (!s.walls[y][x]) continue;
        const px = x * cell;
        const py = y * cell;
        ctx.fillStyle = WALL;
        ctx.fillRect(px, py, cell, cell);

        ctx.strokeStyle = WALL_EDGE;
        ctx.lineWidth = Math.max(1, cell * 0.08);
        ctx.beginPath();
        if (y === 0 || !s.walls[y - 1][x]) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cell, py);
        }
        if (y === s.rows - 1 || !s.walls[y + 1][x]) {
          ctx.moveTo(px, py + cell);
          ctx.lineTo(px + cell, py + cell);
        }
        if (x === 0 || !s.walls[y][x - 1]) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cell);
        }
        if (x === s.cols - 1 || !s.walls[y][x + 1]) {
          ctx.moveTo(px + cell, py);
          ctx.lineTo(px + cell, py + cell);
        }
        ctx.stroke();
      }
    }

    /* Ghost house door */
    for (let y = 0; y < s.rows; y += 1) {
      for (let x = 0; x < s.cols; x += 1) {
        if (!s.doors[y][x]) continue;
        ctx.fillStyle = DOOR;
        ctx.fillRect(x * cell, y * cell + cell * 0.42, cell, cell * 0.16);
      }
    }

    /* Pellets. Power pellets pulse, unless reduced motion is requested. */
    const pulse = reducedMotion() ? 1 : 0.72 + Math.sin(s.elapsed * 7) * 0.28;
    for (const pellet of s.pellets) {
      if (pellet.taken) continue;
      const px = pellet.x * cell + cell / 2;
      const py = pellet.y * cell + cell / 2;
      ctx.fillStyle = PELLET;
      ctx.beginPath();
      ctx.arc(px, py, pellet.power ? cell * 0.3 * pulse : cell * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Player */
    if (!s.respawning || Math.floor(s.elapsed * 10) % 2 === 0) drawPac(s);

    /* Ghosts */
    for (const ghost of s.ghosts) drawGhost(s, ghost);

    /* Floating score from the last ghost eaten */
    if (s.eatenAt) {
      ctx.fillStyle = '#55ddf5';
      ctx.font = `600 ${Math.round(cell * 0.72)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.max(0, s.eatenAt.life);
      ctx.fillText(String(s.eatenAt.points), s.eatenAt.x * cell, s.eatenAt.y * cell);
      ctx.globalAlpha = 1;
    }
  }

  function drawPac(s) {
    const px = s.pac.x * cell;
    const py = s.pac.y * cell;
    const r = cell * 0.44;
    const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[s.pac.dir] || 0;
    // Mouth closes and opens while moving, and stays open when stopped.
    const gap = s.pac.moving ? Math.abs(Math.sin(s.pac.mouth)) * 0.32 : 0.18;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = PAC;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, gap * Math.PI, (2 - gap) * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGhost(s, ghost) {
    const px = ghost.x * cell;
    const py = ghost.y * cell;
    const r = cell * 0.44;
    const eyes = ghost.status === 'eyes';
    const frightened = ghost.status === 'fright';

    if (!eyes) {
      // Flash white in the last two seconds of frightened mode.
      const flashing = frightened && s.frightEnding && Math.floor(s.elapsed * 6) % 2 === 0;
      ctx.fillStyle = frightened ? (flashing ? FRIGHT_FLASH : FRIGHT) : ghost.colour;

      ctx.beginPath();
      ctx.arc(px, py - r * 0.1, r, Math.PI, 0);
      ctx.lineTo(px + r, py + r * 0.72);
      // Three-pointed skirt along the bottom.
      for (let i = 0; i < 3; i += 1) {
        const x0 = px + r - ((i * 2 + 1) * r) / 3;
        const x1 = px + r - ((i * 2 + 2) * r) / 3;
        ctx.lineTo(x0, py + r * 0.4);
        ctx.lineTo(x1, py + r * 0.72);
      }
      ctx.lineTo(px - r, py + r * 0.72);
      ctx.closePath();
      ctx.fill();
    }

    // Eyes. Frightened ghosts get a flat face instead of looking at you.
    const look = DIR_VECTORS[ghost.dir] || { x: 0, y: 0 };
    for (const side of [-1, 1]) {
      const ex = px + side * r * 0.38;
      const ey = py - r * 0.18;

      if (frightened) {
        ctx.fillStyle = FRIGHT_FLASH;
        ctx.beginPath();
        ctx.arc(ex, ey, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.26, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a1f6b';
      ctx.beginPath();
      ctx.arc(ex + look.x * r * 0.12, ey + look.y * r * 0.14, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Lifecycle ────────────────────────────────────────── */

  function attach() {
    if (listening) return;
    listening = true;
    addEventListener('keydown', onKeyDown);
    resizeObserver.observe(canvas);
  }

  function detach() {
    listening = false;
    removeEventListener('keydown', onKeyDown);
    resizeObserver.disconnect();
    cancelAnimationFrame(frameId);
    frameId = 0;
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
      resize();
      updateHud();
      $('#game-start').focus();
    },
  };
}
