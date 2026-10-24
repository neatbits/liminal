// Produksjonsbygget må tegne både 2D og detaljert vindusgrafikk uten å miste konteksten.
import assert from 'node:assert/strict';
import { createLevel, TILE } from '../src/core/level.js';
import { paintWindows } from '../src/core/windows.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

export async function checkGraphics(browser, origin, { hardware = false } = {}) {
  const { call, evaluate } = browser;
  for (const theme of ['office', 'playroom', 'pool', 'basement']) {
    const level = createLevel({ name: `Graphics ${theme}`, theme, w: 12, h: 12, height: 3.4 });
    for (let z = 1; z < 11; z++) for (let x = 1; x < 11; x++) level.tiles[z * 12 + x] = TILE.FLOOR;
    paintWindows(level, [[4, 0], [5, 0], [6, 0], [7, 0]], true);
    autoLights(level, { spacing: 4, state: 1 });
    await call('Page.navigate', { url: 'about:blank' });
    await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(level)}` });
    await waitFor(() => evaluate(`window.liminal?.level.name === ${JSON.stringify(level.name)} && Boolean(liminal.viewer.world)`).catch(() => false), `${theme} graphics startup`);
    const result = await evaluate(`(async () => {
      const v = liminal.viewer;
      v.renderer.setAnimationLoop(null);
      liminal.layout.set('split'); v.updateSettings({effects:'full',renderScale:1});
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      v.mode='walk'; v.overview.enabled=false; v._applyLook();
      v.camera.position.set(5.7,1.65,2.4); v.camera.lookAt(5.7,1.6,0.8);
      v.world.update(0,[1,1,1,1]); v.postfx.render(0);
      const editor=liminal.editor; editor._render();
      const pixels=editor.ctx.getImageData(0,0,editor.canvas.width,editor.canvas.height).data;
      let painted=0; for(let i=3;i<pixels.length;i+=100) if(pixels[i])painted++;
      const gl=v.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
      return {lost:gl.isContextLost(),linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),
        painted,shader:v.world.group.getObjectByName('windowGlass')?.material.userData.windowView,
        gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
    })()`);
    assert.equal(result.lost, false, `${theme}: WebGL context remains available`);
    assert.equal(result.linked, true, `${theme}: all shader programs link`);
    assert.equal(result.shader, theme);
    assert.ok(result.painted > 100, `${theme}: 2D canvas draws`);
    if (hardware) assert.doesNotMatch(result.gpu, /swiftshader|llvmpipe|software/i, 'hardware check must use a real GPU');
    console.log(`PASS production 2D/3D and ${theme} windows: ${result.gpu}`);
  }
}
