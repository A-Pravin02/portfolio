/* ─────────────────────────────────────────────────────────────
   TERMINAL — a simulated shell over the portfolio's own data.

   Every command is implemented here in local application code.
   Nothing executes on a machine, nothing is sent anywhere, and
   there is no server, secret or environment to expose.
   ───────────────────────────────────────────────────────────── */

import { $, h, esc, raw, copy, toast } from './utils.js';
import { profile } from './data/profile.js';
import { projects, getProject } from './data/projects.js';
import { skillGroups } from './data/skills.js';
import { visibleAchievements } from './data/achievements.js';

const out = () => $('#term-out');

let history = [];
let historyIndex = -1;
let booted = false;

/* ── Output helpers ───────────────────────────────────────── */

function write(markup, cls = '') {
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.innerHTML = markup instanceof Object ? markup.toString() : esc(markup);
  out().append(p);
}

function blank() {
  write(raw('&nbsp;'));
}

function scrollToEnd() {
  const node = out();
  node.scrollTop = node.scrollHeight;
}

const key = (text) => h`<span class="term__key">${text}</span>`;
const dim = (text) => h`<span class="term__dim">${text}</span>`;

/* ── Commands ─────────────────────────────────────────────── */

const commands = {
  help: {
    summary: 'List every command',
    run() {
      write(dim('Available commands —'));
      for (const [name, def] of Object.entries(commands)) {
        if (def.hidden) continue;
        write(h`  ${key(name.padEnd(13))}${def.summary}`);
      }
      blank();
      write(dim('Arrow Up / Down recalls history. Esc closes the terminal.'));
    },
  },

  about: {
    summary: 'Who I am and what I work on',
    run() {
      write(h`<span class="term__hl">${profile.name}</span> — ${profile.role}`);
      write(dim(`${profile.education.degree}, ${profile.education.institution} · ${profile.education.period}`));
      blank();
      profile.about.forEach((para) => {
        write(para);
        blank();
      });
      write(dim('Try `projects` next.'));
    },
  },

  projects: {
    summary: 'List the projects on this site',
    run() {
      write(dim(`${projects.length} projects —`));
      blank();
      projects.forEach((p) => {
        write(h`  ${key(p.id.padEnd(13))}${p.title} ${dim(`· ${p.year}`)}`);
        write(h`  ${raw('&nbsp;'.repeat(13))}${dim(p.tagline)}`);
      });
      blank();
      write(dim('Type a project id to open its write-up, e.g. `agentbridge`.'));
    },
  },

  agentbridge: {
    summary: 'Open the AgentBridge write-up',
    run: () => openProjectCommand('agentbridge'),
  },

  praxis: {
    summary: 'Open the PRAXIS write-up',
    run: () => openProjectCommand('praxis'),
  },

  footballgpt: { summary: 'Open the FootballGPT write-up', hidden: true, run: () => openProjectCommand('footballgpt') },
  face3d: { summary: 'Open the Deep3DFaceRecon write-up', hidden: true, run: () => openProjectCommand('face3d') },
  agrow: { summary: 'Open the Agrow write-up', hidden: true, run: () => openProjectCommand('agrow') },

  skills: {
    summary: 'Show the stack, grouped',
    run() {
      skillGroups.forEach((group) => {
        write(h`<span class="term__hl">${group.title}</span>`);
        write(h`  ${group.items.map((i) => i.name).join(', ')}`);
        blank();
      });
      write(dim('Counts next to a skill on the page link to the projects that used it.'));
    },
  },

  achievements: {
    summary: 'Show verified achievements only',
    run() {
      if (!visibleAchievements.length) return write(dim('Nothing confirmed to show.'));
      visibleAchievements.forEach((a) => {
        write(h`  ${dim(String(a.date).padEnd(14))}<span class="term__hl">${a.title}</span>`);
        write(h`  ${raw('&nbsp;'.repeat(14))}${dim(a.org)}`);
      });
      blank();
      write(dim('Unconfirmed entries are kept out of this list on purpose.'));
    },
  },

  contact: {
    summary: 'Show contact details',
    run() {
      const { links } = profile;
      if (links.email) write(h`  ${key('email    ')}${links.email}`);
      if (links.github) write(h`  ${key('github   ')}<a href="${links.github}" target="_blank" rel="noopener noreferrer">${links.github}</a>`);
      if (links.linkedin) write(h`  ${key('linkedin ')}<a href="${links.linkedin}" target="_blank" rel="noopener noreferrer">${links.linkedin}</a>`);
      if (links.resume) write(h`  ${key('resume   ')}<a href="${links.resume}" target="_blank" rel="noopener noreferrer">${links.resume}</a>`);
      blank();
      write(dim('`email` copies the address to your clipboard.'));
    },
  },

  email: {
    summary: 'Copy my email address',
    async run() {
      if (!profile.links.email) return write('No email address is configured.', 'term__err');
      const ok = await copy(profile.links.email);
      if (ok) {
        write(h`Copied ${key(profile.links.email)} to the clipboard.`);
        toast(`Copied ${profile.links.email}`);
      } else {
        write(h`Clipboard unavailable here. The address is ${key(profile.links.email)}`, 'term__dim');
      }
    },
  },

  github: {
    summary: 'Open my GitHub profile',
    run() {
      if (!profile.links.github) return write('No GitHub profile is configured.', 'term__err');
      write(h`Opening ${key(profile.links.github)} in a new tab…`);
      window.open(profile.links.github, '_blank', 'noopener,noreferrer');
    },
  },

  resume: {
    summary: 'Open my résumé',
    run() {
      if (!profile.links.resume) return write('No résumé is configured.', 'term__err');
      write(h`Opening ${key(profile.links.resume)}…`);
      window.open(profile.links.resume, '_blank', 'noopener,noreferrer');
    },
  },

  game: {
    summary: 'Launch System Override',
    run() {
      write(h`Booting ${key('SYSTEM OVERRIDE')}…`);
      close();
      setTimeout(() => document.dispatchEvent(new CustomEvent('portfolio:open', { detail: 'game' })), 180);
    },
  },

  whoami: {
    summary: 'A short answer',
    run() {
      write(h`${key('pravin')} — builds things to find out how they work.`);
    },
  },

  clear: {
    summary: 'Clear the output',
    run() {
      out().replaceChildren();
    },
  },

  exit: {
    summary: 'Close the terminal',
    run() {
      write(dim('Closing.'));
      setTimeout(close, 140);
    },
  },

  // Conveniences people reach for without thinking.
  ls: { summary: 'Alias for projects', hidden: true, run: () => commands.projects.run() },
  cat: { summary: 'Alias for about', hidden: true, run: () => commands.about.run() },
  sudo: {
    summary: '',
    hidden: true,
    run() {
      write('This terminal has no operating system behind it. Nothing to elevate.', 'term__dim');
    },
  },
};

