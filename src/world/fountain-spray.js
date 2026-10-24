// GPU ballistic droplets and small expanding rings, driven by the shared (pausable) time.
import * as THREE from 'three';
import { fountainJets } from '../core/fountain-jets.js';
import { WATER_SURFACE } from '../core/level.js';
import { fountainStreams } from './fountain-streams.js';

export function createFountainSpray(level, field, shared) {
  const jets = fountainJets(level),
    group = new THREE.Group();
  group.name = 'fountainSpray';
  const geometries = [],
    materials = [];
  if (!jets.length) return { group, jets, vertices: 0, dispose() {} };
  const streams = fountainStreams(jets, field, shared);
  group.add(streams);
  geometries.push(streams.geometry);
  materials.push(streams.material);
  const positions = [],
    arcs = [],
    lights = [];
  for (const jet of jets)
    for (let stream = 0; stream < 9; stream++)
      for (let p = 0; p < 96; p++) {
        const angle = (stream * Math.PI) / 4,
          central = stream === 8,
          phase = p / 96;
        const radius = central ? 0.025 : jet.radius * 0.88;
        positions.push(jet.x, WATER_SURFACE + 0.02, jet.z);
        arcs.push(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          jet.height * (central ? 1 : 0.55),
          phase,
        );
        const sample = field.sample(jet.x, 0.7, jet.z, 0, 1, 0);
        lights.push(sample[0], sample[1], sample[2]);
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aArc', new THREE.Float32BufferAttribute(arcs, 4));
  geometry.setAttribute('aLight', new THREE.Float32BufferAttribute(lights, 3));
  // Positions move in the vertex shader: bounds must include their full trajectories.
  const box = new THREE.Box3();
  for (const j of jets) {
    box.expandByPoint(new THREE.Vector3(j.x - j.radius, WATER_SURFACE, j.z - j.radius));
    box.expandByPoint(new THREE.Vector3(j.x + j.radius, WATER_SURFACE + j.height + 0.1, j.z + j.radius));
  }
  geometry.boundingBox = box;
  geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  const material = new THREE.ShaderMaterial({
    uniforms: Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), shared),
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute vec4 aArc;attribute vec3 aLight;uniform float uTime,uBoost;uniform vec3 uTint;
      varying vec3 vLight;varying float vFade;
      #include <fog_pars_vertex>
      void main(){
        float t=fract(aArc.w+uTime/(.8+aArc.z*.25));
        vec3 p=position+vec3(aArc.x*t,4.0*aArc.z*t*(1.0-t),aArc.y*t);
        vec4 mvPosition=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mvPosition;
        gl_PointSize=clamp(48.0/-mvPosition.z,1.5,6.0);
        vLight=(aLight*.7+vec3(.18,.22,.24))*uBoost*uTint;vFade=.5+.5*sin(t*3.14159);
        #include <fog_vertex>
      }`,
    fragmentShader: `
      varying vec3 vLight;varying float vFade;
      #include <fog_pars_fragment>
      void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;
        gl_FragColor=vec4(vLight*vec3(.72,.94,1.0),(1.0-smoothstep(.2,.5,r))*.8*vFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'fountainDroplets';
  points.renderOrder = 3;
  group.add(points);
  geometries.push(geometry);
  materials.push(material);
  const ringMaterial = new THREE.ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uTime,uBoost;varying vec2 vUv;void main(){float r=length(vUv-.5)*2.0;
      if(r>1.0)discard;float wave=pow(max(0.0,cos(r*32.0-uTime*5.0)),18.0);
      gl_FragColor=vec4(vec3(.58,.87,.94)*uBoost,wave*(1.0-r)*.22);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  materials.push(ringMaterial);
  for (const jet of jets) {
    const g = new THREE.PlaneGeometry(jet.radius * 2, jet.radius * 2),
      ring = new THREE.Mesh(g, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(jet.x, WATER_SURFACE + 0.008, jet.z);
    ring.renderOrder = 3;
    ring.name = 'fountainRings';
    geometries.push(g);
    group.add(ring);
  }
  return {
    group,
    jets,
    vertices: positions.length / 3 + streams.geometry.attributes.position.count,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
