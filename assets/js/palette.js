/* ─────────────────────────────────────────────────────────────
   COMMAND PALETTE — Ctrl/Cmd+K. Jumps to sections, opens project
   write-ups, and launches the terminal and the game.
   ───────────────────────────────────────────────────────────── */

import { $, h, goToSection } from './utils.js';
import { projects } from './data/projects.js';
import { profile } from './data/profile.js';

export function initPalette({ openTerminal, openGame, openProject }) {
  const dialog = $('#palette');
  const input = $('#pal-input');
  const list = $('#pal-list');

  const items = [
    { label: 'Home', kind: 'section', run: () => goToSection('#top') },
    { label: 'About', kind: 'section', run: () => goToSection('#about') },
    { label: 'Projects', kind: 'section', run: () => goToSection('#projects') },
    { label: 'Achievements', kind: 'section', run: () => goToSection('#achievements') },
    { label: 'Skills', kind: 'section', run: () => goToSection('#skills') },
    { label: 'Contact', kind: 'section', run: () => goToSection('#contact') },

    ...projects.map((p) => ({
      label: p.title,
      hint: p.category,
      kind: 'project',
      run: () => openProject(p.id),
    })),

    { label: 'Open terminal', hint: 'Simulated shell', kind: 'command', run: openTerminal },
    { label: 'Play Maze Override', hint: 'Pellets, ghosts, three lives', kind: 'command', run: openGame },
  ];

  if (profile.links.github) {
    items.push({
      label: 'GitHub profile',
      hint: profile.links.github.replace(/^https?:\/\//, ''),
      kind: 'link',
      run: () => window.open(profile.links.github, '_blank', 'noopener,noreferrer'),
    });
  }
  if (profile.links.resume) {
    items.push({
      label: 'Résumé',
      hint: 'PDF',
      kind: 'link',
      run: () => window.open(profile.links.resume, '_blank', 'noopener,noreferrer'),
    });
  }

  let matches = items;
  let active = 0;

  function score(item, query) {
    const haystack = `${item.label} ${item.hint || ''} ${item.kind}`.toLowerCase();
    return haystack.includes(query) ? haystack.indexOf(query) : -1;
  }

  function render() {
    if (!matches.length) {
      list.innerHTML = '<p class="pal__empty">Nothing matches that.</p>';
      return;
    }

    list.innerHTML = h`${matches.map(
      (item, i) => h`
        <button
          class="pal__item"
          type="button"
          role="option"
          id="pal-opt-${i}"
          aria-selected="${i === active ? 'true' : 'false'}"
          data-active="${i === active ? 'true' : 'false'}"
          data-index="${i}"
        >
          <span>
            ${item.label}
            ${item.hint ? h`<br /><span class="mono" style="text-transform: none">${item.hint}</span>` : ''}
          </span>
          <span class="pal__kind">${item.kind}</span>
        </button>`,
    )}`.toString();

    input.setAttribute('aria-activedescendant', `pal-opt-${active}`);
    list.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  function filter(query) {
    const q = query.trim().toLowerCase();
    matches = q ? items.filter((i) => score(i, q) >= 0).sort((a, b) => score(a, q) - score(b, q)) : items;
    active = 0;
    render();
  }

  function run(index) {
    const item = matches[index];
    if (!item) return;
    close();
    // Let the palette finish closing before anything else takes the top layer.
    setTimeout(() => item.run(), 60);
  }

  function open() {
    input.value = '';
    filter('');
    if (!dialog.matches(':popover-open')) dialog.showPopover();
    input.focus();
  }

  function close() {
    if (dialog.matches(':popover-open')) dialog.hidePopover();
  }

  input.addEventListener('input', () => filter(input.value));

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = (active + 1) % Math.max(matches.length, 1);
      render();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = (active - 1 + matches.length) % Math.max(matches.length, 1);
      render();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(active);
    } else if (event.key === 'Escape') {
      close();
    }
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-index]');
    if (button) run(Number(button.dataset.index));
  });

  list.addEventListener('pointermove', (event) => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (index !== active) {
      active = index;
      render();
    }
  });

  return { open, close };
}