function openProjectCommand(id) {
  const project = getProject(id);
  if (!project) return write(`No project with id "${id}".`, 'term__err');

  write(h`<span class="term__hl">${project.title}</span> ${dim(`· ${project.category}`)}`);
  write(project.summary);
  blank();
  if (project.links?.source) {
    write(h`  ${key('source  ')}<a href="${project.links.source}" target="_blank" rel="noopener noreferrer">${project.links.source}</a>`);
  }
  write(h`  ${key('status  ')}${project.status}`);
  blank();
  write(dim('Opening the full write-up…'));

  close();
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('portfolio:project', { detail: project.id }));
  }, 200);
}

/* ── Execution ────────────────────────────────────────────── */

async function execute(line) {
  const input = line.trim();
  write(h`<span class="term__echo">pravin@portfolio:~$ ${input}</span>`);

  if (!input) return;

  history = [input, ...history.filter((h2) => h2 !== input)].slice(0, 50);
  historyIndex = -1;

  const [name, ...args] = input.split(/\s+/);
  const command = commands[name.toLowerCase()];

  if (!command) {
    write(h`${name}: command not found. Type ${key('help')} for the list.`, 'term__err');
    return;
  }

  try {
    await command.run(args);
  } catch (error) {
    write(`Command failed: ${error.message}`, 'term__err');
  }
}

function boot() {
  if (booted) return;
  booted = true;

  write(h`<span class="term__hl">portfolio shell</span> ${dim('v1.0 — simulated, local, read-only')}`);
  write(dim(`Signed in as guest. ${profile.name}, ${profile.location}.`));
  blank();
  write(h`Type ${key('help')} to see what this understands.`);
  blank();
}

function close() {
  $('#terminal')?.close();
}

/* ── Init ─────────────────────────────────────────────────── */

export function initTerminal() {
  const dialog = $('#terminal');
  const form = $('#term-form');
  const input = $('#term-input');
  const quick = $('#term-quick');

  // Quick commands for touch, where typing is the friction.
  quick.innerHTML = h`${['help', 'about', 'projects', 'agentbridge', 'praxis', 'skills', 'contact', 'game'].map(
    (c) => h`<button class="chip" type="button" data-cmd="${c}">${c}</button>`,
  )}`.toString();

  quick.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cmd]');
    if (!button) return;
    await execute(button.dataset.cmd);
    scrollToEnd();
    input.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = '';
    await execute(value);
    scrollToEnd();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      historyIndex = Math.min(historyIndex + 1, history.length - 1);
      input.value = history[historyIndex];
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      historyIndex -= 1;
      if (historyIndex < 0) {
        historyIndex = -1;
        input.value = '';
      } else {
        input.value = history[historyIndex];
      }
    } else if (event.key === 'Tab') {
      // Complete against the command list.
      const partial = input.value.trim().toLowerCase();
      if (!partial) return;
      const match = Object.keys(commands).find((c) => c.startsWith(partial));
      if (match) {
        event.preventDefault();
        input.value = match;
      }
    }
  });

  // Clicking anywhere in the output should put the caret back.
  $('#term-out').addEventListener('click', (event) => {
    if (!event.target.closest('a')) input.focus();
  });

  dialog.addEventListener('close', () => {
    document.dispatchEvent(new CustomEvent('portfolio:closed', { detail: 'terminal' }));
  });

  return {
    open() {
      boot();
      if (!dialog.open) dialog.showModal();
      scrollToEnd();
      input.focus();
    },
  };
}
