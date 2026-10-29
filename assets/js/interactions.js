/* ─────────────────────────────────────────────────────────────
   INTERACTIONS — cursor, pointer light, parallax, magnetism,
   scroll reveals, section tracking, chrome.

   Everything pointer-driven writes to transforms or custom
   properties inside one rAF loop. Nothing here triggers layout,
   and all of it switches off for reduced motion or touch.
   ───────────────────────────────────────────────────────────── */

import { $, $$, clamp, lerp, reducedMotion, finePointer, isMac, goToSection } from './utils.js';

const CURSOR_LABELS = {
  project: 'Explore',
  play: 'Play',
  terminal: 'Shell',
};

/* ══ POINTER LAYER ═════════════════════════════════════════ */

export function initPointer() {
  if (!finePointer() || reducedMotion()) return;

  const cursor = $('#cursor');
  const label = $('#cursor-label');
  const light = $('#pointer-light');
  const layers = $$('.plx');

  // Target (raw pointer) and rendered (damped) positions.
  const target = { x: innerWidth / 2, y: innerHeight / 2 };
  const ring = { x: target.x, y: target.y };
  const glow = { x: target.x, y: target.y };
  let running = false;
  let mode = 'default';

  document.documentElement.classList.add('has-pointer');

  function onMove(event) {
    target.x = event.clientX;
    target.y = event.clientY;
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  function frame() {
    // Two damping rates: the ring tracks tightly, the light drifts.
    ring.x = lerp(ring.x, target.x, 0.22);
    ring.y = lerp(ring.y, target.y, 0.22);
    glow.x = lerp(glow.x, target.x, 0.05);
    glow.y = lerp(glow.y, target.y, 0.05);

    cursor.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
    light.style.setProperty('--px', `${glow.x}px`);
    light.style.setProperty('--py', `${glow.y}px`);

    // Hero parallax, driven by pointer offset from centre.
    const nx = (target.x / innerWidth - 0.5) * 2;
    const ny = (target.y / innerHeight - 0.5) * 2;
    for (const layer of layers) {
      const depth = Number(layer.dataset.depth || 0);
      layer.style.transform = `translate3d(${(-nx * depth).toFixed(2)}px, ${(-ny * depth * 0.55).toFixed(2)}px, 0)`;
    }

    const settled =
      Math.abs(ring.x - target.x) < 0.3 &&
      Math.abs(ring.y - target.y) < 0.3 &&
      Math.abs(glow.x - target.x) < 0.5 &&
      Math.abs(glow.y - target.y) < 0.5;

    if (settled) running = false;
    else requestAnimationFrame(frame);
  }

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    cursor.dataset.mode = next;
    label.textContent = CURSOR_LABELS[next] || '';
  }

  function onOver(event) {
    const node = event.target instanceof Element ? event.target : null;
    if (!node) return;
    const tagged = node.closest('[data-cursor]');
    if (tagged) return setMode(tagged.dataset.cursor);
    if (node.closest('a, button, summary, input, label, [role="button"], .gnode')) {
      return setMode('interactive');
    }
    setMode('default');
  }

  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerover', onOver, { passive: true });
  addEventListener('pointerleave', () => cursor.style.setProperty('opacity', '0'));
  addEventListener('pointerenter', () => cursor.style.removeProperty('opacity'));
}

/* ══ MAGNETIC BUTTONS ══════════════════════════════════════
   Translation only, so nothing in the layout moves. */

export function initMagnetic() {
  if (!finePointer() || reducedMotion()) return;

  for (const el of $$('[data-magnetic]')) {
    let frameId = 0;
    let tx = 0;
    let ty = 0;

    const settle = () => {
      frameId = 0;
      el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    };

    const schedule = () => {
      if (!frameId) frameId = requestAnimationFrame(settle);
    };

    el.addEventListener(
      'pointermove',
      (event) => {
        const r = el.getBoundingClientRect();
        // Pull is strongest at the edges, capped so the control never
        // travels far enough to escape the pointer.
        tx = clamp((event.clientX - (r.left + r.width / 2)) * 0.22, -10, 10);
        ty = clamp((event.clientY - (r.top + r.height / 2)) * 0.3, -7, 7);
        el.style.transition = 'transform 90ms linear';
        schedule();
      },
      { passive: true },
    );

    el.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
      el.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
      schedule();
    });
  }
}

