import { ccBy } from './object-credit.js';

export const GHOST={
  label:'Ghost',file:'animated_ghost_nightmare_mode',height:1.7,hover:.23,clothEnd:.125,clothPeriod:3.4,turn:0,
  ...ccBy('Ghost from Room 226','fatalityferi',
    'https://sketchfab.com/3d-models/ghost-from-room-226-9f135939fe294cffa74e2156ced052a2',
    'https://sketchfab.com/fatalityferi',
    'scaled and optimized; cloth animation resampled into sixteen poses; only upright cloth motion is played; floating motion and material adapted'),
};

/** Ease back and forth through the upright cloth poses, excluding the authored collapse. */
export function ghostClothTime(time) {
  return GHOST.clothEnd*(.5-.5*Math.cos(time*Math.PI*2/GHOST.clothPeriod));
}

/** Visible motion only; AI coordinates and collision remain on the walkable surface. */
export function ghostPose(time,ai,player) {
  return {x:ai.x,y:ai.y+GHOST.hover+Math.sin(time*1.35)*.065+Math.sin(time*2.1+.7)*.015,z:ai.z,
    yaw:Math.atan2(player.x-ai.x,player.z-ai.z)+GHOST.turn,
    roll:Math.sin(time*.8)*.025,pitch:ai.state==='hunt'?.065:Math.sin(time*.65)*.015};
}
