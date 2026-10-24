// Lysfarger (level.tint, og settings.light over 3D-panelet som kan overstyre rommets): farger som
// legges over det bakte lyset mens det kjører, uten ny baking – så de kan gli rolig over i
// hverandre («Shifting»). Fargen erstatter temaets lampefarge med samme lysstyrke. Ren logikk.
import { hexToLinear } from '../world/color.js';

export const TINTS = {
  theme: { label: "Theme's own" },
  warm: { label: 'Warm', color: '#ffc98a' },
  cold: { label: 'Cold blue', color: '#9cc4ff' },
  lilac: { label: 'Lilac', color: '#d2a8ff' },
  pink: { label: 'Pink', color: '#ffa8d6' },
  green: { label: 'Sickly green', color: '#b8f5a0' },
  teal: { label: 'Teal', color: '#8ff0e0' },
  red: { label: 'Red', color: '#ff7a6e' },
  shifting: { label: 'Shifting', cycle: ['lilac', 'cold', 'teal', 'pink', 'warm'] },
};

export const TINT_IDS = Object.keys(TINTS);
export const HOLD = 20; // sekunder hver farge står i «Shifting»
export const FADE = 14; // sekunder overgangen til neste farge tar

const LUMA = [0.2126, 0.7152, 0.0722];
const luma = (c) => c[0] * LUMA[0] + c[1] * LUMA[1] + c[2] * LUMA[2];
const smooth = (t) => t * t * (3 - 2 * t);

/** Lampefargen (lineær) for lysfargen ved tiden t (sekunder), eller null for temaets egen. */
export function tintColor(id, t = 0) {
  const tint = TINTS[id];
  if (!tint || id === 'theme') return null;
  if (!tint.cycle) return hexToLinear(tint.color);
  const colors = tint.cycle.map((c) => hexToLinear(TINTS[c].color));
  const period = HOLD + FADE;
  const k = Math.floor(Math.max(0, t) / period);
  const local = Math.max(0, t) - k * period;
  const a = colors[k % colors.length];
  const b = colors[(k + 1) % colors.length];
  const f = local < HOLD ? 0 : smooth((local - HOLD) / FADE);
  return a.map((v, i) => v + (b[i] - v) * f);
}

/**
 * Faktoren det bakte lyset ganges med ([r, g, b]) så lamper med fargen `base` (lineær) får
 * lysfargen – med samme lysstyrke. [1, 1, 1] for temaets egen.
 */
export function tintFactor(id, t, base) {
  const target = tintColor(id, t);
  if (!target) return [1, 1, 1];
  const b = base.map((v) => Math.max(v, 0.05));
  const scale = luma(b) / Math.max(luma(target), 1e-3);
  return target.map((v, i) => (v * scale) / b[i]);
}

/** En tilfeldig lysfarge (ikke temaets egen) – for de uendelige nivåene. */
export function pickTint(rand) {
  const ids = TINT_IDS.filter((id) => id !== 'theme');
  return ids[Math.floor(rand() * ids.length)];
}

/** Lysfargen som gjelder: visningsinnstillingen, eller rommets når den står på «room». */
export function activeTint(setting, level) {
  return setting && setting !== 'room' && TINTS[setting] ? setting : TINTS[level?.tint] ? level.tint : 'theme';
}
