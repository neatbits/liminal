// Monsteret i 3D: en høy, mørk skikkelse (forsvinner i tåken som en silhuett) med lange armer
// og et ansikt som alltid ser på deg – lysende øyne og et bredt smil som gløder i mørket.
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
  glow(88, 92, 26);
  glow(168, 92, 26);
  // Smilet: en bred, skjev bue med tenner.
  ctx.save();
  ctx.shadowColor = 'rgba(255,245,230,0.9)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(255,250,240,0.95)';
  ctx.beginPath();
  ctx.moveTo(40, 150);
  ctx.quadraticCurveTo(128, 236, 220, 146);
  ctx.quadraticCurveTo(128, 196, 40, 150);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(20,10,10,0.8)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 11; k++) {
    const x = 58 + k * 15;
    ctx.beginPath();
    ctx.moveTo(x, 150 + Math.sin((k / 10) * Math.PI) * 26);
    ctx.lineTo(x + 2, 172 + Math.sin((k / 10) * Math.PI) * 30);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Monster3D {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'monster';
    this.group.visible = false;
    // Uten tåke: et kullsvart omriss som synes også langt inne i tåken.
    this.body = new THREE.MeshBasicMaterial({ color: 0x030202, fog: false });
    const parts = [
      [new THREE.CylinderGeometry(0.17, 0.26, 1.55, 10), 0, 0.78, 0, 0],
      [new THREE.SphereGeometry(0.17, 12, 10), 0, 1.95, 0, 0],
      [new THREE.CylinderGeometry(0.1, 0.16, 0.35, 8), 0, 1.68, 0, 0], // hals og skuldre
      [new THREE.CylinderGeometry(0.035, 0.05, 1.25, 6), -0.3, 1.0, 0.03, 0.12], // armer til knærne
      [new THREE.CylinderGeometry(0.035, 0.05, 1.25, 6), 0.3, 1.0, 0.03, -0.12],
    ];
    this.geometries = parts.map(([g]) => g);
    for (const [g, x, y, z, tilt] of parts) {
      const m = new THREE.Mesh(g, this.body);
      m.position.set(x, y, z);
      m.rotation.z = tilt;
      this.group.add(m);
    }
    this.faceTex = faceTexture();
    this.face = new THREE.SpriteMaterial({ map: this.faceTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    this.sprite = new THREE.Sprite(this.face);
    this.sprite.scale.set(0.4, 0.4, 1);
    this.sprite.position.set(0, 1.94, 0.2); // foran hodet, så hele ansiktet synes
    this.group.add(this.sprite);
    this.time = 0;
  }

  /** Plassering, retning mot spilleren og hvor sterkt ansiktet gløder (mer i mørket). */
  update(dt, ai, player, power) {
    this.group.visible = ai.visible;
    if (!ai.visible) return;
    this.time += dt;
    const breathe = 1 + Math.sin(this.time * 2.2) * 0.012;
    this.group.position.set(ai.x, ai.y, ai.z);
    this.group.rotation.y = Math.atan2(player.x - ai.x, player.z - ai.z);
    this.group.scale.set(1, breathe, 1);
    this.face.opacity = 0.25 + 0.75 * (1 - power);
  }

  dispose() {
    for (const g of this.geometries) g.dispose();
    this.body.dispose();
    this.face.dispose();
    this.faceTex.dispose();
  }
}
