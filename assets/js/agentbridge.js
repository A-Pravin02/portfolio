/* ─────────────────────────────────────────────────────────────
   AGENTBRIDGE — interactive security pipeline.

   This is a simulation of the architecture described in the
   repository, running entirely in the browser from the fixed
   scenarios in data/projects.js. It makes no network call, holds
   no keys, and reaches no payment provider.
   ───────────────────────────────────────────────────────────── */

import { h, raw, reducedMotion } from './utils.js';

const STEP_MS = 420;

export function mountPipeline(host, project) {
  const stages = project.pipeline;
  const scenarios = project.scenarios;

  host.innerHTML = h`
    <div class="pipe">
      <div>
        <p class="mono" style="margin-bottom: var(--s-3)">Authorization pipeline — select a stage</p>
        <div class="pipe__stages" role="group" aria-label="Pipeline stages">
          ${stages.map(
            (stage, i) => h`
              <button
                class="pipe__stage"
                type="button"
                data-stage="${stage.id}"
                aria-pressed="${i === 0 ? 'true' : 'false'}"
              >
                <span class="pipe__num">${String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span class="pipe__name">${stage.label}</span><br />
                  <span class="pipe__mono">${stage.mono}</span>
                </span>
                <span class="pipe__mono" data-verdict></span>
              </button>`,
          )}
        </div>
      </div>

      <div class="pipe__side">
        <div class="panel">
          <div class="panel__bar">
            <p class="mono">Request inspector</p>
            <span class="verdict" data-run-verdict hidden></span>
          </div>
          <div class="panel__body">
            <div class="chips" role="group" aria-label="Example requests">
              ${scenarios.map(
                (s, i) => h`
                  <button class="chip" type="button" data-scenario="${s.id}" aria-pressed="${i === 0 ? 'true' : 'false'}">
                    ${s.label}
                  </button>`,
              )}
            </div>

            <dl class="kv" data-request></dl>

            <div class="game__actions" style="justify-content: flex-start">
              <button class="btn btn--primary" type="button" data-run>Run request</button>
              <button class="btn btn--ghost" type="button" data-reset>Reset</button>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__bar">
            <p class="mono">Stage detail</p>
            <span class="mono" data-stage-mono></span>
          </div>
          <div class="panel__body" data-stage-detail></div>
        </div>

        <p class="sim-note">
          Simulation of the architecture in the repository. Deterministic scenarios, no live
          transactions, no keys in the browser.
        </p>
      </div>
    </div>
  `.toString();

  const stageButtons = Array.from(host.querySelectorAll('[data-stage]'));
  const chips = Array.from(host.querySelectorAll('[data-scenario]'));
  const requestEl = host.querySelector('[data-request]');
  const detailEl = host.querySelector('[data-stage-detail]');
  const stageMonoEl = host.querySelector('[data-stage-mono]');
  const runVerdictEl = host.querySelector('[data-run-verdict]');
  const liveRegion = document.createElement('p');
  liveRegion.className = 'visually-hidden';
  liveRegion.setAttribute('role', 'status');
  host.append(liveRegion);

  let activeStage = stages[0].id;
  let activeScenario = scenarios[0];
  let timers = [];
  let lastRun = null;

  /* ── Stage detail ─────────────────────────────────────── */

  function showStage(id) {
    activeStage = id;
    const stage = stages.find((s) => s.id === id);
    stageButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stage === id)));
    stageMonoEl.textContent = stage.mono;

    const traced = lastRun?.trace?.[id];

    detailEl.innerHTML = h`
      <h4>${stage.label}</h4>
      <dl class="kv">
        <div><dt>Checks</dt><dd>${stage.checks}</dd></div>
        <div><dt>Why it matters</dt><dd>${stage.why}</dd></div>
        <div><dt>Input</dt><dd>${stage.inputs}</dd></div>
        <div><dt>Can produce</dt><dd>${stage.outputs}</dd></div>
        ${
          traced
            ? h`<div><dt>This run — ${activeScenario.label}</dt><dd style="color: var(--ink)">${traced}</dd></div>`
            : ''
        }
      </dl>
    `.toString();
  }

  /* ── Scenario ─────────────────────────────────────────── */

  function showScenario(id) {
    activeScenario = scenarios.find((s) => s.id === id) || scenarios[0];
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.scenario === activeScenario.id)));

    const r = activeScenario.request;
    requestEl.innerHTML = h`
      <div><dt>Agent</dt><dd class="mono" style="text-transform: none; color: var(--ink)">${r.agent}</dd></div>
      <div><dt>Merchant</dt><dd>${r.merchant}</dd></div>
      <div><dt>Item</dt><dd>${r.item}</dd></div>
      <div><dt>Amount</dt><dd style="color: var(--ink)">${r.amount}</dd></div>
    `.toString();

    reset();
  }

  /* ── Run ──────────────────────────────────────────────── */

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function reset() {
    clearTimers();
    lastRun = null;
    stageButtons.forEach((b) => {
      delete b.dataset.state;
      b.querySelector('[data-verdict]').textContent = '';
    });
    runVerdictEl.hidden = true;
    showStage(activeStage);
  }

  function paint(index, scenario, decidedIndex) {
    const button = stageButtons[index];
    const stage = stages[index];
    const verdictCell = button.querySelector('[data-verdict]');

    // An identity failure stops the pipeline dead; a policy or risk refusal
    // still travels through the remaining stages to be recorded.
    if (index > decidedIndex && scenario.terminal && stage.id !== 'outcome') {
      button.dataset.state = 'skip';
      verdictCell.textContent = '—';
      return;
    }

    if (index < decidedIndex) {
      button.dataset.state = 'pass';
      verdictCell.textContent = 'pass';
      return;
    }

    const tone =
      scenario.verdict === 'ALLOW' ? 'pass' : scenario.verdict === 'REQUIRE_APPROVAL' ? 'hold' : 'block';
    button.dataset.state = tone;
    verdictCell.textContent =
      scenario.verdict === 'REQUIRE_APPROVAL' ? 'hold' : scenario.verdict.toLowerCase();
  }

  function run() {
    clearTimers();
    const scenario = activeScenario;
    lastRun = scenario;

    const decidedIndex = stages.findIndex((s) => s.id === scenario.decidedAt);
    const outcomeIndex = stages.length - 1;

    stageButtons.forEach((b) => {
      delete b.dataset.state;
      b.querySelector('[data-verdict]').textContent = '';
    });

    runVerdictEl.hidden = false;
    runVerdictEl.dataset.v = scenario.verdict;
    runVerdictEl.textContent = scenario.verdict.replace('_', ' ');
    liveRegion.textContent = `${scenario.label}: ${scenario.verdict.replace('_', ' ')}. Decided at ${
      stages[decidedIndex].label
    }.`;

    const settle = (i) => {
      paint(i, scenario, decidedIndex);
      if (i === outcomeIndex && decidedIndex !== outcomeIndex) paint(outcomeIndex, scenario, decidedIndex);
    };

    if (reducedMotion()) {
      stages.forEach((_, i) => settle(i));
      paint(outcomeIndex, scenario, decidedIndex);
      showStage(stages[decidedIndex].id);
      return;
    }

    stages.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          if (i <= decidedIndex) stageButtons[i].dataset.state = 'active';
          timers.push(setTimeout(() => settle(i), STEP_MS * 0.6));
          if (i === outcomeIndex) {
            timers.push(setTimeout(() => showStage(stages[decidedIndex].id), STEP_MS));
          }
        }, i * STEP_MS),
      );
    });
  }

  /* ── Wiring ───────────────────────────────────────────── */

  host.addEventListener('click', (event) => {
    const stageBtn = event.target.closest('[data-stage]');
    if (stageBtn) return showStage(stageBtn.dataset.stage);

    const chip = event.target.closest('[data-scenario]');
    if (chip) return showScenario(chip.dataset.scenario);

    if (event.target.closest('[data-run]')) return run();
    if (event.target.closest('[data-reset]')) return reset();
  });

  showScenario(scenarios[0].id);
  showStage(stages[0].id);

  return {
    destroy() {
      clearTimers();
    },
  };
}

