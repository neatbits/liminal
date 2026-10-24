// Bake a dense recorded morph clip into a small set of interpolated poses.
// Source files are retained; the output loops smoothly back to its first pose.
export function sampleMorphClip(doc,count) {
  const root=doc.getRoot(),animation=root.listAnimations()[0];
  if(!animation)throw new Error('morphSamples requires an animated source');
  for(const channel of animation.listChannels()) {
    if(channel.getTargetPath()!=='weights')throw new Error('morphSamples supports weight animation only');
    const node=channel.getTargetNode(),mesh=node.getMesh(),sampler=channel.getSampler();
    if(sampler.getInterpolation()!=='LINEAR')throw new Error('morphSamples requires linear animation');
    const times=sampler.getInput().getArray(),weights=sampler.getOutput().getArray();
    const n=mesh.listPrimitives()[0].listTargets().length,duration=times.at(-1);
    for(const primitive of mesh.listPrimitives()) {
      const old=primitive.listTargets(),buffer=primitive.getAttribute('POSITION').getBuffer();
      for(const target of old)primitive.removeTarget(target);
      for(let frame=0;frame<count;frame++) {
        const t=duration*frame/count;let next=0;while(next<times.length-1&&times[next]<t)next++;
        const previous=Math.max(0,next-1),f=next===previous?0:Math.max(0,Math.min(1,(t-times[previous])/(times[next]-times[previous])));
        const target=doc.createPrimitiveTarget();
        for(const semantic of ['POSITION','NORMAL']) {
          const base=primitive.getAttribute(semantic);if(!base)continue;
          const data=new Float32Array(base.getCount()*3);
          for(let k=0;k<n;k++) {
            const weight=weights[previous*n+k]*(1-f)+weights[next*n+k]*f;
            if(Math.abs(weight)<1e-7)continue;
            const delta=old[k].getAttribute(semantic)?.getArray();if(!delta)continue;
            for(let j=0;j<data.length;j++)data[j]+=delta[j]*weight;
          }
          target.setAttribute(semantic,doc.createAccessor().setType('VEC3').setArray(data).setBuffer(buffer));
        }
        primitive.addTarget(target);
      }
      for(const target of old)target.dispose();
    }
    const buffer=mesh.listPrimitives()[0].getAttribute('POSITION').getBuffer();
    const t=Float32Array.from({length:count+1},(_,i)=>duration*i/count),w=new Float32Array((count+1)*count);
    for(let i=0;i<=count;i++)w[i*count+i%count]=1;
    sampler.setInput(doc.createAccessor().setType('SCALAR').setArray(t).setBuffer(buffer));
    sampler.setOutput(doc.createAccessor().setType('SCALAR').setArray(w).setBuffer(buffer));
    node.setWeights(Array.from({length:count},(_,i)=>i===0?1:0));
    mesh.setWeights(Array.from({length:count},(_,i)=>i===0?1:0));
    mesh.setExtras({...mesh.getExtras(),targetNames:Array.from({length:count},(_,i)=>`Float ${i+1}`)});
  }
}
