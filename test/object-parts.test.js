import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mergeParts } from '../src/world/object-parts.js';
import { packTiles, ATLAS_PAD } from '../src/world/object-atlas.js';

const part = (geometry, extra = {}) => ({ geometry, map: null, arm: null, color: new THREE.Color(1, 1, 1), alphaTest: 0, side: THREE.FrontSide, ...extra });

describe('færre deler per modell', () => {
  it('samler fargedeler på en palett med nøyaktig samme farge per punkt', () => {
    const red = new THREE.Color(0.8, 0.1, 0.05), blue = new THREE.Color(0.05, 0.2, 0.9);
    const a = part(new THREE.BoxGeometry(1, 1, 1), { color: red });
    const b = part(new THREE.BoxGeometry(0.5, 2, 0.5).translate(2, 0, 0), { color: blue });
    const [merged, ...rest] = mergeParts([a, b]);
    expect(rest).toHaveLength(0);
    expect(merged.color.toArray()).toEqual([1, 1, 1]);
    const { image, magFilter, minFilter } = merged.map;
    expect([magFilter, minFilter]).toEqual([THREE.NearestFilter, THREE.NearestFilter]);
    const g = merged.geometry, uv = g.attributes.uv;
    expect(g.attributes.position.count).toBe(48);
    // Punktet slår opp sin egen farge i paletten (shaderen: uColor * tex.rgb).
    const colourAt = (i) => {
      const texel = Math.floor(uv.getX(i) * image.width);
      return Array.from(image.data.slice(texel * 4, texel * 4 + 3));
    };
    expect(colourAt(0)).toEqual([red.r, red.g, red.b].map(Math.fround));
    expect(colourAt(30)).toEqual([blue.r, blue.g, blue.b].map(Math.fround));
    expect(g.attributes.position.getX(30)).toBeCloseTo(b.geometry.attributes.position.getX(6));
  });

  it('slår sammen deler med samme tekstur og lar ulike flagg og teksturer være', () => {
    const wood = new THREE.Texture(), metal = new THREE.Texture();
    const parts = [
      part(new THREE.PlaneGeometry(), { map: wood }),
      part(new THREE.PlaneGeometry().translate(1, 0, 0), { map: wood }),
      part(new THREE.PlaneGeometry(), { map: metal }), // uten bilde: ikke noe atlas i Node
      part(new THREE.PlaneGeometry(), { map: wood, alphaTest: 0.5 }),
      part(new THREE.PlaneGeometry(), { color: new THREE.Color(0, 1, 0), unlit: true }),
    ];
    const out = mergeParts(parts);
    expect(out).toHaveLength(4);
    expect(out[0].map).toBe(wood);
    expect(out[0].geometry.attributes.position.count).toBe(8);
    expect(out.slice(1)).toEqual(parts.slice(2)); // enkeltdeler beholdes uendret
    expect(mergeParts(parts)).toBe(out); // bufret per modell
  });

  it('slår sammen deler med og uten indeks', () => {
    const indexed = new THREE.BoxGeometry(), plain = new THREE.BoxGeometry().toNonIndexed();
    const [merged] = mergeParts([part(indexed), part(plain)]);
    expect(merged.geometry.index).toBeNull();
    expect(merged.geometry.attributes.position.count).toBe(36 + 36);
  });

  it('pakker atlasfliser uten overlapp, med kant, innenfor grensen', () => {
    const sizes = [[512, 512], [256, 384], [512, 213], [256, 384], [512, 512], [128, 128]];
    const plan = packTiles(sizes);
    const boxes = plan.at.map(([x, y], i) => [x - ATLAS_PAD, y - ATLAS_PAD, x + sizes[i][0] + ATLAS_PAD, y + sizes[i][1] + ATLAS_PAD]);
    for (const [i, a] of boxes.entries()) {
      expect(a[0]).toBeGreaterThanOrEqual(0);
      expect(a[1]).toBeGreaterThanOrEqual(0);
      expect(a[2]).toBeLessThanOrEqual(plan.width);
      expect(a[3]).toBeLessThanOrEqual(plan.height);
      for (const b of boxes.slice(i + 1)) expect(a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]).toBe(false);
    }
    expect(packTiles([[4096, 4096]], ATLAS_PAD, 4096)).toBeNull();
  });
});
