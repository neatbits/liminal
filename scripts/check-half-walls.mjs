import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

export async function checkHalfWalls(browser, origin) {
  const { call, evaluate } = browser;
  const l = createLevel({ name: 'Half-wall hall check', theme: 'backrooms', w: 24, h: 18 });
  for (let z = 1; z < 17; z++) for (let x = 1; x < 23; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  for (let x = 2; x <= 21; x++) l.tiles[8 * l.w + x] = TILE.WALL;
  for (const x of [6, 17]) {
    for (let k = -1; k <= 1; k++) { l.tiles[8 * l.w + x + k] = TILE.FLOOR; l.ceilings[8 * l.w + x + k] = 24; }
    l.objects.push({ id: 'halfwall', x, z: 8, rot: 0 });
  }
  for (const x of [11, 12]) l.tiles[8 * l.w + x] = TILE.FLOOR;
  autoLights(l, { spacing: 3, state: 1 });
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(l)}` });
  await waitFor(() => evaluate('window.liminal?.level.name === "Half-wall hall check" && Boolean(liminal.viewer.world)').catch(() => false), 'half-wall hall');
  const ready = await evaluate(`(async () => {
    const v = liminal.viewer; await v.world.objects.ready;
    v.renderer.setAnimationLoop(null); liminal.layout.set('3d'); v.mode = 'walk'; v.overview.enabled = false;
    v.updateSettings({effects:'full',grain:false,vhs:false,mood:'normal',renderScale:1,waterReflections:false});
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {items:v.world.objects.items.filter(Boolean).length,
      panels:v.world.objects.items.map(g => g.children.length),
      textured:v.world.objects.items.every(g => g.children[0].material.uniforms.map.value?.isTexture)};
  })()`);
  // Tapetet, og topplist + sokkel på én palett (object-parts.js slår sammen fargedelene).
  assert.equal(ready.items, 2); assert.deepEqual(ready.panels, [2, 2]); assert.equal(ready.textured, true);
  for (const [name, z, targetZ] of [['front', 13, 8], ['back', 4, 9]]) {
    const result = await evaluate(`(() => {
      const v = liminal.viewer; v.camera.position.set(10.5, 1.65, ${z});
      v.camera.lookAt(9, 1.3, ${targetZ}); v.world.update(0,[1,1,1,1]); v.postfx.render(0);
      const gl = v.renderer.getContext();
      const point = v.camera.position.clone().set(6.5,.6,8.5+${name === 'front' ? 0.11 : -0.11}).project(v.camera);
      const pixel = new Uint8Array(4); gl.readPixels(Math.floor((point.x+1)*.5*gl.drawingBufferWidth),
        Math.floor((point.y+1)*.5*gl.drawingBufferHeight),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      return {png:v.renderer.domElement.toDataURL('image/png').split(',')[1],lost:gl.isContextLost(),
        wallpaper:Array.from(pixel), linked:v.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)};
    })()`);
    assert.equal(result.lost, false); assert.equal(result.linked, true);
    assert.ok(result.wallpaper.slice(0,3).reduce((a,b) => a+b,0) > 200, `${name}: wallpaper receives ceiling light (${result.wallpaper})`);
    writeFileSync(`node_modules/.cache/level0-half-walls-${name}.png`, Buffer.from(result.png, 'base64'));
  }
  console.log('PASS Level 0 half-walls, wallpaper and solid caps rendered from both sides');
}
