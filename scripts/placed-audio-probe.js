// Render the actual source mixer offline; nothing is played through the speakers.
import { AudioEngine } from '../src/audio/engine.js';
import { PlacedAudio } from '../src/audio/placed-audio.js';
import { sourceMix } from '../src/audio/placed-sources.js';

export async function renderPlaced(kind,{far=false,blocked=false,reverse=false,muted=false,paused=false,power=1,quiet=1}={}) {
  const rate=24000,ctx=new OfflineAudioContext(2,rate*2,rate),audio=new AudioEngine();
  audio.ctx=ctx;audio.master=ctx.createGain();audio.master.gain.value=1;audio.master.connect(ctx.destination);
  const bus=ctx.createGain();bus.gain.value=.45;bus.connect(audio.master);
  const graph={nodes:[],stepBus:bus,sound:{hum:0},hum:ctx.createGain(),ambient:{level:quiet,update(){}}};audio.graph=graph;
  const spatial=new PlacedAudio(audio,graph),level={};
  const listener={level,x:far?-25:0,y:0,z:0,yaw:reverse?Math.PI:0,power};
  const source={kind,x:2,y:1.4,z:-1};
  spatial.map={level,mix:l=>[{kind,...sourceMix(source,l,blocked,quiet)}]};
  audio.playing=!paused;audio.enabled=!muted;graph.placed=spatial;
  audio.listen(listener);audio.update(.25,0);
  const rendered=await ctx.startRendering();
  const rms=ch=>{const d=rendered.getChannelData(ch);let energy=0;for(const v of d)energy+=v*v;return Math.sqrt(energy/d.length);};
  let peak=0;for(let ch=0;ch<2;ch++)for(const v of rendered.getChannelData(ch))peak=Math.max(peak,Math.abs(v));
  audio._teardown();
  return {left:rms(0),right:rms(1),peak};
}
