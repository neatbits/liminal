// Production assets must load, match their collision boxes and retain linked credits.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { INTERIOR_OBJECTS } from '../src/core/object-catalog-interiors.js';
import { MALL_OBJECTS } from '../src/core/object-catalog-mall.js';
import { ELECTRONIC_OBJECTS } from '../src/core/object-catalog-electronics.js';
import { objectPose } from '../src/core/objects.js';
import { waitFor } from './browser-driver.mjs';
import { checkBedding } from './check-bedding.mjs';
const IMPORTED_OBJECTS = { ...INTERIOR_OBJECTS, ...MALL_OBJECTS, ...ELECTRONIC_OBJECTS };

function fixture(rot) {
  const height = Math.ceil(Object.keys(IMPORTED_OBJECTS).length / 4) * 6 + 6;
  const level = createLevel({ name: `Imported models ${rot}`, theme: 'office', w: 22, h: height, height: 3.4 });
  for (let z = 1; z < height - 1; z++) for (let x = 1; x < 21; x++) level.tiles[z * 22 + x] = TILE.FLOOR;
  const walls = [[11, 1], [20, 11], [11, height - 2], [1, 11]];
  level.objects = Object.keys(IMPORTED_OBJECTS).map((id, i) => {
    const [x, z] = id === 'wallboard' ? walls[rot] : [3 + i % 4 * 5, 4 + Math.floor(i / 4) * 6];
    return { id, x, z, rot };
  });
  for (const { x, z } of level.objects.filter(o => ['mug', 'desklamp'].includes(o.id))) level.objects.push({ id: 'desk2', x, z, rot });
  autoLights(level, { spacing: 4, state: 1 });
  return level;
}

export async function checkImportedModels(browser, origin) {
  const { call, evaluate } = browser;
  for (let rot = 0; rot < 4; rot++) {
    const level = fixture(rot);
    await call('Page.navigate', { url: 'about:blank' });
    await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(level)}` });
    await waitFor(() => evaluate(`window.liminal?.level.name === ${JSON.stringify(level.name)} && Boolean(liminal.viewer.world)`).catch(() => false), level.name);
    const result = await evaluate(`(async () => {
      const v = liminal.viewer; v.renderer.setAnimationLoop(null);
      await v.world.objects.ready;
      liminal.layout.set('3d'); v.updateSettings({effects:'reduced',renderScale:1});
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      v.mode='walk'; v.overview.enabled=false; v._applyLook();
      v.camera.position.set(11,17,26); v.camera.lookAt(11,0,10);
      v.world.update(0,[1,1,1,1]); v.postfx.render(0);
      const bounds = liminal.level.objects.map((o,i) => {
        const item=v.world.objects.items[i];
        if(!item) return null;
        item.updateWorldMatrix(true,true);
        const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
        item.traverse(m=>{
          if(!m.isMesh)return;
          const a=m.geometry.attributes.position,p=m.position.clone();
          for(let j=0;j<a.count;j++){
            p.fromBufferAttribute(a,j).applyMatrix4(m.matrixWorld);
            for(const [k,axis]of ['x','y','z'].entries()){min[k]=Math.min(min[k],p[axis]);max[k]=Math.max(max[k],p[axis]);}
          }
        });
        return {min,max};
      });
      return {bounds,lost:v.renderer.getContext().isContextLost(),linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};
    })()`);
    assert.equal(result.lost, false);
    assert.equal(result.linked, true);
    for (const [i, o] of level.objects.entries()) {
      assert.ok(result.bounds[i], `${o.id}: GLB loaded`);
      const p = objectPose(level, o), b = result.bounds[i];
      const expected = { min: [p.x - p.w / 2, p.y, p.z - p.d / 2], max: [p.x + p.w / 2, p.y + p.h, p.z + p.d / 2] };
      for (const side of ['min', 'max']) for (let k = 0; k < 3; k++) {
        assert.ok(Math.abs(b[side][k] - expected[side][k]) < 0.015, `${o.id} rot ${rot} ${side}[${k}]: ${b[side][k]} vs ${expected[side][k]}`);
      }
    }
    if (rot === 0) {
      const { data } = await call('Page.captureScreenshot', { format: 'png' });
      writeFileSync('node_modules/.cache/imported-models.png', Buffer.from(data, 'base64'));
    }
  }
  await checkBedding(browser, origin);
  await call('Page.navigate', { url: origin + '/about/' });
  await waitFor(() => evaluate(`Boolean(document.querySelector('#model-credits li'))`).catch(() => false), 'model credits');
  const credits = await evaluate(`Array.from(document.querySelectorAll('#model-credits li'),li=>({text:li.textContent,links:Array.from(li.querySelectorAll('a'),a=>a.getAttribute('href'))}))`);
  for (const def of Object.values(IMPORTED_OBJECTS)) {
    const a = def.attribution, row = credits.find(c => c.text.startsWith(def.label + ':'));
    assert.ok(row, `${def.label}: credit visible`);
    assert.ok(row.text.includes(a.author) && row.text.includes(a.license) && row.text.includes(a.changes));
    for (const url of [a.source, a.authorUrl, a.licenseUrl]) assert.ok(row.links.includes(url));
  }
  console.log(`PASS ${Object.keys(IMPORTED_OBJECTS).length} imported models: production loading, geometry bounds in four rotations, desk support, shaders and linked credits`);
}
