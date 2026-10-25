// Stoppskiltet (Level 0 og parkeringshuset): et åttekantet skilt på en firkantet stolpe med
// fotplate. Grafikken (rød åttekant, hvit kant, STOP) tegnes på canvas – et vanlig trafikkskilt,
// ingen modellfil.
import * as THREE from 'three';
import { box, parts } from './props-geo.js';
import { canvasTexture } from './props-kiosk-art.js';

export const SIGN = 0.62; // m mellom motstående flater
export const SIGN_CENTRE = 1.95; // høyden midt på skiltet
const PLATE = 0.012; // tykkelsen på skiltplaten
const POLE = 0.05;
const CORNER = Math.PI / 8; // hjørnene ligger mellom flatene: rett topp, bunn og sider
const R = SIGN / 2 / Math.cos(CORNER);

function octagon(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) ctx.lineTo(cx + r * Math.cos(CORNER + (k * Math.PI) / 4), cy + r * Math.sin(CORNER + (k * Math.PI) / 4));
  ctx.closePath();
}

/** Forsiden: hvit kant, rød flate og STOP i hvite versaler. Teksturen dekker kvadratet rundt åttekanten. */
function faceTexture() {
  return canvasTexture(512, 512, (ctx, w) => {
    const r = w / 2 / Math.cos(CORNER);
    ctx.fillStyle = '#f2efe6';
    octagon(ctx, w / 2, w / 2, r);
    ctx.fill();
    ctx.fillStyle = '#b0161c';
    octagon(ctx, w / 2, w / 2, r - 22);
    ctx.fill();
    ctx.fillStyle = '#f2efe6';
    ctx.font = 'bold 150px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STOP', w / 2, w / 2 + 8, w * 0.8);
  });
}

/** Åttekanten som flate i xy-planet (mot +z), med uv over kvadratet SIGN × SIGN. */
function faceGeometry() {
  const shape = new THREE.Shape();
  for (let k = 0; k < 8; k++) {
    const a = CORNER + (k * Math.PI) / 4;
    if (k) shape.lineTo(R * Math.cos(a), R * Math.sin(a));
    else shape.moveTo(R * Math.cos(a), R * Math.sin(a));
  }
  const g = new THREE.ShapeGeometry(shape);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / SIGN + 0.5, pos.getY(i) / SIGN + 0.5);
  g.translate(0, SIGN_CENTRE, PLATE / 2 + 0.001);
  return g;
}

export function stopsign() {
  // Platen: et åttekantet prisme med samme hjørner som forsiden, i grå metall på baksiden og kanten.
  const plate = new THREE.CylinderGeometry(R, R, PLATE, 8, 1, false, CORNER);
  plate.rotateX(Math.PI / 2); // thetaStart = CORNER gir da hjørnene i samme vinkler som forsiden
  plate.translate(0, SIGN_CENTRE, 0);
  const pole = box(POLE, SIGN_CENTRE + 0.1, POLE, 0, (SIGN_CENTRE + 0.1) / 2, -PLATE / 2 - POLE / 2);
  const foot = box(0.3, 0.025, 0.3, 0, 0.0125, -PLATE / 2 - POLE / 2);
  return parts([
    { color: '#ffffff', map: faceTexture(), geoms: [faceGeometry()] },
    { color: '#9a9c9e', geoms: [plate, pole] },
    { color: '#4a4b4d', geoms: [foot] },
  ]);
}
