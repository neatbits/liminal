import { PlacedSourceMap, PLACED_SOUNDS } from './placed-sources.js';
import { placedBuffer } from './placed-buffers.js';

// At most one voice per kind; hundreds of cabinets never become hundreds of loops.
export class PlacedAudio {
  constructor(engine,graph) {this.e=engine;this.g=graph;this.voices=new Map();this.every=0;}
  _voice(kind) {
    if(this.voices.has(kind))return this.voices.get(kind);
    const {ctx}=this.e,filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type='lowpass';filter.Q.value=.5;filter.frequency.value=PLACED_SOUNDS[kind].cutoff;gain.gain.value=0;
    const pan=ctx.createStereoPanner?.()??ctx.createGain();
    filter.connect(gain).connect(pan).connect(this.g.stepBus);
    const src=this.e._loop(placedBuffer(ctx,kind),filter);
    this.g.nodes.push(src,filter,gain,pan);
    const voice={gain,pan,filter};this.voices.set(kind,voice);return voice;
  }
  update(dt,listener,quiet) {
    if(!listener)return;
    const changed=this.map?.level!==listener.level;
    if(changed)this.map=new PlacedSourceMap(listener.level);
    this.every-=dt;if(!changed&&this.every>0)return;this.every=.25;
    const now=this.e.ctx.currentTime;
    for(const m of this.map.mix(listener,quiet)) {
      if(m.gain===0&&!this.voices.has(m.kind))continue;
      const v=this._voice(m.kind);
      // A level change silences old sources immediately, even within the same theme.
      if(changed){v.gain.gain.cancelScheduledValues(now);v.gain.gain.setValueAtTime(0,now);}
      v.gain.gain.setTargetAtTime(m.gain,now,.3);
      v.filter.frequency.setTargetAtTime(m.cutoff,now,.25);
      v.pan.pan?.setTargetAtTime(m.pan,now,.2);
    }
  }
}
