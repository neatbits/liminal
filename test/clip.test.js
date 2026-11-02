import { describe, expect, it } from 'vitest';
import { clipWorld } from '../src/world/clip.js';

/** En verden med én ShaderMaterial-lignende ting, som three.js ville kompilert. */
const fake = (vertexShader, fragmentShader) => {
  const material = { isShaderMaterial: true, vertexShader, fragmentShader, userData: {} };
  return { material, world: { group: { traverse: (f) => f({ material }) } } };
};

describe('klipping av en verden (Noclip)', () => {
  it('setter inn klippebitene på egne linjer, også når shaderen fortsetter på samme linje', () => {
    const { material, world } = fake('void main(){ vec4 mvPosition = vec4(0.0); gl_Position = mvPosition; float a = 1.0; }', 'void main(){float r = 1.0; gl_FragColor = vec4(r);}');
    clipWorld(world, []);
    expect(material.clipping).toBe(true);
    expect(material.vertexShader).toMatch(/#include <clipping_planes_vertex>\n/);
    expect(material.fragmentShader).toMatch(/#include <clipping_planes_fragment>\n/);
    expect(material.fragmentShader).not.toMatch(/#include <clipping_planes_fragment>float/);
  });

  it('shadere uten mvPosition får planene, men ingen innsatt kode', () => {
    const { material, world } = fake('void main(){ gl_Position = vec4(0.0); }', 'void main(){ gl_FragColor = vec4(1.0); }');
    clipWorld(world, []);
    expect(material.clipping).toBeUndefined();
    expect(material.vertexShader).not.toMatch(/clipping/);
  });
});
