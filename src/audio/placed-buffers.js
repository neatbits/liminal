import { mulberry32 } from '../core/rng.js';

// Restrained original loops; no recordings/downloads. Gentle seams prevent looping clicks.
export function placedBuffer(ctx,kind) {
  const seconds=8,buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*seconds),ctx.sampleRate);
  const data=buffer.getChannelData(0),rand=mulberry32(61),tau=Math.PI*2;
  let low=0;
  for(let i=0;i<data.length;i++) {
    const t=i/ctx.sampleRate,white=rand()*2-1;
    low+=(white-low)*(1-Math.exp(-tau*900/ctx.sampleRate));
    const seam=Math.min(1,t/.04,(seconds-t)/.04);
    let value;
    if(kind==='fountain')value=low*.55+white*.12+Math.sin(t*tau*230)*Math.sin(t*tau*3)*.025;
    else if(kind==='escalator')value=Math.sin(t*tau*50)*.13+Math.sin(t*tau*100)*.035+low*(.04+.025*Math.sin(t*tau*4));
    else {
      const phase=t%8.0,notes=[330,440,392,523],note=notes[Math.floor(t/.25)%notes.length];
      const beat=(phase%.25)/.25,envelope=Math.sin(Math.PI*beat)**2;
      value=phase<.75?Math.sin(t*tau*note)*envelope*.20:0;
    }
    data[i]=value*seam;
  }
  return buffer;
}
