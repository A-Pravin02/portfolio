/* ─────────────────────────────────────────────────────────────
   PROJECT SHOWCASE — editorial spreads for the featured work,
   a shared detail dialog, and the visual slot each one carries.
   ───────────────────────────────────────────────────────────── */

import { $, h, raw } from './utils.js';
import { projects, featuredProjects, getProject } from './data/projects.js';
import { mountPipeline } from './agentbridge.js';
import { mountReasoning } from './praxis.js';

const ARROW = raw(
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
);

export function renderProjects() {
  // Every project gets the same editorial spread. The two with demos get an
  // interactive panel in the visual slot; the rest get their screenshot
  // there — but the same heading, summary, tech and actions.
  $('#projects-body').innerHTML = h`${projects.map((project) => spread(project))}`.toString();

  // Mount the interactive demos into their placeholders.
  for (const project of featuredProjects) {
    const host = document.getElementById(`demo-${project.id}`);
    if (!host) continue;
    if (project.demo === 'pipeline') mountPipeline(host, project);
    if (project.demo === 'reasoning') mountReasoning(host, project);
  }

  wireDetailDialog();
}

/* ══ FEATURED SPREAD ═══════════════════════════════════════ */

function spread(project) {
  return h`
    <article class="spread" id="project-${project.id}">
      <div class="spread__head reveal">
        <div>
          <p class="mono">${project.category}</p>
          <h3 class="spread__title">${project.title}</h3>
          <p class="spread__tagline">${project.tagline}</p>
        </div>

        <div>
          <p class="prose">${project.summary}</p>
          ${project.note ? h`<p class="mono" style="margin-top: var(--s-3); text-transform: none">${project.note}</p>` : ''}
          <div class="spread__meta">
            ${project.tech.map((t) => h`<span class="tag">${t}</span>`)}
          </div>
          <div class="spread__actions">
            <button class="btn btn--accent" data-project="${project.id}" data-cursor="project" data-magnetic>
              Read the write-up
            </button>
            ${sourceLink(project)}
            ${demoLink(project)}
          </div>
          <p class="mono" style="margin-top: var(--s-4); text-transform: none">Status — ${project.status}</p>
        </div>
      </div>

      ${project.demo ? h`<div id="demo-${project.id}" class="reveal"></div>` : visual(project)}
    </article>
  `;
}

/* The visual slot for a project without an interactive demo. */
function visual(project) {
  if (!project.image) {
    return project.pipeline
      ? h`<ul class="flow reveal" style="margin-top: var(--s-5)">
            ${project.pipeline.map((stage) => h`<li>${stage.label}</li>`)}
          </ul>`
      : '';
  }

  return h`
    <figure class="spread__visual reveal">
      <img
        src="${project.image.src}"
        alt="${project.image.alt}"
        width="1024"
        height="1024"
        loading="lazy"
        decoding="async"
      />
      ${
        project.pipeline
          ? h`<figcaption>
                <ul class="flow" style="margin: 0">
                  ${project.pipeline.map((stage) => h`<li>${stage.label}</li>`)}
                </ul>
              </figcaption>`
          : ''
      }
    </figure>`;
}

function sourceLink(project) {
  if (!project.links?.source) return '';
  return h`<a class="btn" href="${project.links.source}" target="_blank" rel="noopener noreferrer" data-magnetic>
    Source ${ARROW}
  </a>`;
}

function demoLink(project) {
  if (!project.links?.demo) return '';
  return h`<a class="btn" href="${project.links.demo}" target="_blank" rel="noopener noreferrer" data-magnetic>
    Live demo ${ARROW}
  </a>`;
}

/* ══ DETAIL DIALOG ═════════════════════════════════════════ */

function wireDetailDialog() {
  const dialog = $('#project-detail');

  // One delegated handler for every entry point: spreads,
  // skill chips, the palette and the terminal all dispatch through here.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-project]');
    if (!trigger) return;
    event.preventDefault();
    openProject(trigger.dataset.project);
  });

  dialog.addEventListener('close', () => {
    // Drop the deep link when the dialog is dismissed.
    if (location.hash.startsWith('#project-')) history.replaceState(null, '', location.pathname);
  });
}

