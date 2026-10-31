/* ─────────────────────────────────────────────────────────────
   BOOTSTRAP — renders the page from data, then wires the
   interaction layer, the overlays and the keyboard shortcuts.
   ───────────────────────────────────────────────────────────── */

import { $, $$ } from './utils.js';
import { profile } from './data/profile.js';
import { renderHero, renderAbout, renderContact } from './sections.js';
import { renderProjects, openProject, openFromHash } from './projects-view.js';
import { initReveals, initChrome } from './interactions.js';
import { initTerminal } from './terminal.js';
import { initPalette } from './palette.js';
import { initGame, mountPreview } from './game/view.js';
import { mountHeroField } from './hero-field.js';
import { mountTicker } from './ticker.js';

// Marks that scripting is available, so the reveal styles can apply.
document.documentElement.classList.add('js');

function boot() {
  /* ── Content ──────────────────────────────────────────── */
  renderHero();
  mountHeroField($('#hero-field'));
  mountTicker($('#ticker-track'));
  renderAbout();
  renderProjects();
  renderContact();

  /* ── Interaction layer ────────────────────────────────── */
  initChrome();
  initReveals();

  /* ── Overlays ─────────────────────────────────────────── */
  const terminal = initTerminal();
  const game = initGame();
  mountPreview($('#game-preview'));
  const palette = initPalette({
    openTerminal: terminal.open,
    openGame: game.open,
    openProject,
  });

  const openers = { terminal: terminal.open, game: game.open, palette: palette.open };

  // Any control can request an overlay with data-open="…".
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-open]');
    if (!trigger) return;
    event.preventDefault();
    openers[trigger.dataset.open]?.();
  });

  // Close buttons inside dialogs.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-close]');
    if (!trigger) return;
    const dialog = trigger.closest('dialog');
    if (!dialog) return;
    if (dialog.matches(':popover-open')) dialog.hidePopover();
    else dialog.close();
  });

  // The terminal and the palette ask for things via events rather than
  // importing each other.
  document.addEventListener('portfolio:open', (event) => openers[event.detail]?.());
  document.addEventListener('portfolio:project', (event) => openProject(event.detail));

  /* ── Keyboard ─────────────────────────────────────────── */
  addEventListener('keydown', (event) => {
    const palKey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (palKey) {
      event.preventDefault();
      palette.open();
      return;
    }

    // `/` focuses the palette, but never while the caret is in a field.
    const typing = event.target.closest?.('input, textarea, [contenteditable]');
    if (event.key === '/' && !typing) {
      event.preventDefault();
      palette.open();
    }
  });

  /* ── Deep links ───────────────────────────────────────── */
  openFromHash();
  addEventListener('hashchange', openFromHash);

  /* ── closedby fallback ────────────────────────────────────
     Safari has no `closedby`, so click-outside is lost there.
     Test the pointer position rather than event.target: the dialog is
     also the target for its own padding and the gaps between children. */
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (event, dialog) => {
      const r = dialog.getBoundingClientRect();
      return (
        event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom
      );
    };

    for (const dialog of $$('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (event) => {
        pressedOutside = outside(event, dialog);
      });
      // Require press and release outside, so a selection drag ending on
      // the backdrop does not dismiss the dialog.
      dialog.addEventListener('pointerup', (event) => {
        if (pressedOutside && outside(event, dialog)) dialog.close();
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
