/* ─────────────────────────────────────────────────────────────
   SECTIONS — hero hydration, about, achievements, skills, contact.
   All content comes from assets/js/data/.
   ───────────────────────────────────────────────────────────── */

import { $, h, raw, copy, toast } from './utils.js';
import { profile } from './data/profile.js';
import { visibleAchievements } from './data/achievements.js';
import { skillGroups } from './data/skills.js';
import { getProject } from './data/projects.js';

/* ══ HERO ══════════════════════════════════════════════════
   index.html carries the hero copy so it is in the HTML payload;
   this keeps profile.js authoritative if the two ever drift. */

export function renderHero() {
  $('.hero__label').textContent = profile.label;
  $('.hero__name').textContent = profile.name;
  $('#hero-headline').textContent = profile.headline;
  $('#hero-intro').textContent = profile.intro;
  $('.hero__portrait figcaption').textContent = profile.photo.caption;
  $('.hero__portrait img').alt = profile.photo.alt;

  const focus = $('#hero-focus');
  if (profile.currentFocus) focus.textContent = profile.currentFocus;
  else focus.remove();
}

/* ══ ABOUT ═════════════════════════════════════════════════ */

export function renderAbout() {
  const { about, education, interests } = profile;

  // No portrait here — it is in the hero, and running it twice on one page
  // reads as a template rather than a decision.
  $('#about-body').innerHTML = h`
    <div class="about__grid">
      <div class="reveal">
        ${about.map((para) => h`<p class="prose">${para}</p>`)}
      </div>

      <aside class="about__meta reveal">
        <p class="mono">Studying</p>
        <strong>${education.degree}</strong>
        <span>${education.institution}</span>
        <span class="mono" style="text-transform: none">${[education.period, education.detail].filter(Boolean).join(' · ')}</span>
      </aside>
    </div>

    <dl class="interests reveal">
      ${interests.map(
        (item) => h`
          <div>
            <dt>${item.title}</dt>
            <dd>${item.note}</dd>
          </div>`,
      )}
    </dl>
  `.toString();
}

/* ══ ACHIEVEMENTS ══════════════════════════════════════════ */

export function renderAchievements() {
  const items = visibleAchievements;
  const node = $('#achievements-body');

  if (!items.length) {
    node.innerHTML = '<p class="prose">Nothing confirmed to show yet.</p>';
    return;
  }

  node.innerHTML = h`
    <div class="timeline">
      ${items.map(
        (item) => h`
          <article class="timeline__item reveal">
            <div class="timeline__when">
              <p class="mono">${item.date}</p>
              <p class="mono" style="color: var(--ink-3)">${item.kind}</p>
            </div>
            <div>
              <h3>${item.title}</h3>
              <p class="timeline__org">${item.org}</p>
              <p>${item.body}</p>
              ${
                item.credential
                  ? h`<a class="timeline__cred" href="${item.credential}" target="_blank" rel="noopener noreferrer">
                        View evidence
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
                      </a>`
                  : ''
              }
            </div>
          </article>`,
      )}
    </div>
  `.toString();
}

/* ══ SKILLS ════════════════════════════════════════════════ */

export function renderSkills() {
  $('#skills-body').innerHTML = h`
    <div class="skills">
      ${skillGroups.map(
        (group, i) => h`
          <details class="reveal" ${raw(i === 0 ? 'open' : '')}>
            <summary>
              <h3>${group.title}</h3>
              <span class="mono">${group.items.length}</span>
            </summary>
            <div class="skills__body">
              <p class="skills__note">${group.note}</p>
              <div class="skills__items">
                ${group.items.map((item) => skillChip(item))}
              </div>
            </div>
          </details>`,
      )}
    </div>
  `.toString();
}

function skillChip(item) {
  const evidence = (item.evidence || []).map(getProject).filter(Boolean);

  if (!evidence.length) {
    return h`<span class="skill">${item.name}</span>`;
  }

  // Link to the first project that uses it; the count says how many there are.
  const first = evidence[0];
  return h`<a
    class="skill"
    href="#projects"
    data-project="${first.id}"
    title="Used in: ${evidence.map((p) => p.title).join(', ')}"
  >${item.name}<span class="skill__ev">${evidence.length}</span></a>`;
}

/* ══ CONTACT ═══════════════════════════════════════════════ */

export function renderContact() {
  const { links, contact } = profile;

  const rows = [];

  if (links.email) {
    rows.push({
      label: 'Email',
      value: links.email,
      act: 'Copy',
      kind: 'copy',
      href: `mailto:${links.email}`,
    });
  }
  if (links.github) {
    rows.push({ label: 'GitHub', value: links.github.replace(/^https?:\/\//, ''), act: 'Open', href: links.github });
  }
  if (links.linkedin) {
    rows.push({ label: 'LinkedIn', value: links.linkedin.replace(/^https?:\/\//, ''), act: 'Open', href: links.linkedin });
  }
  if (links.resume) {
    rows.push({ label: 'Résumé', value: 'Pravin-Anbalagan-Resume.pdf', act: 'Download', href: links.resume });
  }

  $('#contact-body').innerHTML = h`
    <h2 id="contact-h" class="reveal">${contact.headline}</h2>
    <p class="lead reveal" style="margin-top: var(--s-4)">${contact.body}</p>

    <div class="contact__links reveal">
      ${rows.map(
        (row) => h`
          <a
            class="contact__row"
            href="${row.href}"
            ${raw(row.kind === 'copy' ? '' : 'target="_blank" rel="noopener noreferrer"')}
            ${raw(row.kind === 'copy' ? `data-copy="${row.value}"` : '')}
          >
            <span class="label mono">${row.label}</span>
            <span class="value">${row.value}</span>
            <span class="act">${row.act}</span>
          </a>`,
      )}
    </div>
  `.toString();

  // Copy-email: intercept the click, fall back to mailto if the clipboard
  // is unavailable (insecure context, denied permission).
  $('#contact-body').addEventListener('click', async (event) => {
    const row = event.target.closest('[data-copy]');
    if (!row) return;
    event.preventDefault();
    const ok = await copy(row.dataset.copy);
    if (ok) toast(`Copied ${row.dataset.copy}`);
    else window.location.href = row.getAttribute('href');
  });
}