/* ══ SCROLL REVEALS ════════════════════════════════════════
   IntersectionObserver rather than scroll-driven CSS: these must
   work in Firefox, which has no view() timeline support. */

export function initReveals(root = document) {
  const nodes = $$('.reveal:not(.is-in)', root);
  if (!nodes.length) return;

  if (reducedMotion() || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.06 },
  );

  nodes.forEach((n, i) => {
    n.style.transitionDelay = `${Math.min(i % 6, 5) * 55}ms`;
    io.observe(n);
  });

  // Safety net. Observer callbacks only run while the page is being
  // rendered, so a tab that loads in the background can end up with
  // content still at opacity 0. Hidden content is worse than no
  // animation, so sweep anything that is geometrically in view.
  const sweep = () => {
    for (const node of nodes) {
      if (node.classList.contains('is-in')) continue;
      const rect = node.getBoundingClientRect();
      if (rect.top < innerHeight && rect.bottom > 0) {
        node.classList.add('is-in');
        io.unobserve(node);
      }
    }
  };

  setTimeout(sweep, 1800);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(sweep, 200);
  });
}

/* ══ SECTION TRACKING + CHROME ═════════════════════════════ */

export function initChrome() {
  const topbar = $('#topbar');
  const toTop = $('#to-top');
  const navLinks = $$('#topnav a, #drawer a[href^="#"]');

  // Sticky bar + back-to-top, from a sentinel rather than a scroll listener.
  const sentinel = document.createElement('div');
  // 120px tall: it stops intersecting once the page has scrolled past it.
  sentinel.style.cssText = 'position:absolute;top:0;height:120px;width:1px;pointer-events:none;';
  document.body.prepend(sentinel);

  new IntersectionObserver(([entry]) => {
    const scrolled = !entry.isIntersecting;
    topbar.classList.toggle('is-stuck', scrolled);
    toTop.classList.toggle('is-on', scrolled);
  }).observe(sentinel);

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    $('.skip-link')?.focus({ preventScroll: true });
  });

  // Active section in the nav.
  const sections = ['#about', '#projects', '#achievements', '#skills', '#contact']
    .map((id) => document.querySelector(id))
    .filter(Boolean);

  if (sections.length) {
    const seen = new Map();
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.intersectionRatio);
        let best = null;
        let bestRatio = 0;
        for (const [id, ratio] of seen) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        for (const link of navLinks) {
          link.setAttribute('aria-current', String(link.getAttribute('href') === `#${best}`));
        }
      },
      { threshold: [0, 0.15, 0.35, 0.6, 0.9] },
    );
    sections.forEach((s) => spy.observe(s));
  }

  // Mobile drawer.
  const drawer = $('#drawer');
  const openBtn = $('#drawer-open');
  const closeDrawer = () => {
    drawer.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.focus();
  };

  openBtn.addEventListener('click', () => {
    drawer.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    drawer.querySelector('a')?.focus();
  });

  $('#drawer-close').addEventListener('click', closeDrawer);
  drawer.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeDrawer();
  });
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !drawer.hidden) closeDrawer();
  });

  // In-page anchors: keep the hash in sync without jumping.
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    if (hash === '#' || link.dataset.open) return;
    if (goToSection(hash)) event.preventDefault();
  });

  // Correct key hint for the platform.
  const key = $('#palette-key');
  if (key && isMac()) key.textContent = '⌘ K';

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
}

/* ══ LOCAL CLOCK ═══════════════════════════════════════════ */

export function initClock(timeZone) {
  const node = $('#hero-clock');
  if (!node) return;

  const fmt = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
    hour12: false,
  });

  const tick = () => {
    node.textContent = fmt.format(new Date());
  };

  tick();
  setInterval(tick, 20_000);
}
