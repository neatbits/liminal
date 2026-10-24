// Bildet i 3D-visningen: størrelse, format i fullskjerm, oppløsning og bildefrekvens
// (grafikkinnstillingene). I fullskjerm med et annet format enn skjermen tegnes bildet i midten
// med svarte felt rundt – færre piksler å regne ut på brede skjermer (32:9).

export const ASPECTS = { screen: null, '16:9': 16 / 9, '21:9': 21 / 9, '16:10': 16 / 10 };

/** Største flate med formatet aspect (bredde/høyde) innenfor w × h; null = hele flaten. */
export function fitAspect(w, h, aspect) {
  if (!aspect || Math.abs(w / h - aspect) < 0.01) return [w, h];
  return w / h > aspect ? [Math.round(h * aspect), h] : [w, Math.round(w / aspect)];
}

/** Tilpasser renderer, etterbehandling, vann og kamera til visningen og innstillingene. */
export function resizeView(v) {
  const W = Math.max(1, v.container.clientWidth);
  const H = Math.max(1, v.container.clientHeight);
  const full = document.fullscreenElement === v.container;
  const [w, h] = full ? fitAspect(W, H, ASPECTS[v.settings.fullscreenAspect]) : [W, H];
  const pr = Math.min(window.devicePixelRatio || 1, 1.5) * (v.settings.renderScale ?? 1);
  v.renderer.setPixelRatio(pr);
  v.renderer.setSize(w, h, false);
  // Med svarte felt: lerretet midt på skjermen (CSS i panes.css), og HUD-en over bildet.
  const boxed = w !== W || h !== H;
  Object.assign(v.renderer.domElement.style, { width: boxed ? `${w}px` : '', height: boxed ? `${h}px` : '' });
  v.hud.root.style.inset = boxed ? `${(H - h) / 2}px ${(W - w) / 2}px` : '';
  v.postfx.setSize(w, h, pr);
  v._rtW = w * pr; // vannet bruker halvparten (hele med detaljert vann)
  v._rtH = h * pr;
  v.world?.water?.setSize(v._rtW, v._rtH);
  v.world?.floorReflection?.setSize(v._rtW, v._rtH);
  v.camera.aspect = w / h;
  v.camera.updateProjectionMatrix();
}

/** Skal et nytt bilde tegnes nå? (Bildefrekvensen kan begrenses til 60 eller 30 per sekund.) */
export function frameDue(v, timestamp) {
  const cap = v.settings.fpsCap;
  if (!cap) return true;
  if (timestamp - (v._lastFrame ?? -Infinity) < 1000 / cap - 2) return false;
  v._lastFrame = timestamp;
  return true;
}