export function openProject(id) {
  const project = getProject(id);
  if (!project) return;

  const dialog = $('#project-detail');
  $('#detail-kicker').textContent = project.category;
  $('#detail-title').textContent = project.title;
  $('#detail-body').innerHTML = detailMarkup(project).toString();

  if (!dialog.open) dialog.showModal();
  $('#detail-body').scrollTop = 0;
  history.replaceState(null, '', `#project-${project.id}`);
}

function detailMarkup(project) {
  const d = project.details || {};

  return h`
    <div class="detail__hero">
      <p class="mono">${project.year} · ${project.status}</p>
      <h3>${project.title}</h3>
      <p class="spread__tagline">${project.tagline}</p>
    </div>

    ${
      project.image
        ? h`<figure class="detail__img" style="margin: 0 0 var(--s-6)">
              <img
                src="${project.image.src}"
                alt="${project.image.alt}"
                width="1024"
                height="1024"
                loading="lazy"
                decoding="async"
              />
            </figure>`
        : ''
    }

    ${block('Problem', d.problem)}
    ${block('Architecture', d.architecture)}
    ${project.pipeline && !project.featured ? pipelineStrip(project) : ''}
    ${list('Security design', d.security)}
    ${list('Engineering decisions', d.decisions)}
    ${block('Challenges', d.challenges)}
    ${evaluation(d.evaluation)}
    ${list('Verified outcomes', d.verified, 'ok')}
    ${list('Current limitations', d.limitations, 'warn')}

    <div class="detail__block">
      <h4>Technologies</h4>
      <div class="spread__meta" style="margin: 0">
        ${project.tech.map((t) => h`<span class="tag">${t}</span>`)}
      </div>
    </div>

    <div class="detail__actions">
      ${sourceLink(project)}
      ${demoLink(project)}
      <button class="btn btn--ghost" data-close>Close</button>
    </div>
  `;
}

function block(title, body) {
  if (!body) return '';
  return h`
    <div class="detail__block">
      <h4>${title}</h4>
      <p>${body}</p>
    </div>`;
}

function list(title, items, tone) {
  if (!items?.length) return '';
  const cls = tone ? `detail__list detail__list--${tone}` : 'detail__list';
  return h`
    <div class="detail__block">
      <h4>${title}</h4>
      <ul class="${cls}">
        ${items.map((item) => h`<li>${item}</li>`)}
      </ul>
    </div>`;
}

function pipelineStrip(project) {
  return h`
    <div class="detail__block">
      <h4>Pipeline</h4>
      <ul class="flow" style="margin: 0">
        ${project.pipeline.map((stage) => h`<li>${stage.label}</li>`)}
      </ul>
    </div>`;
}

function evaluation(evalData) {
  if (!evalData?.rows?.length) return '';

  const worst = Math.max(...evalData.rows.map((r) => r.hallucination));

  return h`
    <div class="detail__block">
      <h4>Evaluation</h4>
      <div>
        <p>${evalData.method}</p>
        <table class="evaltable">
          <caption>Measured results — higher accuracy and coverage is better, lower hallucination is better</caption>
          <thead>
            <tr>
              <th scope="col">System</th>
              <th scope="col">Accuracy</th>
              <th scope="col">Hallucination</th>
              <th scope="col">Coverage</th>
            </tr>
          </thead>
          <tbody>
            ${evalData.rows.map(
              (row) => h`
                <tr class="${row.highlight ? 'is-ours' : ''}">
                  <th scope="row" style="font-weight: 400">${row.system}</th>
                  <td>${row.accuracy.toFixed(3)}</td>
                  <td>
                    ${row.hallucination.toFixed(3)}
                    <span class="bar" aria-hidden="true"><i style="width: ${Math.round((row.hallucination / worst) * 100)}%"></i></span>
                  </td>
                  <td>${row.coverage.toFixed(3)}</td>
                </tr>`,
            )}
          </tbody>
        </table>
        ${
          evalData.caveats?.length
            ? h`<ul class="detail__list detail__list--warn" style="margin-top: var(--s-5)">
                  ${evalData.caveats.map((c) => h`<li>${c}</li>`)}
                </ul>`
            : ''
        }
      </div>
    </div>`;
}

/* Open a project from a #project-<id> URL on load. */
export function openFromHash() {
  const match = location.hash.match(/^#project-([\w-]+)$/);
  if (!match) return;
  const project = getProject(match[1]);
  if (!project) return;
  // Every project has its own place on the page now, so scroll to it.
  document.getElementById(`project-${project.id}`)?.scrollIntoView({ block: 'start' });
}

