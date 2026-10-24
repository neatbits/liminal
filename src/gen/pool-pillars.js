import { setPillar } from '../core/pillars.js';

/** Larger halls get fewer, broader cylinders, leaving swimming lanes between them. */
export function poolPillars(level, r, inset) {
  const short=Math.min(r.x1-r.x0+1,r.z1-r.z0+1);
  const diameter=short>=18?3:short>=13?2:.5;
  const pad=diameter>.5?Math.ceil(diameter/2)+1:1;
  const spacing=diameter>.5?diameter+3:3;
  for(let z=r.z0+inset+pad;z<=r.z1-inset-pad;z+=spacing) {
    for(let x=r.x0+inset+pad;x<=r.x1-inset-pad;x+=spacing)setPillar(level,x,z,diameter);
  }
}
