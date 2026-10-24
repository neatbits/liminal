import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { waitFor } from './browser-driver.mjs';
import { createLevel,TILE } from '../src/core/level.js';
import { DOOR,setDoor } from '../src/core/doors.js';
import { encodeLevel } from '../src/core/serialize.js';

export async function checkMobilePlayer(browser,origin) {
  const {call,evaluate}=browser;
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const draft=await evaluate(`localStorage.getItem('liminal.draft.v1')`);
  const open=async hash=>{
    await call('Page.navigate',{url:'about:blank'});
    await waitFor(()=>evaluate('location.href==="about:blank"').catch(()=>false),'blank before phone navigation');
    await call('Page.navigate',{url:`${origin}/app/${hash}`});
    await waitFor(()=>evaluate('Boolean(window.liminal?.mobile && document.querySelector(".mobile-home")) && document.readyState==="complete"').catch(()=>false),'phone room chooser');
  };
  const center=selector=>evaluate(`(()=>{const b=document.querySelector('${selector}');if(!b)throw new Error('Missing ${selector}: '+location.href+' '+document.body.innerText.slice(0,150));b.scrollIntoView({block:'nearest'});
    const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  const touch=(type,points)=>call('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({...p,id:p.id??i+1,radiusX:3,radiusY:3,force:1}))});
  const tap=async selector=>{const p=await center(selector);await touch('touchStart',[p]);await touch('touchEnd',[]);};
  await open('#example=corridor');
  assert.equal(await evaluate(`document.querySelectorAll('[data-example^="mall"]').length`),1);
  assert.equal(await evaluate(`Boolean(document.querySelector('#editor-canvas,#sidebar,#menus')||liminal.editor)`),false);
  assert.equal(await evaluate(`liminal.viewer.world===null && !document.querySelector('.modal')`),true);
  let shot=await call('Page.captureScreenshot',{format:'png'});
  writeFileSync('node_modules/.cache/phone-room-chooser.png',Buffer.from(shot.data,'base64'));
  await tap('[data-example="current"]');
  await waitFor(()=>evaluate('liminal.viewer.mode==="walk" && !liminal.viewer.walk.paused'),'phone starts walking');
  await evaluate('liminal.viewer.world.objects.ready');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.touch-controls')).display!=='none'`),true);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  // Floating joystick: the thumb lands anywhere on the left half; a small push is slower than a full one.
  const before=await evaluate('liminal.viewer.walk.walker.x');
  await tap('[data-control="run"]');
  assert.equal(await evaluate('liminal.viewer.walk.input.running'),true,'Run toggles on');
  await touch('touchStart',[{x:90,y:600,id:1}]);
  assert.equal(await evaluate(`document.querySelector('.touch-stick').classList.contains('active')`),true);
  await touch('touchMove',[{x:90,y:575,id:1}]);
  const half=await evaluate('liminal.viewer.walk.input.forward');
  assert.ok(half>.2&&half<.6,`partial push walks slowly (${half})`);
  await touch('touchMove',[{x:90,y:480,id:1}]);
  assert.ok(Math.abs(await evaluate('liminal.viewer.walk.input.forward')-1)<1e-6,'full push walks at full speed');
  await evaluate('new Promise(r=>setTimeout(r,350))');
  assert.ok(await evaluate('liminal.viewer.walk.walker.x')>before+.25,'joystick actually moves the walker');
  await touch('touchEnd',[]);
  assert.equal(await evaluate('liminal.viewer.walk.input.forward===0'),true);
  assert.equal(await evaluate(`document.querySelector('.touch-stick').classList.contains('active')`),false);
  await tap('[data-control="run"]');
  assert.equal(await evaluate('liminal.viewer.walk.input.running'),false,'Run toggles off');
  // A 100 px swipe on the right half turns clearly (about 45°), not a few degrees.
  const yaw=await evaluate('liminal.viewer.walk.walker.yaw');
  await touch('touchStart',[{x:250,y:350,id:3}]);
  await touch('touchMove',[{x:350,y:350,id:3}]);
  await touch('touchEnd',[]);
  await evaluate('new Promise(r=>setTimeout(r,100))');
  const turned=Math.abs(await evaluate('liminal.viewer.walk.walker.yaw')-yaw);
  assert.ok(turned>.5&&turned<1.2,`right-side swipe turns the view (${turned.toFixed(2)} rad)`);
  shot=await call('Page.captureScreenshot',{format:'png'});
  writeFileSync('node_modules/.cache/phone-walking-portrait.png',Buffer.from(shot.data,'base64'));
  const jump=await center('[data-control="jump"]');
  await touch('touchStart',[jump]);await evaluate('new Promise(r=>setTimeout(r,120))');
  assert.equal(await evaluate('liminal.viewer.walk.walker.vy>0||liminal.viewer.walk.walker.floorY>.05'),true,'Jump actually lifts the walker');
  await touch('touchEnd',[]);
  await tap('.touch-menu');
  assert.equal(await evaluate('liminal.viewer.walk.paused'),true);
  assert.equal(await evaluate('liminal.viewer.walk.input.buttons.size'),0);
  await tap('[data-act="resume"]');
  assert.equal(await evaluate('liminal.viewer.walk.paused'),false);
  await call('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  assert.equal(await evaluate(`[...document.querySelectorAll('.touch-controls button')].every(b=>{
    const r=b.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})`),true,'controls fit landscape');
  shot=await call('Page.captureScreenshot',{format:'png'});
  writeFileSync('node_modules/.cache/phone-walking-landscape.png',Buffer.from(shot.data,'base64'));
  await tap('.touch-menu');await tap('[data-act="exit"]');
  assert.equal(await evaluate('!liminal.home.hidden&&liminal.viewer.mode==="overview"'),true);
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const stopped=await evaluate('liminal.viewer.time');await evaluate('new Promise(r=>setTimeout(r,100))');
  assert.equal(await evaluate('liminal.viewer.time'),stopped,'the chooser stops rendering the hidden world');
  assert.equal(await evaluate(`localStorage.getItem('liminal.draft.v1')`),draft,'walking on a phone preserves the editor draft');

  // A shared room also opens in the player; Use opens its actual door on the walk copy.
  const l=createLevel({name:'Shared phone room',w:12,h:12,theme:'hotel'});
  for(let z=1;z<11;z++)for(let x=1;x<11;x++)l.tiles[z*l.w+x]=z===5?TILE.WALL:TILE.FLOOR;
  l.tiles[5*l.w+5]=TILE.DOOR;setDoor(l,5,5,DOOR.CLOSED);l.spawn={x:5.5,z:7,a:0};
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await open(`#room=${await encodeLevel(l)}`);await tap('[data-example="current"]');
  await waitFor(()=>evaluate('liminal.viewer.mode==="walk"'),'shared phone room walking');
  await tap('[data-control="use"]');
  assert.equal(await evaluate(`liminal.viewer.walk.level.meta[65]&3`),DOOR.OPEN);
  assert.equal(await evaluate(`liminal.level.meta[65]&3`),DOOR.CLOSED);
  await evaluate('window.dispatchEvent(new Event("blur"))');
  assert.equal(await evaluate('liminal.viewer.walk.paused&&!liminal.viewer.walk.input.enabled'),true);
  assert.deepEqual(browser.errors,[]);
  console.log('PASS phone: no editor, chooser/shared rooms, real touch movement/look/run/jump/doors, pause, landscape and draft preservation');
}
