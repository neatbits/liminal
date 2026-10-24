import * as THREE from 'three';
import { getTheme } from '../core/themes.js';
import { PLAY_BALL_RADIUS } from '../core/play-balls.js';

export function playball(key) {
  const colors = getTheme('playroom').pitColors;
  const variant = Number(key.split(':')[1]) || 0;
  return [{ geometry: new THREE.IcosahedronGeometry(PLAY_BALL_RADIUS, 1).translate(0, PLAY_BALL_RADIUS, 0),
    color: new THREE.Color(colors[variant % colors.length]), map: null, arm: null, alphaTest: 0, side: THREE.FrontSide }];
}
