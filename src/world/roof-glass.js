import * as THREE from 'three';
import { skyOf } from '../core/windows.js';
import { getTheme } from '../core/themes.js';
import { landscapeNoise } from './landscape-noise.js';

export function roofGlassMaterial(level) {
  const sky=skyOf(level),theme=getTheme(level.theme),noise=landscapeNoise();
  const top=new THREE.Color(sky.sky[0]);
  if((level.sky??'day')==='day')top.lerp(new THREE.Color('#7eafe1'),.45);
  const material=new THREE.ShaderMaterial({
    uniforms:{uSkyTop:{value:top},uSkyBottom:{value:new THREE.Color(sky.sky[1])},uDay:{value:sky.power},
      uNoise:{value:noise},uGain:{value:1/theme.exposure/(1+theme.bloom*.5)}},
    side:THREE.DoubleSide,
    vertexShader:`varying vec3 vRoof;void main(){vec4 p=modelMatrix*vec4(position,1.0);vRoof=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`
      uniform vec3 uSkyTop,uSkyBottom;uniform float uDay,uGain;
      uniform sampler2D uNoise;varying vec3 vRoof;
      void main(){
        vec3 V=normalize(vRoof-cameraPosition);
        // Distant cloud layer: follows viewing direction across panes, never the glass UVs.
        vec2 p=V.xz/(max(V.y,0.0)+.35)*.025+vec2(.31,.47);
        float cloud=texture2D(uNoise,p).r*.57+texture2D(uNoise,p*2.1+.17).r*.28
          +texture2D(uNoise,p*4.3+.39).r*.15;
        float cover=smoothstep(.40,.64,cloud);
        vec3 sky=mix(uSkyBottom,uSkyTop,smoothstep(0.0,.85,max(V.y,0.0)));
        vec3 cloudColor=mix(uSkyBottom*.78,vec3(.97,.97,1.0),smoothstep(.42,.72,cloud));
        sky=mix(sky,cloudColor,cover*.85*min(uDay,1.0));
        vec3 col=sky*(.35+uDay*.55)*uGain;
        gl_FragColor=vec4(col,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  material.addEventListener('dispose',()=>noise.dispose());
  return material;
}
