// Original rental covers, fitted to the actual five shelf levels on both sides of the source.
import sharp from 'sharp';
import { BoxGeometry } from 'three';

export const VHS_TITLES = ['MIDNIGHT WING', 'SECOND FLOOR', 'LAST ATRIUM', 'DEAD CHANNEL', 'BLUE HOUR', 'STILL WATER',
  'AFTER CLOSING', 'HOLLOW SIGNAL', 'SIDE B', 'THE LONG WAY', 'EMPTY SUMMER', 'SOFT STATIC'];

export async function vhsArt(doc) {
  const colors = ['#21434f', '#a96f83', '#776392', '#a88a4f'];
  let art = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1152">';
  for (const [i, title] of VHS_TITLES.entries()) {
    const x = i % 4 * 256, y = Math.floor(i / 4) * 384;
    art += `<g transform="translate(${x} ${y})"><rect width="256" height="384" fill="${colors[i%4]}"/>
      <rect x="12" y="12" width="232" height="360" fill="none" stroke="#dfd9b8" stroke-width="3"/>
      <text x="128" y="34" text-anchor="middle" font-family="sans-serif" font-size="13" letter-spacing="3" fill="#e8dfc7">DRIFT VIDEO</text>
      <circle cx="${80+i%3*45}" cy="155" r="62" fill="#d7b78d" opacity=".75"/>
      <path d="M25 280V240h35v-32h35v-32h35v-32h35v-32h35v168z" fill="#172831"/>
      <path d="M35 310L128 76l93 234M35 310h186" fill="none" stroke="#e2cfb6" stroke-width="2" opacity=".5"/>`;
    for (const [line, word] of title.split(' ').entries()) art += `<text x="128" y="${295+line*25}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="22" fill="#fff0cc">${word}</text>`;
    art += '<text x="128" y="358" text-anchor="middle" font-family="monospace" font-size="11" fill="#e8dfc7">VHS / COLOR / FEATURE FILM</text></g>';
  }
  art += '</svg>';
  const texture = doc.createTexture('Original fictional VHS covers').setImage(await sharp(Buffer.from(art)).png().toBuffer())
    .setMimeType('image/png').setURI('fictional-vhs-covers.png');
  const material = doc.createMaterial('DRIFT VIDEO covers').setBaseColorTexture(texture).setRoughnessFactor(.85);
  const buffer = doc.getRoot().listBuffers()[0], scene = doc.getRoot().listScenes()[0];
  const levels = [.076, .480, .884, 1.288, 1.694];
  for (const side of [-1, 1]) for (let row = 0; row < 5; row++) for (let bay = 0; bay < 3; bay++) for (let k = 0; k < 7; k++) {
    const index = (row * 5 + bay * 7 + k + (side < 0 ? 3 : 0)) % VHS_TITLES.length;
    const geometry = new BoxGeometry(.13, .2, .028);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i,
      (index % 4 + .02 + uv.getX(i) * .96) / 4, (Math.floor(index / 4) + .02 + (1-uv.getY(i)) * .96) / 3);
    if (side < 0) geometry.rotateY(Math.PI);
    geometry.translate(-2 + bay * 4/3 + .12 + k * .18, levels[row] + .101, side * (.385 - row * .04));
    const primitive = doc.createPrimitive().setMaterial(material);
    for (const [name, attribute, type] of [['POSITION','position','VEC3'],['NORMAL','normal','VEC3'],['TEXCOORD_0','uv','VEC2']]) {
      primitive.setAttribute(name, doc.createAccessor().setType(type).setArray(geometry.attributes[attribute].array).setBuffer(buffer));
    }
    primitive.setIndices(doc.createAccessor().setType('SCALAR').setArray(geometry.index.array).setBuffer(buffer));
    scene.addChild(doc.createNode(`Cover ${side}:${row}:${bay}:${k}`).setMesh(doc.createMesh().addPrimitive(primitive)));
    geometry.dispose();
  }
}
