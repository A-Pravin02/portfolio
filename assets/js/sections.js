/* ─────────────────────────────────────────────────────────────
   SECTIONS — hero, about, contact.

   The homepage is meant to be read in under a minute, so About
   carries the education, the stack and the record as three compact
   blocks rather than three separate sections.
   ───────────────────────────────────────────────────────────── */

import { $, h, raw, copy, toast } from './utils.js';
import { profile } from './data/profile.js';
import { visibleAchievements } from './data/achievements.js';
import { skillGroups } from './data/skills.js';

const ARROW = raw(
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
);

/* ══ HERO ══════════════════════════════════════════════════
   index.html carries the hero copy so it is in the HTML payload;
   this keeps profile.js authoritative if the two ever drift. */

export function renderHero() {
  $('.hero__name').textContent = profile.name;
  $('.hero__label').textContent = profile.role;
  $('#hero-headline').textContent = profile.headline;
  $('#hero-intro').textContent = profile.intro;
  $('.hero__portrait img').alt = profile.photo.alt;

  const { links } = profile;
  const rows = [];
  if (links.github) rows.push({ label: 'GitHub', href: links.github, external: true });
  if (links.linkedin) rows.push({ label: 'LinkedIn', href: links.linkedin, external: true });
  if (links.email) rows.push({ label: 'Email', href: `mailto:${links.email}`, external: false });

  $('#hero-links').innerHTML = h`${rows.map(
    (row) => h`<li>
      <a href="${row.href}" ${raw(row.external ? 'target="_blank" rel="noopener noreferrer"' : '')}>
        ${row.label}${raw(row.external ? ARROW.value : '')}
      </a>
    </li>`,
  )}`.toString();
}

/* ══ ABOUT ═════════════════════════════════════════════════ */

export function renderAbout() {
  const { about, education } = profile;

  $('#about-body').innerHTML = h`
    <div class="about">
      <div class="about__lede reveal">
        ${about.map((para) => h`<p class="lead">${para}</p>`)}

        <p class="about__edu">
          <span class="mono">Education</span>
          ${education.degree}, ${education.institution}
          <span class="mono about__edu-when">${[education.period, education.detail]
            .filter(Boolean)
            .join(' · ')}</span>
        </p>
      </div>

      <div class="about__cols">
        <section class="about__block reveal" aria-labelledby="stack-h">
          <h3 id="stack-h">What I work with.</h3>
          <dl class="stack">
            ${skillGroups.map(
              (group) => h`
                <div>
                  <dt class="mono">${group.title}</dt>
                  <dd>${group.items.join(' · ')}</dd>
                </div>`,
            )}
          </dl>
        </section>

        <section class="about__block reveal" aria-labelledby="record-h">
          <h3 id="record-h">Achievements &amp; research.</h3>
          ${record()}
        </section>
      </div>
    </div>
  `.toString();
}

function record() {
  if (!visibleAchievements.length) {
    return h`<p class="prose">Nothing confirmed to show yet.</p>`;
  }

  return h`
    <ul class="record">
      ${visibleAchievements.map(
        (item) => h`
          <li>
            <span class="mono record__when">${item.date}</span>
            <span class="record__what">
              ${
                item.credential
                  ? h`<a href="${item.credential}" target="_blank" rel="noopener noreferrer">${item.title}${ARROW}</a>`
                  : item.title
              }
              <span class="record__org">${item.org}</span>
            </span>
          </li>`,
      )}
    </ul>`;
}

/* ══ CONTACT ═══════════════════════════════════════════════ */

export function renderContact() {
  const { links, contact } = profile;

  const rows = [];
  if (links.email) {
    rows.push({ label: 'Email', value: links.email, act: 'Copy', kind: 'copy', href: `mailto:${links.email}` });
  }
  if (links.linkedin) {
    rows.push({ label: 'LinkedIn', value: links.linkedin.replace(/^https?:\/\/(www\.)?/, ''), act: 'Open', href: links.linkedin });
  }
  if (links.github) {
    rows.push({ label: 'GitHub', value: links.github.replace(/^https?:\/\//, ''), act: 'Open', href: links.github });
  }
  if (links.resume) {
    rows.push({ label: 'Résumé', value: 'Pravin-Anbalagan-Resume.pdf', act: 'Download', href: links.resume });
  }

  // The heading lives in the section head like every other section's,
  // so all four share one left edge.
  $('#contact-h').textContent = contact.headline;

  $('#contact-body').innerHTML = h`
    <p class="lead reveal">${contact.body}</p>

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
