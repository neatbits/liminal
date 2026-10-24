// Continuous water cores underneath the animated spray: one merged mesh for all pools.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fountainDrop } from '../core/fountain-jets.js';

class StreamCurve extends THREE.Curve {
  constructor(jet, angle, central) { super(); Object.assign(this, { jet, angle, central }); }
  getPoint(t, target = new THREE.Vector3()) {
    return target.fromArray(fountainDrop(this.jet, this.angle, t, this.central));
  }
}

export function fountainStreams(jets, field, shared) {
  const pieces = [];
  for (const jet of jets) {
    const light = field.sample(jet.x, .7, jet.z, 0, 1, 0);
    for (let stream = 0; stream < 9; stream++) {
      const central = stream === 8;
      const geometry = new THREE.TubeGeometry(new StreamCurve(jet, stream * Math.PI / 4, central), 40, central ? .028 : .014, 5, false);
      const colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) colors.set(light.slice(0, 3), i);
      geometry.setAttribute('aLight', new THREE.BufferAttribute(colors, 3));
      pieces.push(geometry);
    }
  }
  const geometry = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  const material = new THREE.ShaderMaterial({
    uniforms: Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), shared),
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 aLight;uniform vec3 uTint;uniform float uBoost;
      varying vec2 vUv;varying vec3 vLight,vNormal,vEye;
      #include <fog_pars_vertex>
      void main(){
        vUv=uv;vLight=(aLight*.75+vec3(.16,.2,.22))*uTint*uBoost;
        vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
        vNormal=normalMatrix*normal;vEye=-mvPosition.xyz;
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime;varying vec2 vUv;varying vec3 vLight,vNormal,vEye;
      #include <fog_pars_fragment>
      void main(){
        float edge=pow(1.0-abs(dot(normalize(vNormal),normalize(vEye))),2.0);
        float flow=.5+.5*sin(vUv.x*150.0-uTime*18.0+sin(vUv.y*18.85)*.7);
        float sparkle=pow(flow,9.0);
        vec3 color=vLight*mix(vec3(.48,.78,.88),vec3(.9,.97,1.0),edge*.6+sparkle*.4);
        gl_FragColor=vec4(color,.4+edge*.28+sparkle*.16);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'fountainStreams'; mesh.renderOrder = 2;
  return mesh;
}
