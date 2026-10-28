// Kapslene, bibliotekbildene og logoen til Steam (scripts/steam-assets.mjs): et skjermbilde som
// bakgrunn og tittelen i VT323 med et VHS-skjær, i nøyaktig de størrelsene Steamworks ber om. Settes
// sammen som HTML på forsiden (der fonten finnes) og fotograferes. Logoen har gjennomsiktig bakgrunn,
// og bibliotekshelten har ingen tekst (Steams regel) – den tegnes på et lerret (se hero).
import { writeFileSync } from 'node:fs';
import { waitFor } from './browser-driver.mjs';

// [filnavn, bredde, høyde, format]: wide = én linje, tall = to linjer, logo = bare tittelen,
// hero = bare bildet.
const SIZES = [
  ['library_hero', 3840, 1240, 'hero'],
  ['header_capsule', 920, 430, 'wide'],
  ['small_capsule', 462, 174, 'wide'],
  ['main_capsule', 1232, 706, 'wide'],
  ['vertical_capsule', 748, 896, 'tall'],
  ['library_capsule', 600, 900, 'tall'],
  ['library_logo', 1280, 360, 'logo'],
  ['library_header_capsule', 920, 430, 'wide'],
  ['event_cover', 800, 450, 'wide'],
];

// Ikonene lages av programikonet (desktop/icon.png): snarvei (PNG) og app-ikon (JPG, mørk bakgrunn).
const ICONS = [['shortcut_icon', 256, 'png'], ['app_icon', 184, 'jpeg']];

const html = (w, h, kind, bg) => {
  const tall = kind === 'tall';
  // VT323 er ca. 0,5 em bred per tegn: «Liminal Simulator» (17 tegn) ≈ 8,7 em på én linje.
  const size = kind === 'logo' ? Math.min(h * 0.62, w / 9) : tall ? w * 0.22 : Math.min(h * 0.3, w * 0.105);
  const title = tall ? 'Liminal<br>Simulator' : 'Liminal Simulator';
  return `
  <style>
    html, body { margin: 0; background: transparent !important; }
    body::before, body::after { display: none !important; }
    .cap { position: fixed; left: 0; top: 0; width: ${w}px; height: ${h}px; overflow: hidden;
      ${bg ? `background: url(${bg}) center / cover;` : ''}
      display: flex; flex-direction: column; justify-content: ${tall ? 'flex-start' : 'flex-end'};
      padding: ${kind === 'logo' ? 0 : `${h * (tall ? 0.07 : 0.1)}px ${w * 0.06}px`}; box-sizing: border-box; }
    .shade { position: absolute; inset: 0; background: ${tall
      ? 'linear-gradient(180deg, rgba(20,16,8,.62) 0%, rgba(20,16,8,.15) 45%, transparent 70%)'
      : 'linear-gradient(0deg, rgba(20,16,8,.62) 0%, rgba(20,16,8,.15) 50%, transparent 75%)'}; }
    .title { position: relative; white-space: nowrap; font: ${size}px/0.86 'VT323', monospace; color: #fff6d8; letter-spacing: .01em;
      text-shadow: ${size * 0.035}px 0 rgba(255,40,80,.55), ${-size * 0.035}px 0 rgba(40,170,255,.5), 0 ${size * 0.04}px ${size * 0.12}px rgba(0,0,0,.55);
      ${kind === 'logo' ? 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;' : ''} }
    .kicker { position: relative; order: ${tall ? 1 : -1}; margin: ${tall ? `${size * 0.25}px 0 0` : `0 0 ${size * 0.12}px`};
      font: ${Math.max(14, size * 0.24)}px/1 'VT323', monospace; letter-spacing: .12em; color: #ffd2c4; text-shadow: 0 1px 6px rgba(0,0,0,.6); }
  </style>
  <div class="cap">${bg ? '<div class="shade"></div>' : ''}<div class="title">${title}</div>${kind === 'logo' || h < 200 ? '' : '<div class="kicker">REC ● 03:14 AM</div>'}</div>`;
};

/**
 * Bibliotekshelten: bare bildet, beskåret til 3840 × 1240 på et lerret. Den er for stor til ett
 * skjermbilde over CDP (meldinger på flere MB kutter forbindelsen), så den hentes ut i biter.
 */
async function hero(evaluate, url, w, h) {
  const size = await evaluate(`(async () => {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = ${JSON.stringify(url)}; await img.decode();
    const s = Math.max(${w} / img.naturalWidth, ${h} / img.naturalHeight);
    const sw = ${w} / s, sh = ${h} / s;
    const c = document.createElement('canvas'); c.width = ${w}; c.height = ${h};
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, ${w}, ${h});
    window.__hero = c.toDataURL('image/png').split(',')[1];
    return window.__hero.length;
  })()`);
  let data = '';
  for (let i = 0; i < size; i += 1e6) data += await evaluate(`window.__hero.slice(${i}, ${i + 1e6})`);
  await evaluate('delete window.__hero');
  return data;
}

/** Ikonene, tegnet på et lerret og hentet ut (de er små nok til én melding). */
async function icons(evaluate, url, out) {
  for (const [name, size, type] of ICONS) {
    const data = await evaluate(`(async () => {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = ${JSON.stringify(url)}; await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = ${size};
      const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      if ('${type}' === 'jpeg') { ctx.fillStyle = '#1b1810'; ctx.fillRect(0, 0, ${size}, ${size}); }
      ctx.drawImage(img, 0, 0, ${size}, ${size});
      return c.toDataURL('image/${type}', 0.95).split(',')[1];
    })()`);
    const file = `${name}.${type === 'jpeg' ? 'jpg' : 'png'}`;
    writeFileSync(`${out}/${file}`, Buffer.from(data, 'base64'));
    console.log(`${file} (${size} × ${size})`);
  }
}

/** art: { wide, tall, icon } – adresser til skjermbildene (tall: de høye kapslene) og programikonet. */
export async function capsules(browser, origin, art, out) {
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: `${origin}/` });
  await waitFor(() => evaluate("document.readyState === 'complete'").catch(() => false), 'front page');
  await call('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (const [name, w, h, kind] of SIZES) {
    await call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    const bg = kind === 'logo' ? null : kind === 'tall' ? art.tall : art.wide;
    if (kind === 'hero') {
      writeFileSync(`${out}/${name}.png`, Buffer.from(await hero(evaluate, bg, w, h), 'base64'));
      console.log(`${name}.png (${w} × ${h})`);
      continue;
    }
    await evaluate(`(async () => {
      ${bg ? `const im = new Image(); im.src = ${JSON.stringify(bg)}; await im.decode();` : ''} // bakgrunnen lastet før bildet tas
      document.body.innerHTML = ${JSON.stringify(html(w, h, kind, bg))};
      await document.fonts.load('40px VT323');
      await new Promise((r) => setTimeout(r, 300));
    })()`);
    const { data } = await call('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
    writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
    console.log(`${name}.png (${w} × ${h})`);
  }
  await call('Emulation.setDefaultBackgroundColorOverride', {});
  if (art.icon) await icons(evaluate, art.icon, out);
}
