/* ─────────────────────────────────────────────────────────────
   PRAXIS — interactive architecture diagram and a walkthrough of
   a query moving through it.

   The walkthrough checks claims against the small rule set and
   record set stated alongside it, so every verdict shown can be
   followed by hand. It is an illustration of the system's
   behaviour, not a live call into the research code.
   ───────────────────────────────────────────────────────────── */

import { h, reducedMotion } from './utils.js';

const NODE_W = 236;
const NODE_H = 58;
const GAP = 30;
const PAD = 14;

const KIND_LABEL = {
  io: 'interface',
  neural: 'learned',
  symbolic: 'deterministic',
  gate: 'gate',
};

export function mountReasoning(host, project) {
  const nodes = project.nodes;
  const { rules, records, cases } = project.walkthrough;

  const height = nodes.length * NODE_H + (nodes.length - 1) * GAP + PAD * 2;
  const width = NODE_W + PAD * 2;

  host.innerHTML = h`
    <div class="graph">
      <div>
        <p class="mono" style="margin-bottom: var(--s-3)">Architecture — select a component</p>
        <svg
          class="graph__svg"
          viewBox="0 0 ${width} ${height}"
          role="group"
          aria-label="PRAXIS architecture: query, neural encoder, symbolic reasoner, verification, release"
        >
          <g data-edges>
            ${nodes.slice(0, -1).map((node, i) => {
              const y = PAD + i * (NODE_H + GAP) + NODE_H;
              return h`<path class="gedge" data-edge="${node.id}" d="M ${width / 2} ${y} L ${width / 2} ${y + GAP}" />
                       <path class="gedge" data-edge-head="${node.id}" d="M ${width / 2 - 4} ${y + GAP - 6} L ${width / 2} ${y + GAP} L ${width / 2 + 4} ${y + GAP - 6}" />`;
            })}
          </g>

          ${nodes.map((node, i) => {
            const y = PAD + i * (NODE_H + GAP);
            return h`
              <g
                class="gnode"
                data-node="${node.id}"
                data-kind="${node.kind}"
                role="button"
                tabindex="0"
                aria-pressed="${i === 0 ? 'true' : 'false'}"
                aria-label="${node.label}"
              >
                <rect x="${PAD}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="3" />
                <text x="${PAD + 16}" y="${y + 25}">${node.label}</text>
                <text class="gkind" x="${PAD + 16}" y="${y + 42}">${KIND_LABEL[node.kind] || node.kind}</text>
              </g>`;
          })}
        </svg>
      </div>

      <div class="pipe__side">
        <div class="panel">
          <div class="panel__bar"><p class="mono">Component</p></div>
          <div class="panel__body" data-node-detail></div>
        </div>

        <div class="panel">
          <div class="panel__bar">
            <p class="mono">Walkthrough</p>
            <span class="verdict" data-verdict hidden></span>
          </div>
          <div class="panel__body">
            <div class="chips" role="group" aria-label="Example queries">
              ${cases.map(
                (c, i) => h`
                  <button class="chip" type="button" data-case="${c.id}" aria-pressed="${i === 0 ? 'true' : 'false'}">
                    ${c.verdict.toLowerCase()}
                  </button>`,
              )}
            </div>
            <dl class="kv" data-case-detail></dl>
            <div class="game__actions" style="justify-content: flex-start">
              <button class="btn btn--primary" type="button" data-trace>Trace the query</button>
            </div>
          </div>
        </div>

        <details class="panel" style="padding: 0">
          <summary class="panel__bar" style="cursor: pointer; list-style: none">
            <p class="mono">Rule set and records used above</p>
          </summary>
          <div class="panel__body">
            <ul class="detail__list">
              ${rules.map((r) => h`<li class="mono" style="text-transform: none; letter-spacing: 0.02em">${r}</li>`)}
            </ul>
            <ul class="detail__list" style="border-top: 1px dashed var(--line); padding-top: var(--s-4)">
              ${records.map((r) => h`<li class="mono" style="text-transform: none; letter-spacing: 0.02em">${r}</li>`)}
            </ul>
          </div>
        </details>

        <p class="sim-note">
          Illustration of the system's behaviour against the stated rules and records. The published
          benchmark numbers are in the write-up.
        </p>
      </div>
    </div>
  `.toString();

  const nodeEls = Array.from(host.querySelectorAll('[data-node]'));
  const edgeEls = Array.from(host.querySelectorAll('.gedge'));
  const nodeDetail = host.querySelector('[data-node-detail]');
  const caseDetail = host.querySelector('[data-case-detail]');
  const verdictEl = host.querySelector('[data-verdict]');
  const liveRegion = document.createElement('p');
  liveRegion.className = 'visually-hidden';
  liveRegion.setAttribute('role', 'status');
  host.append(liveRegion);

  let activeCase = cases[0];
  let timers = [];

  function showNode(id) {
    const node = nodes.find((n) => n.id === id);
    nodeEls.forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.node === id)));

    nodeDetail.innerHTML = h`
      <h4>${node.label}</h4>
      <dl class="kv">
        <div><dt>Role</dt><dd>${node.role}</dd></div>
        <div><dt>Input</dt><dd>${node.inputs}</dd></div>
        <div><dt>Output</dt><dd>${node.outputs}</dd></div>
        <div><dt>Why it is needed</dt><dd>${node.why}</dd></div>
        <div><dt>Failure it addresses</dt><dd style="color: var(--ink)">${node.failure}</dd></div>
      </dl>
    `.toString();
  }

  function showCase(id) {
    activeCase = cases.find((c) => c.id === id) || cases[0];
    host.querySelectorAll('[data-case]').forEach((c) =>
      c.setAttribute('aria-pressed', String(c.dataset.case === activeCase.id)),
    );

    verdictEl.hidden = true;
    clearTrace();

    caseDetail.innerHTML = h`
      <div><dt>Query</dt><dd style="color: var(--ink)">${activeCase.query}</dd></div>
      <div><dt>Goal selected</dt><dd class="mono" style="text-transform: none; letter-spacing: 0.02em">${activeCase.goals}</dd></div>
    `.toString();
  }

  function clearTrace() {
    timers.forEach(clearTimeout);
    timers = [];
    edgeEls.forEach((e) => e.classList.remove('is-live'));
    nodeEls.forEach((n) => n.classList.remove('is-live'));
  }

  function revealResult() {
    verdictEl.hidden = false;
    verdictEl.dataset.v = activeCase.verdict;
    verdictEl.textContent = activeCase.verdict;

    caseDetail.innerHTML = h`
      <div><dt>Query</dt><dd style="color: var(--ink)">${activeCase.query}</dd></div>
      <div><dt>Goal selected</dt><dd class="mono" style="text-transform: none; letter-spacing: 0.02em">${activeCase.goals}</dd></div>
      <div><dt>Symbolic derivation</dt><dd>${activeCase.derivation}</dd></div>
      <div><dt>Verification</dt><dd>${activeCase.verification}</dd></div>
      <div><dt>Released answer</dt><dd style="color: var(--ink)">${activeCase.answer}</dd></div>
    `.toString();

    liveRegion.textContent = `${activeCase.verdict}. ${activeCase.answer}`;
  }

  function trace() {
    clearTrace();

    if (reducedMotion()) {
      nodeEls.forEach((n) => n.classList.add('is-live'));
      revealResult();
      return;
    }

    nodeEls.forEach((nodeEl, i) => {
      timers.push(
        setTimeout(() => {
          nodeEl.classList.add('is-live');
          const id = nodeEl.dataset.node;
          edgeEls.filter((e) => e.dataset.edge === id || e.dataset.edgeHead === id).forEach((e) => e.classList.add('is-live'));
          if (i === nodeEls.length - 1) revealResult();
        }, i * 360),
      );
    });
  }

  host.addEventListener('click', (event) => {
    const nodeEl = event.target.closest('[data-node]');
    if (nodeEl) return showNode(nodeEl.dataset.node);

    const caseBtn = event.target.closest('[data-case]');
    if (caseBtn) return showCase(caseBtn.dataset.case);

    if (event.target.closest('[data-trace]')) return trace();
  });

  // SVG groups are focusable buttons, so they need key activation.
  host.addEventListener('keydown', (event) => {
    const nodeEl = event.target.closest?.('[data-node]');
    if (!nodeEl) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showNode(nodeEl.dataset.node);
    }
  });

  showNode(nodes[0].id);
  showCase(cases[0].id);

  return {
    destroy() {
      clearTrace();
    },
  };
}
