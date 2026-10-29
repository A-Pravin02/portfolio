/* ─────────────────────────────────────────────────────────────
   INTERACTIONS — scroll reveals, section tracking, chrome.

   Deliberately small. There is no cursor-following glow, no custom
   cursor and no magnetic buttons: hover and press states carry the
   feedback instead, which survives touch and reduced motion intact.
   ───────────────────────────────────────────────────────────── */

import { $, $$, reducedMotion, isMac, goToSection } from './utils.js';

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
  const sections = ['#about', '#projects', '#achievements', '#skills', '#playground', '#contact']
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
