/* ─────────────────────────────────────────────────────────────
   Small shared helpers. No dependencies.
   ───────────────────────────────────────────────────────────── */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escape a value for safe interpolation into markup. */
export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** Marks a string as already-safe markup so `h` leaves it alone. */
class Raw {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export const raw = (value) => new Raw(value);

/**
 * Tagged template for markup. Interpolations are escaped unless wrapped in
 * `raw()`; arrays are joined. All project copy goes through here.
 */
export function h(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (v instanceof Raw) out += v.value;
    else if (Array.isArray(v)) out += v.map((x) => (x instanceof Raw ? x.value : esc(x))).join('');
    else if (v === null || v === undefined || v === false) out += '';
    else out += esc(v);
    out += strings[i + 1];
  }
  return raw(out);
}

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Live reduced-motion check — the user can change it mid-session. */
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => motionQuery.matches;
export const onMotionChange = (fn) => motionQuery.addEventListener('change', fn);

/** True on devices with a real pointer that can hover. */
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const isMac = () =>
  /mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform || '');

let toastTimer;
export function toast(message) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-on'), 2400);
}

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Smooth-scroll to a section, honouring reduced motion. */
export function goToSection(hash) {
  const target = document.querySelector(hash);
  if (!target) return false;
  target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', hash);
  return true;
}
