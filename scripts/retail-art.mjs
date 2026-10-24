// Original geometric shop posters and fictional packaging, replacing source photos/brands.
// Applied only to the two retail models; original sources remain untouched.
import sharp from 'sharp';

const colors = ['#749c91', '#bd8d9c', '#bfa76a', '#718ca7', '#a496bb'];

function poster(index) {
  const color = colors[index % colors.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="384" viewBox="0 0 768 384">
    <rect width="768" height="384" fill="#efe4d8"/>
    <circle cx="590" cy="120" r="170" fill="${color}" opacity=".5"/>
    <path d="M450 384 Q570 120 768 280 V384" fill="${color}"/>
    <text x="48" y="94" font-family="sans-serif" font-size="42" letter-spacing="8" fill="#48535b">PALISADE</text>
    <text x="48" y="140" font-family="sans-serif" font-size="18" letter-spacing="5" fill="#48535b">EVERYDAY RITUALS</text>
    <rect x="85" y="210" width="88" height="120" rx="12" fill="${color}"/>
    <rect x="106" y="188" width="46" height="24" rx="4" fill="#d1c7ad"/>
    <rect x="198" y="242" width="135" height="88" rx="14" fill="#f9f2e7"/>
    <rect x="194" y="230" width="143" height="22" rx="6" fill="${color}"/>
    <path d="M102 274h54M221 286h90" stroke="#f4dfba" stroke-width="8"/>
  </svg>`;
}

function packaging(index) {
  const color = colors[index % colors.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="384" viewBox="0 0 256 384">
    <rect width="256" height="384" fill="#f1eee2"/>
    <path d="M0 0h256v86H0zM0 316h256v68H0z" fill="${color}"/>
    <text x="128" y="51" text-anchor="middle" font-family="sans-serif" font-size="25" letter-spacing="4" fill="#fff">PALISADE</text>
    <circle cx="128" cy="198" r="64" fill="${color}" opacity=".25"/>
    <path d="M128 250V145M128 204q-60-8-36-51 38 9 36 51M128 182q58-12 38-46-35 8-38 46" fill="${color}" stroke="${color}" stroke-width="5"/>
    <text x="128" y="291" text-anchor="middle" font-family="sans-serif" font-size="18" letter-spacing="3" fill="#445357">BOTANICAL ${index + 1}</text>
    <path d="M60 343h136M85 355h86" stroke="#fff" stroke-width="4" opacity=".7"/>
  </svg>`;
}

export async function retailArt(doc, name) {
  let index = 0;
  for (const texture of doc.getRoot().listTextures()) {
    const uri = texture.getURI();
    const cosmetics = name === 'store_empty_cosmetics_shelf' && /Material\.0(09|11|12)_baseColor\.png$/.test(uri);
    const pharmacy = name === 'store_farmacy_shelf' && /256\.002_(?:[3-9]|10|11)_baseColor\.png$/.test(uri);
    if (!cosmetics && !pharmacy) continue;
    const svg = cosmetics ? poster(index) : packaging(index);
    texture.setImage(await sharp(Buffer.from(svg)).png().toBuffer());
    texture.setMimeType('image/png').setURI(`palisade-${index++}.png`);
  }
  if (name !== 'store_farmacy_shelf') return;
  // The original brand is extruded geometry above the products, not a texture.
  const logos = new Set(['Object_95', 'Object_103', 'Object_106', 'Object_109']);
  for (const node of doc.getRoot().listNodes()) if (logos.has(node.getName())) node.dispose();
  const header = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="320">
    <rect width="768" height="320" fill="#e6e9dc"/>
    <rect x="12" y="12" width="744" height="296" fill="none" stroke="#749c91" stroke-width="14"/>
    <text x="384" y="145" text-anchor="middle" font-family="sans-serif" font-size="86" letter-spacing="8" fill="#466d65">PALISADE</text>
    <text x="384" y="237" text-anchor="middle" font-family="sans-serif" font-size="36" letter-spacing="6" fill="#466d65">BOTANICAL CARE</text>
  </svg>`;
  const texture = doc.createTexture('Palisade header').setImage(await sharp(Buffer.from(header)).png().toBuffer()).setMimeType('image/png').setURI('palisade-header.png');
  const material = doc.createMaterial('Palisade header').setBaseColorTexture(texture).setRoughnessFactor(0.8);
  const buffer = doc.getRoot().listBuffers()[0];
  const attr = (type, array) => doc.createAccessor().setType(type).setArray(new Float32Array(array)).setBuffer(buffer);
  // World coordinates of the source sign; front points toward -z before catalog turn.
  const primitive = doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', attr('VEC3', [.119,.521,-.281, -.108,.521,-.281, -.108,.614,-.281, .119,.614,-.281]))
    .setAttribute('NORMAL', attr('VEC3', [0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1]))
    .setAttribute('TEXCOORD_0', attr('VEC2', [0,1, 1,1, 1,0, 0,0]))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array([0,1,2,0,2,3])).setBuffer(buffer));
  doc.getRoot().listScenes()[0].addChild(doc.createNode('Palisade header').setMesh(doc.createMesh().addPrimitive(primitive)));
}
