// Fotomodus: tar et bilde av 3D-visningen slik den ser ut nå (med VHS-filteret), legger på
// VHS-tekst (▶ PLAY, dato, romnavn) og et lite vannmerke, og lagrer eller deler det.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n) => String(n).padStart(2, '0');

/** VHS-stempelet, som i HUD-en: et falskt 90-tallsår og ekte klokkeslett. */
export function vhsStamp(d = new Date()) {
  return `${MONTHS[d.getMonth()]}. ${pad(d.getDate())} 1997  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Filnavn som «liminal-the-mall-20261018-031422.png». */
export function photoName(roomName, d = new Date(), ext = 'png') {
  // æ/ø har ingen aksentfri form i Unicode; å, é osv. mister aksenten.
  const plain = String(roomName || 'room').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').normalize('NFKD').replace(/\p{M}/gu, '');
  const slug = plain.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'room';
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `liminal-${slug}-${stamp}.${ext}`;
}

function siteName() {
  const host = location.hostname;
  return !host || host === 'localhost' || /^[\d.]+$/.test(host) ? 'liminalsimulator.com' : host.replace(/^www\./, '');
}

function text(ctx, s, x, y, size, align = 'left') {
  ctx.font = `${size}px VT323, ui-monospace, monospace`;
  ctx.textAlign = align;
  // Fargeforskyvning som på et gammelt videobånd.
  ctx.fillStyle = 'rgba(255, 0, 80, 0.5)';
  ctx.fillText(s, x + size * 0.08, y);
  ctx.fillStyle = 'rgba(0, 200, 255, 0.4)';
  ctx.fillText(s, x - size * 0.08, y);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(s, x, y);
}

/**
 * Lager bildet. Tegner en ny ramme rett før kopieringen (WebGL-bufferet er bare gyldig i
 * samme oppgave). width/height beskjærer til et annet format (f.eks. 1200 × 630).
 * @returns {Promise<Blob>}
 */
export async function takePhoto(viewer, { width, height, vhs = true, name = '', type = 'image/png', quality = 0.9 } = {}) {
  await document.fonts?.load('32px VT323').catch(() => {});
  viewer.postfx.render(viewer.time);
  const src = viewer.renderer.domElement;
  const W = Math.round(width ?? src.width);
  const H = Math.round(height ?? src.height);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const s = Math.max(W / src.width, H / src.height);
  const sw = W / s;
  const sh = H / s;
  ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, W, H);
  const u = H / 22; // tekststørrelse etter bildets høyde
  ctx.textBaseline = 'alphabetic';
  if (vhs) {
    text(ctx, 'PLAY ▶', u * 0.9, u * 1.8, u);
    text(ctx, 'SP', u * 0.9, H - u * 2.1, u);
    text(ctx, vhsStamp(), W - u * 0.9, H - u * 0.9, u, 'right');
    if (name) text(ctx, name.toUpperCase(), u * 0.9, H - u * 0.9, u * 0.8);
  }
  ctx.globalAlpha = 0.55;
  text(ctx, siteName(), W - u * 0.9, vhs ? H - u * 2.1 : H - u * 0.8, u * 0.6, 'right');
  ctx.globalAlpha = 1;
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the photo.'))), type, quality));
}

/** Fotomodus (P) i visningen: bilde av det man ser, med VHS-tekst når filteret er på. */
export async function shootPhoto(viewer) {
  if (!viewer.world || viewer._shooting) return;
  viewer._shooting = true;
  try {
    const vhs = viewer.mode === 'walk' && viewer.settings.vhs;
    const blob = await takePhoto(viewer, { vhs, name: viewer.level?.name });
    viewer.hud.photoFlash();
    if (viewer.walk.sound && viewer.mode === 'walk') viewer.audio.shutter();
    const result = await savePhoto(blob, photoName(viewer.level?.name));
    if (result !== 'cancelled') viewer.hud.flash(result === 'shared' ? 'Photo shared' : 'Photo saved to your downloads');
  } catch (e) {
    viewer.hud.flash(e.message);
  } finally {
    viewer._shooting = false;
  }
}

/** Deler bildet (mobil: delingsmenyen) eller laster det ned. Returnerer 'shared' | 'saved'. */
export async function savePhoto(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Liminal Simulator' });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'saved';
}
