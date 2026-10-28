import { describe, expect, it } from 'vitest';
import { createLevel, setLight, TILE, LIGHT } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { getTheme } from '../src/core/themes.js';
import { collectLights, createLightField, lineOfSight, cellHeights, HANG, LIGHT_DROP } from '../src/world/lighting.js';
import { hexToLinear } from '../src/world/color.js';

// To rom side om side, adskilt av en vegg i x = 8.
function twoRooms() {
  const level = createLevel({ w: 16, h: 8 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 14, z1: 6 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 8, z0: 0, x1: 8, z1: 7 }), TILE.WALL);
  return level;
}

describe('lys', () => {
  it('konverterer sRGB-hex til lineære verdier', () => {
    expect(hexToLinear('#ffffff')).toEqual([1, 1, 1]);
    expect(hexToLinear('#000000')).toEqual([0, 0, 0]);
    expect(hexToLinear('#808080')[0]).toBeCloseTo(0.216, 2);
  });

  it('siktlinje blokkeres av vegg', () => {
    const level = twoRooms();
    expect(lineOfSight(level, 2.5, 3.5, 6.5, 3.5)).toBe(true);
    expect(lineOfSight(level, 2.5, 3.5, 12.5, 3.5)).toBe(false);
  });

  it('samler armaturer med tilstand og gruppe', () => {
    const level = twoRooms();
    setLight(level, 3, 3, LIGHT.ON);
    setLight(level, 5, 3, LIGHT.FLICKER);
    const lights = collectLights(level);
    expect(lights).toHaveLength(2);
    expect(lights[0]).toMatchObject({ x: 3.5, z: 3.5, state: LIGHT.ON });
    expect(lights[1].group).toBeGreaterThanOrEqual(0);
    expect(lights[1].group).toBeLessThan(4);
  });

  it('gulvet under lyset er lysere enn gulvet bak veggen', () => {
    const level = twoRooms();
    setLight(level, 4, 3, LIGHT.ON);
    const field = createLightField(level, getTheme('backrooms'));
    const lit = field.sample(4.5, 0, 3.5, 0, 1, 0)[0];
    const shadow = field.sample(10.5, 0, 3.5, 0, 1, 0)[0];
    const ambient = hexToLinear(getTheme('backrooms').light.ambient)[0];
    expect(lit).toBeGreaterThan(ambient * 3);
    expect(shadow).toBeCloseTo(ambient, 5);
  });

  it('blinkende lys havner i egen kanal og ødelagte lys lyser ikke', () => {
    const level = twoRooms();
    setLight(level, 4, 3, LIGHT.FLICKER);
    setLight(level, 11, 3, LIGHT.BROKEN);
    const field = createLightField(level, getTheme('office'));
    const s = field.sample(4.5, 0, 3.5, 0, 1, 0);
    const group = collectLights(level)[0].group;
    expect(s[3 + group]).toBeGreaterThan(0.05);
    const ambient = hexToLinear(getTheme('office').light.ambient);
    expect(s[0]).toBeCloseTo(ambient[0], 5);
    const dark = field.sample(11.5, 0, 3.5, 0, 1, 0);
    expect(dark[0]).toBeCloseTo(ambient[0], 5);
  });

  it('lysstyrken skalerer med rommets «bright»', () => {
    const level = twoRooms();
    setLight(level, 4, 3, LIGHT.ON);
    const theme = getTheme('backrooms');
    const normal = createLightField(level, theme).sample(4.5, 0, 3.5, 0, 1, 0)[1];
    level.bright = 2;
    const bright = createLightField(level, theme).sample(4.5, 0, 3.5, 0, 1, 0)[1];
    expect(bright).toBeGreaterThan(normal * 1.5);
  });
});

