import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { launchBrowser,waitFor } from './browser-driver.mjs';

const server=await createServer({server:{host:'127.0.0.1',port:0,open:false}});await server.listen();let browser;
try {
  browser=await launchBrowser();
  await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.protocol==='http:')localStorage.setItem('liminal.settings.v1',JSON.stringify({sound:false,music:false,effects:'reduced',renderScale:.5}));`});
  await browser.call('Page.navigate',{url:`http://127.0.0.1:${server.httpServer.address().port}/app/#example=office`});
  await waitFor(()=>browser.evaluate('Boolean(window.liminal?.viewer.world)').catch(()=>false),'audio scene');
  await browser.evaluate('liminal.viewer.renderer.setAnimationLoop(null)');
  const render=(kind,options={})=>browser.evaluate(`(async()=>{const {renderPlaced}=await import('/scripts/placed-audio-probe.js');return renderPlaced('${kind}',${JSON.stringify(options)});})()`);
  for(const kind of ['fountain','escalator','arcade']) {
    const normal=await render(kind),reverse=await render(kind,{reverse:true}),blocked=await render(kind,{blocked:true});
    const volume=s=>s.left+s.right;
    assert.ok(normal.peak>.001&&normal.peak<.1,`${kind}: audible, restrained source`);
    assert.ok(normal.right>normal.left*1.3&&reverse.left>reverse.right*1.3,`${kind}: turns with the listener`);
    assert.ok(volume(blocked)<volume(normal)*.25,`${kind}: muffled by obstacles ${JSON.stringify({normal,blocked})}`);
    for(const options of [{far:true},{power:0},{muted:true},{paused:true}]) {
      const state=await render(kind,options);assert.equal(state.peak,0,`${kind}: silence ${JSON.stringify(options)}`);
    }
    const quiet=await render(kind,{quiet:.12});assert.ok(volume(quiet)<volume(normal)*.13);
    console.log('PASS placed Web Audio:',kind,normal);
  }
  assert.deepEqual(browser.errors,[]);
} finally {await browser?.close();await server.close();}
