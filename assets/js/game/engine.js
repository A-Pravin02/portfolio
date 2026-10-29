/* ─────────────────────────────────────────────────────────────
   SYSTEM OVERRIDE — game engine.

   Pure logic: no DOM, no canvas, no timers of its own. The view
   owns the animation frame and calls update(dt) / reads state().
   Coordinates are in grid cells; the view scales them to pixels.
   ───────────────────────────────────────────────────────────── */

export const STATES = Object.freeze({
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
});

/* '#' wall · '.' floor · 'P' spawn · 'F' fragment · 'E' exit */
const MAP = [
  '##############',
  '#P.........F.#',
  '#.##..##..##.#',
  '#.#....F...#.#',
  '#....##...#..#',
  '#.##..#.##...#',
  '#...F..#..##.#',
  '#.##..##...#.#',
  '#..#..F.##...#',
  '#.##.....#.#.#',
  '#....##..#.F.#',
  '#.##..#.F..#E#',
  '#............#',
  '##############',
];

const PLAYER_RADIUS = 0.3;
const PLAYER_SPEED = 3.7; // cells per second
const SENTRY_RADIUS = 0.34;
const PICKUP_RADIUS = 0.42;

/* Sentry patrols. Each runs along one axis and reverses at walls, or at
   an optional `min`/`max` bound where a full-corridor sweep would be unfair. */
const SENTRY_ROUTES = [
  { x: 6.5, y: 12.5, axis: 'x', dir: 1, speed: 3.4 },
  // Sweeps the lower half of the spawn column, so the first move is survivable.
  { x: 1.5, y: 8.5, axis: 'y', dir: 1, speed: 3.0, min: 5.5, max: 12.5 },
  { x: 6.5, y: 9.5, axis: 'x', dir: 1, speed: 3.2 },
  // Patrols the column the exit sits in, slowly enough to be timed.
  { x: 12.5, y: 6.5, axis: 'y', dir: 1, speed: 2.4 },
];