describe('lys med soner', () => {
  // En høy hall (x 1–5, 6 m) ved siden av en lav gang (x 6–14, 2,4 m).
  function hallAndLowCorridor() {
    const level = createLevel({ w: 16, h: 8, height: 2.4 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 14, z1: 6 }), TILE.FLOOR);
    for (let z = 1; z <= 6; z++) for (let x = 1; x <= 5; x++) level.ceilings[z * 16 + x] = 60;
    return level;
  }

  it('armaturene henger under sonens tak', () => {
    const level = hallAndLowCorridor();
    setLight(level, 3, 3, LIGHT.ON);
    setLight(level, 9, 3, LIGHT.ON);
    const [high, low] = collectLights(level);
    expect(high.ceil).toBe(6);
    expect(low.ceil).toBe(2.4);
    expect(high.y).toBeCloseTo(5.85, 6);
  });

  it('det lave taket skygger for lyset fra den høye hallen', () => {
    const level = hallAndLowCorridor();
    setLight(level, 4, 3, LIGHT.ON);
    const field = createLightField(level, getTheme('backrooms'));
    const ambient = hexToLinear(getTheme('backrooms').light.ambient)[0];
    // Rett innenfor gangen når lyset under kanten; lenger inn skjermer taket.
    expect(field.sample(6.3, 0, 3.5, 0, 1, 0)[0]).toBeGreaterThan(ambient * 1.3);
    expect(field.sample(9.5, 0, 3.5, 0, 1, 0)[0]).toBeCloseTo(ambient, 5);
  });

  it('siktlinjen sjekker høyden der den krysser en rutegrense', () => {
    const level = hallAndLowCorridor();
    const heights = cellHeights(level);
    expect(lineOfSight(level, 3.5, 3.5, 9.5, 3.5, heights, 2, 2)).toBe(true);
    expect(lineOfSight(level, 3.5, 3.5, 9.5, 3.5, heights, 5, 2)).toBe(false);
    expect(lineOfSight(level, 3.5, 3.5, 9.5, 3.5)).toBe(true); // uten høyder: bare vegger
  });

  it('taket i den høye hallen får lys helt inntil det lave taket', () => {
    const level = hallAndLowCorridor();
    setLight(level, 4, 3, LIGHT.ON);
    const field = createLightField(level, getTheme('backrooms'));
    const ambient = hexToLinear(getTheme('backrooms').light.ambient)[0];
    // Hjørnet x = 6 ligger på grensen; i 6 m høyde hører det til hallen, ikke gangen.
    expect(field.sample(6, 6, 3.5, 0, -1, 0)[0]).toBeGreaterThan(ambient * 1.2);
  });

  it('bassengkanten skygger for bunnen i et dypt basseng', () => {
    const level = createLevel({ w: 16, h: 8, height: 3 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 14, z1: 6 }), TILE.FLOOR);
    fillTiles(level, rectIndices(level, { x0: 8, z0: 1, x1: 14, z1: 6 }), TILE.WATER);
    level.waterDepth = 3;
    setLight(level, 6, 3, LIGHT.ON);
    const field = createLightField(level, getTheme('pool'));
    const ambient = hexToLinear(getTheme('pool').light.ambient)[0];
    expect(field.sample(8.2, -3, 3.5, 0, 1, 0)[0]).toBeCloseTo(ambient, 5);
    expect(field.sample(8.2, -0.12, 3.5, 0, 1, 0)[0]).toBeGreaterThan(ambient * 1.2); // vannflaten
  });

  it('i svært høye rom sitter lampen i taket, men gulvet får lys som fra HANG over det', () => {
    const room = (height) => {
      const level = createLevel({ w: 12, h: 12, height });
      fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 10, z1: 10 }), TILE.FLOOR);
      setLight(level, 5, 5, LIGHT.ON);
      return level;
    };
    const [lamp] = collectLights(room(16));
    expect(lamp).toMatchObject({ top: 16, ceil: 16, y: 16 - LIGHT_DROP });
    expect(lamp.low).toBeCloseTo(HANG - LIGHT_DROP, 6);
    expect(collectLights(room(4))[0].low).toBeUndefined();
    const theme = getTheme('office');
    const floor = (h) => createLightField(room(h), theme).sample(7.5, 0, 6.5, 0, 1, 0)[0];
    expect(floor(16)).toBeCloseTo(floor(HANG), 4); // som en lampe som hang i HANG
    const wall = (h) => createLightField(room(h), theme).sample(10.99, 13, 5.5, -1, 0, 0)[0];
    expect(wall(16)).toBeGreaterThan(hexToLinear(theme.light.ambient)[0] * 1.2); // veggen høyt oppe får også lys
  });
});
