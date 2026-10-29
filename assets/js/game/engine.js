/* ─────────────────────────────────────────────────────────────
   MAZE OVERRIDE — game engine.

   Pac-Man mechanics: pellets, power pellets, four ghosts with
   distinct targeting, scatter/chase cycling, frightened mode and
   eyes returning to the house.

   Pure logic — no DOM, no canvas, no timers. The view owns the
   animation frame and calls update(dt) / snapshot(). Positions are
   in grid cells, with x.5 / y.5 being a tile centre.
   ───────────────────────────────────────────────────────────── */

export const STATES = Object.freeze({
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
});

/* '#' wall · '.' pellet · 'o' power pellet · ' ' open floor
   'P' player spawn · 'G' ghost house · '-' house door (ghosts only) */
const MAP = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.#.#####.#.####',
  '####.#.......#.####',
  '####.##     ##.####',
  '####.####-####.####',
  '       #GGG#       ',
  '####.#########.####',
  '####.#.#####.#.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.###.#######.###.#',
  '#.................#',
  '###################',
];

const SPEED = 5.6; // cells per second
const GHOST_SPEED = 5.2;
const FRIGHT_SPEED = 3.1;
const EYES_SPEED = 11;
const FRIGHT_TIME = 7; // seconds
const CENTRE_EPS = 1e-6;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

/* Scatter corners, one per ghost, in the classic arrangement. */
const GHOSTS = [
  { id: 'blinky', colour: '#cf6f6d', scatter: { x: 17, y: 1 }, release: 0, start: { x: 9.5, y: 8.5 }, home: false },
  { id: 'pinky', colour: '#c793b4', scatter: { x: 1, y: 1 }, release: 0, start: { x: 9.5, y: 10.5 }, home: true },
  { id: 'inky', colour: '#8fa8c9', scatter: { x: 17, y: 19 }, release: 4, start: { x: 8.5, y: 10.5 }, home: true },
  { id: 'clyde', colour: '#cf9a5c', scatter: { x: 1, y: 19 }, release: 9, start: { x: 10.5, y: 10.5 }, home: true },
];

/* Mode schedule. The last entry runs for the rest of the level. */
const MODES = [
  { mode: 'scatter', time: 7 },
  { mode: 'chase', time: 20 },
  { mode: 'scatter', time: 7 },
  { mode: 'chase', time: Infinity },
];

const DOOR = { x: 9, y: 9 };
const HOUSE_EXIT = { x: 9.5, y: 8.5 };

