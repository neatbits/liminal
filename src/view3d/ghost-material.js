import * as THREE from 'three';

// Self-lit cloth with soft fold shading, so it remains readable during a blackout.
// Three's morph chunks keep both positions and normals in the authored animation.
export function ghostMaterial() {
  return new THREE.ShaderMaterial({
    uniforms:{uColor:{value:new THREE.Color('#d9e0de')},uDark:{value:0},...THREE.UniformsUtils.clone(THREE.UniformsLib.fog)},
    side:THREE.DoubleSide,fog:true,
    vertexShader:`
      #include <common>
      #include <morphtarget_pars_vertex>
      #include <fog_pars_vertex>
      varying vec3 vGhostNormal,vGhostView;
      void main(){
        #include <morphinstance_vertex>
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        vec4 world=modelMatrix*vec4(transformed,1.0);
        vGhostNormal=mat3(modelMatrix)*objectNormal;vGhostView=cameraPosition-world.xyz;
        vec4 mvPosition=viewMatrix*world;
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader:`
      uniform vec3 uColor;uniform float uDark;
      varying vec3 vGhostNormal,vGhostView;
      #include <fog_pars_fragment>
      void main(){
        vec3 N=normalize(vGhostNormal),V=normalize(vGhostView);
        float folds=.43+.45*abs(dot(N,normalize(vec3(-.4,.75,.6))));
        float rim=.12*pow(1.0-abs(dot(N,V)),2.0);
        gl_FragColor=vec4(uColor*(folds+rim)*(.68+.32*uDark),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
