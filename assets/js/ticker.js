/* ─────────────────────────────────────────────────────────────
   TICKER — the status strip above the nav.

   Every line is a real figure from the projects on this page. The
   run is duplicated so the CSS animation can translate -50% and
   land exactly where it started.
   ───────────────────────────────────────────────────────────── */

import { h } from './utils.js';

const ITEMS = [
  ['Agent authorization', 'ALLOW / APPROVAL / BLOCK'],
  ['Policy engine', '15 deterministic rules'],
  ['Identity', 'Ed25519, single-use nonces'],
  ['Audit', 'SHA-256 gapless chain'],
  ['Threat analysis', '11 behavioural rules'],
  ['AgentBridge', '179 tests, 6 suites'],
  ['PRAXIS', '255 held-out questions'],
  ['Hallucination rate', '0.149 vs 0.427 LLM-only'],
  ['Reasoning', 'Three-valued logic'],
  ['FootballGPT', '10M params from scratch'],
  ['Deep3DFaceRecon', '53K-vertex mesh'],
  ['Status', 'Open to interesting problems'],
];

export function mountTicker(track) {
  if (!track) return;

  const run = ITEMS.map(([label, value]) => h`<span>${label} <i>${value}</i></span>`);

  // Two runs back to back — the animation translates by exactly one.
  track.innerHTML = h`${run}${run}`.toString();
}
