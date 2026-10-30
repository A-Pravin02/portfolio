/* ─────────────────────────────────────────────────────────────
   PROJECT SHOWCASE — editorial spreads for the featured work,
   a shared detail dialog, and the visual slot each one carries.
   ───────────────────────────────────────────────────────────── */

import { $, h, raw } from './utils.js';
import { projects, featuredProjects, archiveProjects, getProject } from './data/projects.js';
import { mountPipeline } from './agentbridge.js';
import { mountReasoning } from './praxis.js';

const ARROW = raw(
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
);

export function renderProjects() {
  // The homepage carries cards only. The case study behind each card holds
  // the architecture, the decisions, the limitations and — for the two
  // that have one — the interactive demo.
  $('#projects-body').innerHTML = h`
    <div class="cards">
      ${featuredProjects.map((project, i) => card(project, i))}
    </div>

    ${
      archiveProjects.length
        ? h`<p class="cards__more reveal">
              Also built —
              ${archiveProjects.map(
                (project, i) =>
                  h`${raw(i ? ', ' : ' ')}<button class="linkish" data-project="${project.id}">${project.title}</button>`,
              )}.
            </p>`
        : ''
    }
  `.toString();

  wireDetailDialog();
}

/* ══ PROJECT CARD ══════════════════════════════════════════
   The first card is wide and leads the section; the rest sit beside
   it. Same parts throughout, different weight. */

function card(project, index) {
  const lead = index === 0;

  return h`
    <article class="card ${lead ? 'card--lead' : ''} reveal" id="project-${project.id}">
      <button class="card__hit" data-project="${project.id}" aria-labelledby="card-h-${project.id}">
        <span class="visually-hidden">View case study: ${project.title}</span>
      </button>

      <div class="card__visual">${cardVisual(project)}</div>

      <div class="card__body">
        <p class="mono card__index">Project ${String(index + 1).padStart(2, '0')}</p>
        <h3 class="card__title" id="card-h-${project.id}">${project.title}</h3>
        <p class="card__desc">${project.cardLine || project.question}</p>

        <ul class="card__tags">
          ${project.tech.slice(0, 4).map((t) => h`<li class="tag">${t}</li>`)}
        </ul>

        <div class="card__actions">
          <span class="card__cta">View project ${ARROW}</span>
          ${project.links?.source ? h`<a class="card__link" href="${project.links.source}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''}
          ${project.links?.demo ? h`<a class="card__link" href="${project.links.demo}" target="_blank" rel="noopener noreferrer">Live demo</a>` : ''}
        </div>
      </div>
    </article>
  `;
}

/* A screenshot where one exists, otherwise the project's own pipeline
   rendered as a diagram — never a fabricated product shot. */
function cardVisual(project) {
  if (project.image) {
    return h`<img
      src="${project.image.src}"
      alt="${project.image.alt}"
      width="1024"
      height="1024"
      loading="lazy"
      decoding="async"
    />`;
  }

  const stages = project.pipeline || project.nodes;
  if (!stages) return '';

  // Labels only at card size — the code identifiers were being truncated,
  // and they belong with the stage detail in the case study anyway.
  return h`<ol class="card__flow" aria-label="Architecture stages">
    ${stages.map(
      (stage, i) =>
        h`<li><span class="mono">${String(i + 1).padStart(2, '0')}</span>${stage.label}</li>`,
    )}
  </ol>`;
}

function sourceLink(project) {
  if (!project.links?.source) return '';
  return h`<a class="btn" href="${project.links.source}" target="_blank" rel="noopener noreferrer">
    Source ${ARROW}
  </a>`;
}

function demoLink(project) {
  if (!project.links?.demo) return '';
  return h`<a class="btn" href="${project.links.demo}" target="_blank" rel="noopener noreferrer">
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

  // The demos live in the case study now, so they mount on open and are
  // built fresh each time — no stale timers from a previous viewing.
  const host = document.getElementById(`demo-${project.id}`);
  if (host) {
    if (project.demo === 'pipeline') mountPipeline(host, project);
    if (project.demo === 'reasoning') mountReasoning(host, project);
  }

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
    ${
      project.demo
        ? h`<div class="detail__block detail__block--wide">
              <h4>Explore it</h4>
              <div id="demo-${project.id}"></div>
            </div>`
        : ''
    }
    ${project.pipeline && !project.demo ? pipelineStrip(project) : ''}
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