export function createGame() {
  const rows = MAP.length;
  const cols = MAP[0].length;

  const walls = [];
  const doors = [];
  let spawn = { x: 9.5, y: 15.5 };
  const pelletCells = [];

  for (let y = 0; y < rows; y += 1) {
    walls[y] = [];
    doors[y] = [];
    for (let x = 0; x < cols; x += 1) {
      const ch = MAP[y][x];
      walls[y][x] = ch === '#';
      doors[y][x] = ch === '-';
      if (ch === 'P') spawn = { x: x + 0.5, y: y + 0.5 };
      if (ch === '.') pelletCells.push({ x, y, power: false });
      if (ch === 'o') pelletCells.push({ x, y, power: true });
    }
  }

  let state = STATES.READY;
  let pellets = [];
  let pac = null;
  let ghosts = [];
  let score = 0;
  let lives = 3;
  let elapsed = 0;
  let modeIndex = 0;
  let modeTimer = 0;
  let frightTimer = 0;
  let ghostCombo = 0;
  let eatenAt = null; // {x, y, points} for the floating score
  let respawning = 0; // brief freeze after losing a life
  let lostReason = '';

  /* ── Grid helpers ─────────────────────────────────────── */

  const wrapX = (x) => (x < 0 ? x + cols : x >= cols ? x - cols : x);

  function blocked(cx, cy, asGhost) {
    const x = wrapX(cx);
    if (cy < 0 || cy >= rows) return true;
    if (walls[cy][x]) return true;
    if (doors[cy][x] && !asGhost) return true;
    return false;
  }

  const tileOf = (e) => ({ x: Math.floor(wrapX(e.x)), y: Math.floor(e.y) });

  function canGo(tile, dir, asGhost) {
    const d = DIRS[dir];
    return !blocked(tile.x + d.x, tile.y + d.y, asGhost);
  }

  /**
   * Move an entity along its direction, stopping at tile centres to let
   * `decide` pick the next one. Sub-stepping keeps turns exact instead of
   * letting a large dt skip past a junction.
   */
  function advance(entity, distance, asGhost, decide) {
    let remaining = distance;
    let guard = 0;

    while (remaining > 0 && guard < 32) {
      guard += 1;

      const tile = tileOf(entity);
      const centreX = tile.x + 0.5;
      const centreY = tile.y + 0.5;
      const atCentre =
        Math.abs(entity.x - centreX) < 1e-4 && Math.abs(entity.y - centreY) < 1e-4;

      if (atCentre) {
        entity.x = centreX;
        entity.y = centreY;
        decide(entity, tile);
        if (!entity.dir || !canGo(tile, entity.dir, asGhost)) {
          entity.moving = false;
          return;
        }
        entity.moving = true;
      }

      const d = DIRS[entity.dir];
      // Distance to the next tile centre along the heading. Centres sit at
      // k + 0.5, so this is the gap to the nearest one in that direction.
      const pos = d.x !== 0 ? entity.x : entity.y;
      const toCentre =
        (d.x > 0 || d.y > 0)
          ? Math.floor(pos - 0.5) + 1.5 - pos
          : pos - (Math.ceil(pos - 0.5) - 0.5);

      const step = Math.min(remaining, Math.max(toCentre, CENTRE_EPS));
      entity.x += d.x * step;
      entity.y += d.y * step;
      entity.x = wrapX(entity.x);
      remaining -= step;
    }
  }

  /* ── Ghost targeting ──────────────────────────────────── */

  function aheadOf(entity, n) {
    const d = DIRS[entity.dir] || { x: 0, y: 0 };
    return { x: Math.floor(entity.x) + d.x * n, y: Math.floor(entity.y) + d.y * n };
  }

  function targetFor(ghost) {
    if (ghost.status === 'eyes') return DOOR;
    if (mode() === 'scatter') return ghost.scatter;

    const pacTile = tileOf(pac);

    switch (ghost.id) {
      case 'blinky':
        return pacTile;

      case 'pinky':
        // Four tiles ahead of the player.
        return aheadOf(pac, 4);

      case 'inky': {
        // The vector from Blinky to two tiles ahead of the player, doubled.
        const blinky = ghosts.find((g) => g.id === 'blinky');
        const pivot = aheadOf(pac, 2);
        if (!blinky) return pacTile;
        return {
          x: pivot.x + (pivot.x - Math.floor(blinky.x)),
          y: pivot.y + (pivot.y - Math.floor(blinky.y)),
        };
      }

      case 'clyde': {
        // Chases until it gets close, then retreats to its corner.
        const dist = Math.hypot(pac.x - ghost.x, pac.y - ghost.y);
        return dist > 8 ? pacTile : ghost.scatter;
      }

      default:
        return pacTile;
    }
  }

  function chooseGhostDir(ghost, tile) {
    const asGhost = true;
    const options = Object.keys(DIRS).filter((dir) => {
      if (ghost.dir && dir === OPPOSITE[ghost.dir]) return false; // no reversing
      return canGo(tile, dir, asGhost);
    });

    // Dead end: reversing is the only legal move.
    if (!options.length) {
      ghost.dir = ghost.dir ? OPPOSITE[ghost.dir] : 'up';
      return;
    }

    const target = targetFor(ghost);
    const frightened = ghost.status === 'fright';

    let best = options[0];
    let bestScore = frightened ? -Infinity : Infinity;

    for (const dir of options) {
      const d = DIRS[dir];
      const nx = wrapX(tile.x + d.x);
      const ny = tile.y + d.y;
      const dist = (nx - target.x) ** 2 + (ny - target.y) ** 2;
      // Frightened ghosts run from the player instead of toward the target.
      if (frightened ? dist > bestScore : dist < bestScore) {
        bestScore = dist;
        best = dir;
      }
    }

    ghost.dir = best;
  }

  const mode = () => MODES[modeIndex].mode;

  /* ── Lifecycle ────────────────────────────────────────── */

  function placeActors() {
    pac = { x: spawn.x, y: spawn.y, dir: 'left', nextDir: null, moving: false, mouth: 0 };
    ghosts = GHOSTS.map((g) => ({
      ...g,
      x: g.start.x,
      y: g.start.y,
      dir: g.id === 'blinky' ? 'left' : 'up',
      status: g.home ? 'house' : 'normal',
      releaseAt: g.release,
      moving: true,
    }));
  }

  function reset() {
    pellets = pelletCells.map((c) => ({ ...c, taken: false }));
    score = 0;
    lives = 3;
    elapsed = 0;
    modeIndex = 0;
    modeTimer = 0;
    frightTimer = 0;
    ghostCombo = 0;
    eatenAt = null;
    respawning = 0;
    lostReason = '';
    placeActors();
    state = STATES.READY;
  }

  function start() {
    reset();
    state = STATES.PLAYING;
  }

  const pause = () => {
    if (state === STATES.PLAYING) state = STATES.PAUSED;
  };
  const resume = () => {
    if (state === STATES.PAUSED) state = STATES.PLAYING;
  };
  const togglePause = () => (state === STATES.PLAYING ? pause() : resume());

  /** Queue a turn. Taken at the next tile centre where it is legal. */
  function setDirection(dir) {
    if (!DIRS[dir]) return;
    // Reversing is always legal mid-corridor, so take it immediately —
    // waiting for the next centre makes the controls feel sticky.
    if (pac.dir && dir === OPPOSITE[pac.dir]) {
      pac.dir = dir;
      pac.nextDir = null;
      return;
    }
    // Anything else is queued and taken at the next junction that allows it.
    pac.nextDir = dir;
  }

  function loseLife() {
    lives -= 1;
    ghostCombo = 0;
    frightTimer = 0;
    if (lives <= 0) {
      state = STATES.LOST;
      lostReason = 'The ghosts cornered you. No lives left.';
      return;
    }
    placeActors();
    respawning = 1.2;
  }

  /* ── Update ───────────────────────────────────────────── */

  function update(dt, input) {
    if (state !== STATES.PLAYING) return;

    elapsed += dt;

    if (eatenAt) {
      eatenAt.life -= dt;
      if (eatenAt.life <= 0) eatenAt = null;
    }

    // Brief freeze after a death, so the reset is readable.
    if (respawning > 0) {
      respawning -= dt;
      return;
    }

    // Queued input from the view.
    if (input?.dir) setDirection(input.dir);

    // Mode cycling pauses while ghosts are frightened.
    if (frightTimer > 0) {
      frightTimer -= dt;
      if (frightTimer <= 0) {
        frightTimer = 0;
        ghostCombo = 0;
        for (const g of ghosts) if (g.status === 'fright') g.status = 'normal';
      }
    } else {
      modeTimer += dt;
      if (modeTimer >= MODES[modeIndex].time && modeIndex < MODES.length - 1) {
        modeTimer = 0;
        modeIndex += 1;
        // Ghosts reverse when the mode flips.
        for (const g of ghosts) {
          if (g.status === 'normal' && g.dir) g.dir = OPPOSITE[g.dir];
        }
      }
    }

    /* ── Player ── */
    advance(pac, SPEED * dt, false, (entity, tile) => {
      if (entity.nextDir && canGo(tile, entity.nextDir, false)) {
        entity.dir = entity.nextDir;
        entity.nextDir = null;
      }
    });
    pac.mouth = (pac.mouth + dt * 9) % (Math.PI * 2);

    /* ── Pellets ── */
    const pacTile = tileOf(pac);
    for (const pellet of pellets) {
      if (pellet.taken) continue;
      if (pellet.x !== pacTile.x || pellet.y !== pacTile.y) continue;
      pellet.taken = true;
      score += pellet.power ? 50 : 10;
      if (pellet.power) {
        frightTimer = FRIGHT_TIME;
        ghostCombo = 0;
        for (const g of ghosts) {
          if (g.status === 'normal') {
            g.status = 'fright';
            if (g.dir) g.dir = OPPOSITE[g.dir];
          }
        }
      }
    }

    if (pellets.every((p) => p.taken)) {
      // Clearing the maze is the win condition; time survives into the score.
      score += lives * 500;
      state = STATES.WON;
      return;
    }

    /* ── Ghosts ── */
    for (const ghost of ghosts) {
      if (ghost.status === 'house') {
        ghost.releaseAt -= dt;
        if (ghost.releaseAt > 0) {
          // Bob gently in place until released.
          ghost.y += Math.sin(elapsed * 4) * dt * 0.6;
          continue;
        }
        // Drift to the door, then step out into the maze.
        const dx = HOUSE_EXIT.x - ghost.x;
        const dy = HOUSE_EXIT.y - ghost.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08) {
          ghost.x = HOUSE_EXIT.x;
          ghost.y = HOUSE_EXIT.y;
          ghost.status = frightTimer > 0 ? 'fright' : 'normal';
          ghost.dir = Math.random() < 0.5 ? 'left' : 'right';
        } else {
          const stepLen = Math.min(GHOST_SPEED * dt, dist);
          ghost.x += (dx / dist) * stepLen;
          ghost.y += (dy / dist) * stepLen;
        }
        continue;
      }

      const speed =
        ghost.status === 'eyes' ? EYES_SPEED : ghost.status === 'fright' ? FRIGHT_SPEED : GHOST_SPEED;

      advance(ghost, speed * dt, true, chooseGhostDir);

      // Eyes reaching the door drop back into the house and re-enter play.
      if (ghost.status === 'eyes') {
        const t = tileOf(ghost);
        if (t.x === DOOR.x && t.y === DOOR.y) {
          ghost.status = 'house';
          ghost.releaseAt = 1.5;
          ghost.x = 9.5;
          ghost.y = 10.5;
          continue;
        }
      }

      /* ── Collision ── */
      if (Math.hypot(ghost.x - pac.x, ghost.y - pac.y) < 0.68) {
        if (ghost.status === 'fright') {
          ghostCombo += 1;
          const points = 200 * 2 ** (ghostCombo - 1);
          score += points;
          eatenAt = { x: ghost.x, y: ghost.y, points, life: 1 };
          ghost.status = 'eyes';
        } else if (ghost.status === 'normal') {
          loseLife();
          return;
        }
      }
    }
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
    setDirection,
    isWall: (x, y) => blocked(x, y, false),
    get state() {
      return state;
    },
    snapshot() {
      const total = pellets.length;
      const eaten = pellets.filter((p) => p.taken).length;
      return {
        state,
        pac,
        ghosts,
        pellets,
        walls,
        doors,
        rows,
        cols,
        score,
        lives,
        elapsed,
        eaten,
        total,
        mode: mode(),
        frightened: frightTimer > 0,
        frightEnding: frightTimer > 0 && frightTimer < 2,
        respawning: respawning > 0,
        eatenAt,
        lostReason,
      };
    },
  };
}
