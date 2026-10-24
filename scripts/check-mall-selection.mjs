import assert from 'node:assert/strict';
import { presetById } from '../src/gen/index.js';
import { SEED_MAX } from '../src/core/rng.js';
import { waitFor } from './browser-driver.mjs';

export async function checkMallSelection(browser,origin) {
  const {call,evaluate}=browser;
  await call('Page.navigate',{url:'about:blank'});
  await call('Page.navigate',{url:origin+'/'});
  await waitFor(()=>evaluate('document.querySelectorAll(".l-card").length>0').catch(()=>false),'landing examples');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.l-card')).filter(a=>a.hash.startsWith('#example=mall')).map(a=>a.hash)`),['#example=mall']);
  await call('Page.navigate',{url:'about:blank'});
  await call('Page.navigate',{url:origin+'/app/#example=corridor'});
  await waitFor(()=>evaluate('Boolean(window.liminal?.viewer.world)').catch(()=>false),'example chooser');
  for(const seed of [2,3,7]) {
    await evaluate(`Array.from(document.querySelectorAll('.menu-list button')).find(b=>b.textContent.includes('Examples')).click()`);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.modal .card-title')).filter(b=>b.textContent.startsWith('The Mall')).length`),1);
    await evaluate(`(()=>{
      const b=Array.from(document.querySelectorAll('.modal .card')).find(b=>b.querySelector('.card-title').textContent==='The Mall');
      const original=Math.random;
      Math.random=()=>{Math.random=original;return ${(seed-.5)/SEED_MAX};};
      try{b.click();}finally{Math.random=original;}
    })()`);
    await waitFor(()=>evaluate(`liminal.level.seed===${seed} && liminal.level.name==='The Mall'`),'randomized Mall example');
    const expected=presetById('mall').make({seed});
    assert.deepEqual(await evaluate('Array.from(liminal.level.tiles)'),Array.from(expected.tiles));
  }
  console.log('PASS one public Mall example opens all three layouts with fresh seeds');
}
