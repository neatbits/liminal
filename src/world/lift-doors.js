// Det som beveger seg og lyser i heisene (world/lifts.js): dørbladene, som skyves til hver sin side inn i veggen, og
// lampene – knappen ute, etasjelampene over døren og knappene inne. Dørbladene har bakt lys som resten av verdenen
// (rekkverkets materiale); lampene lyser av seg selv og slukner med strømmen.
import * as THREE from 'three';
import { MeshData } from './mesher.js';
import { toGeometry } from './materials.js';
import { liftLeaves, liftLamps, liftFrame, neutralField } from './lifts.js';
import { flickerGroup } from './lighting.js';

const LIT = new THREE.Color('#ffb347');
const DARK = new THREE.Color('#2b2724');
const GLOW = new THREE.Color('#fff2d8').multiplyScalar(1.5);
const tintColor = new THREE.Color();

/**
 * @param lifts level.lifts (core/elevators.js)
 * @returns {{ group, set(id, open), show(id, { at, call, target }), setPower(p), update(flicker, tint), dispose() }}
 *          open: 0 = lukket … 1 = åpen; at/target: etasjenummer, call: knappen ute lyser
 */
export function createLiftDoors(lifts, field, material) {
  const group = new THREE.Group();
  group.name = 'lifts';
  const geometries = [];
  const lampGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  const materials = [];
  const byId = new Map();
  let power = 1;
  const lamp = (p) => {
    const m = new THREE.MeshBasicMaterial({ color: DARK.clone() });
    m.userData.lit = false;
    materials.push(m);
    const mesh = new THREE.Mesh(lampGeometry, m);
    mesh.position.set(...p);
    group.add(mesh);
    return m;
  };
  // Taklyset i vognen: et lyspanel midt i taket som blafrer med lysets blinkegruppe (temaets armatur brukes ikke).
  const panelGeometry = new THREE.PlaneGeometry(0.9, 0.5).rotateX(Math.PI / 2);
  const panels = lifts.map((lift) => {
    const m = new THREE.MeshBasicMaterial({ color: GLOW.clone(), side: THREE.DoubleSide });
    materials.push(m);
    const mesh = new THREE.Mesh(panelGeometry, m);
    mesh.position.set(...liftFrame(lift).P(2, 2, lift.head - lift.floor - 0.015));
    group.add(mesh);
    return { m, group: flickerGroup(...lift.lamp) };
  });
  for (const lift of lifts) {
    const leaves = liftLeaves(lift, () => new MeshData(neutralField(field))).map(({ mesh, slide }) => {
      const g = toGeometry(mesh);
      geometries.push(g);
      const m = new THREE.Mesh(g, material);
      m.name = 'liftDoor';
      group.add(m);
      return { mesh: m, slide };
    });
    const spots = liftLamps(lift);
    byId.set(lift.id, { lift, leaves, call: lamp(spots.call), sign: spots.sign.map(lamp), panel: spots.panel.map(lamp) });
  }
  const paint = (m, on) => {
    m.userData.lit = on;
    m.color.copy(on ? LIT : DARK);
    if (on) m.color.multiplyScalar(0.25 + 0.75 * power);
  };
  return {
    group,
    set(id, open) {
      for (const { mesh, slide } of byId.get(id)?.leaves ?? []) mesh.position.set(slide[0] * open, 0, slide[1] * open);
    },
    show(id, { at, call, target }) {
      const d = byId.get(id);
      if (!d) return;
      paint(d.call, !!call);
      d.lift.stops.forEach((k, i) => {
        paint(d.sign[i], k === at);
        paint(d.panel[i], k === target);
      });
    },
    setPower(p) {
      power = p;
      for (const m of materials) if (m.userData.lit !== undefined) paint(m, m.userData.lit);
    },
    /** Hver ramme: taklyset følger blinkeverdiene (som armaturene, world/fixtures.js), strømmen og lysfargen. */
    update(flicker, tint = [1, 1, 1]) {
      for (const p of panels) p.m.color.copy(GLOW).multiply(tintColor.setRGB(...tint)).multiplyScalar((0.04 + 0.96 * flicker[p.group]) * power);
    },
    dispose() {
      for (const g of geometries) g.dispose();
      lampGeometry.dispose();
      panelGeometry.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
