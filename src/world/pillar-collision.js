import { pillarsNear } from '../core/pillars.js';

/** Push against the actual footprint, including columns anchored in neighbouring cells. */
export function pushFromPillars(level,x,z,r) {
  for(const p of pillarsNear(level,x,z,r)) {
    if(p.round) {
      const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz),min=r+p.radius;
      if(d>=min)continue;
      [x,z]=d>1e-9?[p.x+dx/d*min,p.z+dz/d*min]:[p.x+min,p.z];
    } else {
      const {x:px,z:pz,radius:h}=p;
      const qx=Math.max(px-h,Math.min(x,px+h)),qz=Math.max(pz-h,Math.min(z,pz+h));
      const dx=x-qx,dz=z-qz,d=Math.hypot(dx,dz);
      if(d>=r)continue;
      if(d>1e-9) {[x,z]=[qx+dx/d*r,qz+dz/d*r];continue;}
      const pushes=[[px-h-r-x,0],[px+h+r-x,0],[0,pz-h-r-z],[0,pz+h+r-z]];
      pushes.sort((a,b)=>Math.abs(a[0]+a[1])-Math.abs(b[0]+b[1]));
      x+=pushes[0][0];z+=pushes[0][1];
    }
  }
  return [x,z];
}
