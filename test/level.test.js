import { describe, expect, it } from 'vitest';
import {
  createLevel,
  getTile,
  setTile,
  setLight,
  resizeLevel,
  builtBounds,
  clampSize,
  clampDepth,
  cloneLevel,
  TILE,
  LIGHT,
  MAX_SIZE,
  MIN_SIZE,
  WATER_DEPTH,
} from '../src/core/level.js';
import { ceilingAt, depthAt, floorAt } from '../src/core/heights.js';
import { levelStats } from '../src/core/stats.js';

describe('level', () => {
  it('lager et rom fylt med vegg og temaets takhøyde', () => {
    const level = createLevel({ w: 10, h: 12, theme: 'pool' });
    expect(level.tiles.length).toBe(120);
    expect(level.tiles.every((t) => t === TILE.WALL)).toBe(true);
    expect(level.height).toBe(3.4);
    expect(level.theme).toBe('pool');
  });

  it('faller tilbake til standardtema for ukjente temaer', () => {
    expect(createLevel({ theme: 'finnes-ikke' }).theme).toBe('backrooms');
  });

  it('regner alt utenfor kartet som vegg', () => {
    const level = createLevel({ w: 8, h: 8 });
    expect(getTile(level, -1, 0)).toBe(TILE.WALL);
    expect(getTile(level, 8, 3)).toBe(TILE.WALL);
  });

  it('klemmer størrelsen innenfor grensene', () => {
    expect(clampSize(2)).toBe(MIN_SIZE);
    expect(clampSize(9999)).toBe(MAX_SIZE);
    expect(clampSize('abc')).toBe(MIN_SIZE);
  });

  it('fjerner lys når ruten blir vegg eller søyle', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 2, 2, TILE.FLOOR);
    expect(setLight(level, 2, 2, LIGHT.ON)).toBe(true);
    setTile(level, 2, 2, TILE.PILLAR);
    expect(level.lights[2 * 8 + 2]).toBe(LIGHT.NONE);
  });

  it('nekter lys på vegg', () => {
    const level = createLevel({ w: 8, h: 8 });
    expect(setLight(level, 1, 1, LIGHT.ON)).toBe(false);
  });

  it('sentrerer innholdet ved endring av størrelse', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 3, 3, TILE.WATER);
    const big = resizeLevel(level, 12, 12);
    expect(big.w).toBe(12);
    expect(getTile(big, 5, 5)).toBe(TILE.WATER);
    expect(big.spawn.x).toBe(level.spawn.x + 2);
  });

  it('finner utstrekningen av det som er bygget', () => {
    const level = createLevel({ w: 20, h: 20 });
    expect(builtBounds(level)).toBeNull();
    setTile(level, 3, 4, TILE.FLOOR);
    setTile(level, 9, 2, TILE.WATER);
    expect(builtBounds(level)).toEqual({ x0: 3, z0: 2, x1: 9, z1: 4 });
  });

  it('beregner nøkkeltall', () => {
    const level = createLevel({ w: 8, h: 8, height: 3 });
    setTile(level, 1, 1, TILE.FLOOR);
    setTile(level, 2, 1, TILE.WATER);
    setTile(level, 3, 1, TILE.DOOR);
    setLight(level, 1, 1, LIGHT.FLICKER);
    const s = levelStats(level);
    expect(s.floorArea).toBe(3);
    expect(s.waterArea).toBe(1);
    expect(s.lights).toBe(1);
    expect(s.flicker).toBe(1);
    expect(s.volume).toBe(Math.round(3 + 3.7 + 2.1));
    expect(s.ceiling).toEqual([3, 3]);
    expect(s.depth).toEqual([WATER_DEPTH, WATER_DEPTH]);
  });

  it('har standard vanndybde og tomme sonelag', () => {
    const level = createLevel({ w: 8, h: 8 });
    expect(level.waterDepth).toBe(WATER_DEPTH);
    expect(level.ceilings.every((v) => v === 0)).toBe(true);
    expect(level.depths).toHaveLength(64);
    expect(clampDepth(9)).toBe(3);
    expect(clampDepth('x')).toBe(WATER_DEPTH);
  });

  it('høyder per rute følger sonene, ellers rommets standard', () => {
    const level = createLevel({ w: 8, h: 8, height: 2.7, waterDepth: 1.2 });
    setTile(level, 1, 1, TILE.FLOOR);
    setTile(level, 2, 1, TILE.WATER);
    setTile(level, 3, 1, TILE.WATER);
    level.ceilings[1 * 8 + 1] = 45;
    level.depths[1 * 8 + 3] = 25;
    expect(ceilingAt(level, 1, 1)).toBe(4.5);
    expect(ceilingAt(level, 2, 1)).toBe(2.7);
    expect(floorAt(level, 1, 1)).toBe(0);
    expect(floorAt(level, 2, 1)).toBe(-1.2);
    expect(floorAt(level, 3, 1)).toBe(-2.5);
    expect(depthAt(level, -1, 0)).toBe(1.2);
    const s = levelStats(level);
    expect(s.ceiling).toEqual([2.7, 4.5]);
    expect(s.depth).toEqual([1.2, 2.5]);
    expect(s.volume).toBe(Math.round(4.5 + 2.7 + 1.2 + 2.7 + 2.5));
  });

  it('kopi og ny størrelse tar med sonene', () => {
    const level = createLevel({ w: 8, h: 8, waterDepth: 1.5 });
    setTile(level, 3, 3, TILE.WATER);
    level.ceilings[3 * 8 + 3] = 40;
    level.depths[3 * 8 + 3] = 20;
    const copy = cloneLevel(level);
    copy.ceilings[3 * 8 + 3] = 0;
    expect(level.ceilings[3 * 8 + 3]).toBe(40);
    const big = resizeLevel(level, 12, 12);
    expect(big.waterDepth).toBe(1.5);
    expect(ceilingAt(big, 5, 5)).toBe(4);
    expect(depthAt(big, 5, 5)).toBe(2);
  });
});