export function createGame() {
  const rows = MAP.length;
  const cols = MAP[0].length;

  let walls = [];
  let spawn = { x: 1.5, y: 1.5 };
  let exitCell = { x: 12, y: 11 };
  let fragmentCells = [];

  // Parse the map once.
  for (let y = 0; y < rows; y += 1) {
    walls[y] = [];
    for (let x = 0; x < cols; x += 1) {
      const ch = MAP[y][x];
      walls[y][x] = ch === '#';
      if (ch === 'P') spawn = { x: x + 0.5, y: y + 0.5 };
      if (ch === 'E') exitCell = { x, y };
      if (ch === 'F') fragmentCells.push({ x: x + 0.5, y: y + 0.5 });
    }
  }

  let state = STATES.READY;
  let player = { ...spawn };
  let fragments = [];
  let sentries = [];
  let elapsed = 0;
  let lostReason = '';
  let exitOpen = false;
  let flash = 0; // collision feedback, decays in the view

  function isWall(cx, cy) {
    if (cy < 0 || cy >= rows || cx < 0 || cx >= cols) return true;
    return walls[cy][cx];
  }

  /** Axis-separated circle-vs-grid collision, so sliding along a wall works. */
  function moveAxis(pos, delta, axis) {
    const next = { ...pos };
    next[axis] += delta;

    const minX = Math.floor(next.x - PLAYER_RADIUS);
    const maxX = Math.floor(next.x + PLAYER_RADIUS);
    const minY = Math.floor(next.y - PLAYER_RADIUS);
    const maxY = Math.floor(next.y + PLAYER_RADIUS);

    for (let cy = minY; cy <= maxY; cy += 1) {
      for (let cx = minX; cx <= maxX; cx += 1) {
        if (!isWall(cx, cy)) continue;
        // Push back out of the blocking cell on this axis only.
        if (axis === 'x') {
          next.x = delta > 0 ? cx - PLAYER_RADIUS - 0.001 : cx + 1 + PLAYER_RADIUS + 0.001;
        } else {
          next.y = delta > 0 ? cy - PLAYER_RADIUS - 0.001 : cy + 1 + PLAYER_RADIUS + 0.001;
        }
        return next;
      }
    }
    return next;
  }

  function reset() {
    player = { ...spawn };
    fragments = fragmentCells.map((cell) => ({ ...cell, taken: false }));
    sentries = SENTRY_ROUTES.map((route) => ({ ...route }));
    elapsed = 0;
    lostReason = '';
    exitOpen = false;
    flash = 0;
    state = STATES.READY;
  }

  function start() {
    reset();
    state = STATES.PLAYING;
  }

  function pause() {
    if (state === STATES.PLAYING) state = STATES.PAUSED;
  }

  function resume() {
    if (state === STATES.PAUSED) state = STATES.PLAYING;
  }

  function togglePause() {
    if (state === STATES.PLAYING) pause();
    else if (state === STATES.PAUSED) resume();
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /**
   * Advance the simulation.
   * @param {number} dt seconds since the last update, already clamped
   * @param {{up:boolean,down:boolean,left:boolean,right:boolean}} input
   */
  function update(dt, input) {
    if (state !== STATES.PLAYING) return;

    elapsed += dt;
    if (flash > 0) flash = Math.max(0, flash - dt * 2.5);

    // ── Player ──
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx && dy) {
      const inv = Math.SQRT1_2;
      dx *= inv;
      dy *= inv;
    }

    if (dx) player = moveAxis(player, dx * PLAYER_SPEED * dt, 'x');
    if (dy) player = moveAxis(player, dy * PLAYER_SPEED * dt, 'y');

    // ── Sentries ──
    for (const sentry of sentries) {
      const step = sentry.dir * sentry.speed * dt;
      const probe = { ...sentry };
      probe[sentry.axis] += step;

      const cx = Math.floor(probe.x + (sentry.axis === 'x' ? Math.sign(step) * SENTRY_RADIUS : 0));
      const cy = Math.floor(probe.y + (sentry.axis === 'y' ? Math.sign(step) * SENTRY_RADIUS : 0));

      const beyondBound =
        (sentry.min !== undefined && probe[sentry.axis] < sentry.min) ||
        (sentry.max !== undefined && probe[sentry.axis] > sentry.max);

      if (isWall(cx, cy) || beyondBound) sentry.dir *= -1;
      else sentry[sentry.axis] = probe[sentry.axis];

      if (distance(sentry, player) < SENTRY_RADIUS + PLAYER_RADIUS) {
        state = STATES.LOST;
        lostReason = 'A security sweep found you. The session was traced and cut.';
        flash = 1;
        return;
      }
    }

    // ── Fragments ──
    for (const fragment of fragments) {
      if (fragment.taken) continue;
      if (distance(fragment, player) < PICKUP_RADIUS) {
        fragment.taken = true;
        flash = 1;
      }
    }

    exitOpen = fragments.every((f) => f.taken);

    // ── Exit ──
    if (exitOpen) {
      const inExit =
        Math.floor(player.x) === exitCell.x && Math.floor(player.y) === exitCell.y;
      if (inExit) state = STATES.WON;
    }
  }

  function score() {
    const collected = fragments.filter((f) => f.taken).length;
    // Fragments are the bulk of it; speed is the bonus, floored at zero.
    return collected * 250 + Math.max(0, Math.round((90 - elapsed) * 10));
  }

  reset();

  return {
    STATES,
    update,
    start,
    pause,
    resume,
    togglePause,
    reset,
    isWall,
    get state() {
      return state;
    },
    snapshot() {
      return {
        state,
        player,
        fragments,
        sentries,
        exitCell,
        exitOpen,
        elapsed,
        lostReason,
        flash,
        collected: fragments.filter((f) => f.taken).length,
        total: fragments.length,
        score: score(),
        rows,
        cols,
        walls,
        radii: { player: PLAYER_RADIUS, sentry: SENTRY_RADIUS },
      };
    },
  };
}
