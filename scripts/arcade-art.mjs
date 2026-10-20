// Egen grafikk til arkademaskinen (3dmodels/arcade_machine_2): et oppdiktet spill, «STAR LANES»,
// i stedet for originalens League of Legends-grafikk (varemerke og kunst tilhører Riot Games).
// Maler nye ParteFrontal_baseColor.png (sidekunst, skjerm, toppskilt) og Caixa_baseColor.png
// (kontrollpanelet) i de samme feltene i teksturen som originalen brukte. Feltene er speilet
// loddrett i teksturen (slik modellens UV-er er lagt), så hvert felt tegnes rett vei og snus.
// Kjør: node scripts/arcade-art.mjs, deretter npm run models.
import sharp from 'sharp';

const DIR = '3dmodels/arcade_machine_2/textures';
const S = 1024;

// 5 × 7 pikselskrift for bokstavene vi bruker.
const GLYPHS = {
  A: '01110 10001 10001 11111 10001 10001 10001', C: '01110 10001 10000 10000 10000 10001 01110',
  E: '11111 10000 10000 11110 10000 10000 11111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', L: '10000 10000 10000 10000 10000 10000 11111',
  N: '10001 11001 10101 10011 10001 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  Y: '10001 10001 01010 00100 00100 00100 00100', 0: '01110 10011 10101 10101 11001 10001 01110',
  1: '00100 01100 00100 00100 00100 00100 01110', 2: '01110 10001 00001 00110 01000 10000 11111',
  5: '11111 10000 11110 00001 00001 10001 01110', '-': '00000 00000 00000 11111 00000 00000 00000',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
};

/** Tekst i pikselskrift som SVG-rektangler, sentrert om cx. */
function pixelText(text, cx, y, px, fill) {
  const w = text.length * 6 * px - px;
  let out = '';
  [...text].forEach((ch, k) => {
    const rows = GLYPHS[ch].split(' ');
    rows.forEach((row, j) => {
      [...row].forEach((bit, i) => {
        if (bit === '1') out += `<rect x="${cx - w / 2 + (k * 6 + i) * px}" y="${y + j * px}" width="${px}" height="${px}" fill="${fill}"/>`;
      });
    });
  });
  return out;
}

/** Stjerner med fast frø (samme bilde hver gang). */
function stars(w, h, n, seed = 1) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let out = '';
  for (let k = 0; k < n; k++) out += `<rect x="${(r() * w) | 0}" y="${(r() * h) | 0}" width="${r() < 0.15 ? 3 : 2}" height="${r() < 0.15 ? 3 : 2}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  return out;
}

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

/** Retro skråstriper i neon over en mørk overgang (sidene og panelet). */
function stripes(w, h, seed) {
  const cols = ['#ff3d9a', '#ffb547', '#3de0ff'];
  let out = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0b3d"/><stop offset="1" stop-color="#05030f"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${stars(w, h, 70, seed)}`;
  cols.forEach((c, k) => {
    const o = h * 0.35 + k * 34;
    out += `<polygon points="0,${o} ${w},${o - w * 0.6} ${w},${o - w * 0.6 + 22} 0,${o + 22}" fill="${c}"/>`;
  });
  return out;
}

function screen(w, h) {
  const ship = '00100 01110 01110 11111 11011 10001'.split(' ');
  let s = '';
  ship.forEach((row, j) => [...row].forEach((b, i) => {
    if (b === '1') s += `<rect x="${w / 2 - 15 + i * 6}" y="${h * 0.5 + j * 6}" width="6" height="6" fill="#7dffb0"/>`;
  }));
  return `<rect width="${w}" height="${h}" fill="#070a24"/>${stars(w, h, 90, 7)}
    ${pixelText('STAR LANES', w / 2 + 3, 43, 7, '#7a1d4f')}${pixelText('STAR LANES', w / 2, 40, 7, '#ffd23f')}
    ${pixelText('HI 012500', w / 2, 112, 3, '#9fd8ff')}${s}
    ${pixelText('INSERT COIN', w / 2, h - 78, 4, '#ff5fae')}
    ${pixelText('1 OR 2 PLAYERS', w / 2, h - 40, 3, '#c9c9ff')}`;
}

function marquee(w, h) {
  let grid = '';
  for (let k = 0; k <= 12; k++) grid += `<line x1="${w / 2 + (k - 6) * 30}" y1="${h * 0.62}" x2="${w / 2 + (k - 6) * 140}" y2="${h}" stroke="#ff3d9a" stroke-width="2" opacity="0.7"/>`;
  for (let k = 0; k < 5; k++) grid += `<line x1="0" y1="${h * 0.62 + k * k * 4 + k * 6}" x2="${w}" y2="${h * 0.62 + k * k * 4 + k * 6}" stroke="#ff3d9a" stroke-width="2" opacity="0.7"/>`;
  return `<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12062e"/><stop offset="0.55" stop-color="#5a1366"/><stop offset="0.62" stop-color="#ff7a3d"/><stop offset="0.63" stop-color="#14051f"/><stop offset="1" stop-color="#14051f"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#m)"/>${stars(w, h * 0.5, 40, 3)}<circle cx="${w / 2}" cy="${h * 0.62}" r="${h * 0.22}" fill="#ffb547" opacity="0.85"/>${grid}
    ${pixelText('STAR LANES', w / 2 + 4, 18, 8, '#3a0b3f')}${pixelText('STAR LANES', w / 2, 14, 8, '#3de0ff')}`;
}

/** Tegner et felt rett vei, snur det loddrett og legger det inn på plass. */
async function region(x, y, w, h, body) {
  return { input: await sharp(svg(w, h, body)).flip().png().toBuffer(), left: x, top: y };
}

const front = sharp(`${DIR}/ParteFrontal_baseColor.png`);
const black = { create: { width: S, height: S, channels: 3, background: '#000' } };
// Myntlampen (det blå feltet øverst til venstre) tas vare på; resten males på nytt.
const coin = await front.clone().extract({ left: 20, top: 100, width: 60, height: 140 }).toBuffer();
const frontOut = await sharp(black)
  .composite([
    { input: coin, left: 20, top: 100 },
    await region(0, 292, 550, 552, stripes(550, 552, 11)),
    await region(553, 308, 446, 312, screen(446, 312)),
    await region(430, 724, 592, 182, marquee(592, 182)),
  ])
  .png()
  .toBuffer();
const panelOut = await sharp(black)
  .composite([await region(198, 526, 826, 376, stripes(826, 376, 23))])
  .png()
  .toBuffer();
await sharp(frontOut).toFile(`${DIR}/ParteFrontal_baseColor.png`);
await sharp(panelOut).toFile(`${DIR}/Caixa_baseColor.png`);
console.log('Arcade art painted.');
