// Preserve the source UVs/materials while replacing branded labels, album art and OS screenshots.
import sharp from 'sharp';

const svg = (content, w = 1024, h = 1024) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1024 1024">${content}</svg>`);

function albums() {
  let out = '<rect width="1024" height="1024" fill="#18202e"/>';
  const colors = ['#7fa6aa', '#c98b9c', '#a99bc4', '#d5b971'];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const px = x * 256, py = y * 256, col = colors[(x + y) % 4];
    out += `<rect x="${px+8}" y="${py+8}" width="240" height="240" fill="${col}"/>
      <circle cx="${px+130}" cy="${py+108}" r="68" fill="#243848"/>
      <path d="M${px+32} ${py+180}l190-125M${px+32} ${py+194}l190-125" stroke="#efe6d4" stroke-width="6"/>
      <text x="${px+25}" y="${py+223}" font-family="sans-serif" font-size="23" fill="#243848">LIMINAL / ${x+y*4+1}</text>`;
  }
  return out;
}

function screens() {
  let out = '<rect width="1024" height="208" fill="#101e25"/>';
  for (let k = 0; k < 4; k++) {
    const x = k * 256;
    out += `<rect x="${x+8}" y="10" width="236" height="175" fill="${['#bbc8b8','#386e76','#344c7e','#112c20'][k]}"/>
      <rect x="${x+20}" y="23" width="212" height="20" fill="#1d303c"/>
      <text x="${x+28}" y="38" font-family="monospace" font-size="13" fill="#d3e8ca">PALISADE SYSTEM ${k+1}</text>`;
    for (let line = 0; line < 7; line++) out += `<path d="M${x+25} ${58+line*14}h${70+(line*31+k*17)%130}" stroke="${k===3?'#7cbb85':'#ccdfd7'}" stroke-width="4"/>`;
  }
  out += '<rect x="515" y="710" width="40" height="28" fill="#d7d7ca"/><rect x="510" y="854" width="45" height="27" fill="#9b9b97"/>';
  return out;
}

async function overlay(texture, content) {
  const { width, height } = await sharp(texture.getImage()).metadata();
  const graphic = await sharp(svg(content)).resize(width, height).png().toBuffer();
  texture.setImage(await sharp(texture.getImage()).composite([{ input: graphic }]).png().toBuffer()).setMimeType('image/png');
}

export async function electronicsArt(doc, name) {
  for (const texture of doc.getRoot().listTextures()) {
    const uri = texture.getURI();
    if (name === '80s_avanti_mini_fridge' && /baseColor\.png$/.test(uri)) {
      await overlay(texture, '<rect x="204" y="518" width="38" height="18" fill="#d7d3c1"/><text x="208" y="530" font-family="sans-serif" font-size="9" fill="#4c4942">DRIFT</text>');
    }
    if (name.startsWith('retro_pc_') && /material_(baseColor|emissive)\.jpeg$/.test(uri)) await overlay(texture, screens());
    if (name === 'retro_hifi_system' && /(?:CD_Cover|Record_Collection|CD_Collection|Tape_Cover)_baseColor\.jpeg$/.test(uri)) {
      texture.setImage(await sharp(svg(albums())).png().toBuffer()).setMimeType('image/png');
    }
    if (name === 'retro_hifi_system' && /Tape_baseColor\.jpeg$/.test(uri)) {
      await overlay(texture, '<rect x="94" y="170" width="685" height="230" fill="#ddd4b5"/><rect x="88" y="668" width="670" height="217" fill="#ddd4b5"/><text x="160" y="300" font-family="monospace" font-size="50" fill="#574d48">LIMINAL / C60</text>');
    }
    if (name === 'retro_walkman' && /Material_baseColor\.png$/.test(uri)) {
      // Match the diagonal front-panel label; retain the window, switches and worn case.
      await overlay(texture, '<path d="M608 571l92-286 66 20-90 290z" fill="#242529"/><text x="650" y="532" transform="rotate(-72 650 532)" font-family="sans-serif" font-size="28" letter-spacing="3" fill="#aaaa9e">DRIFT / STEREO</text><rect x="824" y="857" width="150" height="75" fill="#242529"/><path d="M724 462l52-150 45 15-53 150z" fill="#242529"/>');
    }
  }
}
