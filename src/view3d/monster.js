// Monsteret i 3D: en altfor høy, altfor tynn, kullsvart skikkelse (synes som en silhuett også i
// tåken) – oppdratte skuldre, armer som henger ned til knærne og ender i lange fingre, en tynn hals
// og et avlangt hode som henger på skakke. Ansiktet ser alltid på deg: lysende øyne og et bredt smil
// som gløder i mørket. Den puster, armene svaier, hodet rykker til innimellom, og når den jakter,
// lener den seg fram.
import * as THREE from 'three';

function faceTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const glow = (x, y, r) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,250,1)');
    g.addColorStop(0.35, 'rgba(255,250,235,0.9)');
    g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Øynene er ikke helt like store, og sitter litt skjevt.
  glow(86, 88, 24);
  glow(170, 96, 18);
  // Smilet: en bred, skjev bue med tenner, nesten fra øre til øre.
  ctx.save();
  ctx.shadowColor = 'rgba(255,245,230,0.9)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(255,250,240,0.95)';
  ctx.beginPath();
  ctx.moveTo(26, 140);
  ctx.quadraticCurveTo(128, 246, 234, 136);
  ctx.quadraticCurveTo(128, 196, 26, 140);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(20,10,10,0.8)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 13; k++) {
    const x = 44 + k * 14;
    const t = Math.sin((k / 12) * Math.PI);
    ctx.beginPath();
    ctx.moveTo(x, 142 + t * 30);
    ctx.lineTo(x + 2, 160 + t * 36);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** En stav (sylinder) fra a til b, med radius ra i a og rb i b. */
function limb(a, b, ra, rb = ra, segments = 7) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(rb, ra, d.length(), segments);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}

/** Arm med albue og fire lange fingre; side = −1 (venstre) eller 1 (høyre). Origo i skulderen. */
function arm(side) {
  const sh = [0, 0, 0];
  const elbow = [side * 0.07, -0.55, 0.03];
  const wrist = [side * 0.11, -1.08, 0.02];
  const parts = [limb(sh, elbow, 0.045, 0.035), limb(elbow, wrist, 0.035, 0.025)];
  for (let f = 0; f < 4; f++) {
    const spread = (f - 1.5) * 0.035;
    parts.push(limb(wrist, [wrist[0] + side * 0.02 + spread * 0.4, wrist[1] - 0.24 - (f % 2) * 0.04, wrist[2] + spread], 0.012, 0.004, 4));
  }
  return parts;
}

export class Monster3D {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'monster';
    this.group.visible = false;
    // Uten tåke: et kullsvart omriss som synes også langt inne i tåken.
    this.body = new THREE.MeshBasicMaterial({ color: 0x030202, fog: false });
    this.geometries = [];
    const mesh = (g, parent) => {
      this.geometries.push(g);
      parent.add(new THREE.Mesh(g, this.body));
    };
    // Bena, og kroppen (alt over hoftene) som lener seg fram rundt hoftene.
    for (const x of [-0.1, 0.1]) mesh(limb([x, 0, 0], [x * 0.8, 1.1, 0.02], 0.035, 0.06), this.group);
    this.torso = new THREE.Group();
    this.torso.position.y = 1.08;
    this.group.add(this.torso);
    mesh(limb([0, 0, 0], [0, 0.78, -0.03], 0.12, 0.19, 9), this.torso); // smal overkropp, bredere oppe
    for (const x of [-0.23, 0.23]) mesh(new THREE.SphereGeometry(0.075, 8, 6).translate(x, 0.8, -0.02), this.torso); // oppdratte skuldre
    this.arms = [-1, 1].map((side) => {
      const g = new THREE.Group();
      g.position.set(side * 0.25, 0.8, -0.02);
      for (const p of arm(side)) mesh(p, g);
      this.torso.add(g);
      return g;
    });
    // Hodet på en tynn hals, avlangt og på skakke.
    this.head = new THREE.Group();
    this.head.position.set(0, 0.8, 0.02);
    this.torso.add(this.head);
    mesh(limb([0, 0, 0], [0, 0.24, 0.05], 0.035, 0.03), this.head);
    const skull = new THREE.SphereGeometry(0.15, 12, 10);
    skull.scale(1, 1.45, 1);
    skull.translate(0, 0.42, 0.06);
    mesh(skull, this.head);
    this.faceTex = faceTexture();
    this.face = new THREE.SpriteMaterial({ map: this.faceTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    this.sprite = new THREE.Sprite(this.face);
    this.sprite.scale.set(0.38, 0.38, 1);
    this.sprite.position.set(0, 0.4, 0.2);
    this.head.add(this.sprite);
    this.time = 0;
    this.twitch = 0; // tid til neste rykk i hodet
    this.tilt = 0.32; // hvor skjevt hodet henger (radianer)
  }

  /** Plassering, retning mot spilleren, bevegelse og hvor sterkt ansiktet gløder (mer i mørket). */
  update(dt, ai, player, power) {
    this.group.visible = ai.visible;
    if (!ai.visible) return;
    this.time += dt;
    const t = this.time;
    this.group.position.set(ai.x, ai.y, ai.z);
    this.group.rotation.y = Math.atan2(player.x - ai.x, player.z - ai.z);
    // Pust, og fram over når den jakter.
    const hunting = ai.state === 'hunt';
    this.torso.rotation.x += ((hunting ? 0.38 : 0.12) - this.torso.rotation.x) * Math.min(1, dt * 2);
    this.torso.scale.set(1, 1 + Math.sin(t * 1.9) * 0.012, 1);
    // Armene henger rett ned (motsatt av kroppens helning) og svaier sakte, litt i utakt.
    this.arms.forEach((a, k) => {
      a.rotation.x = Math.sin(t * 1.3 + k * 2.1) * (hunting ? 0.18 : 0.06) - this.torso.rotation.x * 0.8;
      a.rotation.z = (k ? 1 : -1) * (0.05 + Math.sin(t * 0.9 + k) * 0.03);
    });
    // Hodet: på skakke, og av og til et brått rykk til den andre siden.
    this.twitch -= dt;
    if (this.twitch <= 0) {
      this.twitch = 1.5 + Math.random() * 4;
      this.tilt = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.3);
    }
    this.head.rotation.z += (this.tilt - this.head.rotation.z) * Math.min(1, dt * 18);
    this.head.rotation.x = -this.torso.rotation.x * 0.7; // ser på deg selv når den lener seg fram
    this.face.rotation = this.head.rotation.z;
    this.face.opacity = 0.25 + 0.75 * (1 - power);
  }

  dispose() {
    for (const g of this.geometries) g.dispose();
    this.body.dispose();
    this.face.dispose();
    this.faceTex.dispose();
  }
}
