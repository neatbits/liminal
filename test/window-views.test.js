import { describe, expect, it } from 'vitest';
import { WINDOW_VIEWS, windowViewFor } from '../src/core/window-views.js';
import { getTheme } from '../src/core/themes.js';
import { SKIES } from '../src/core/windows.js';
import { landscapeMaterial } from '../src/world/window-landscape.js';
import { generateLevel,presetById } from '../src/gen/index.js';
import { windows,paintWindows } from '../src/core/windows.js';
import { createLevel,TILE } from '../src/core/level.js';
import { levelFromJSON,levelToJSON } from '../src/core/serialize.js';
const luminance = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

describe('tematilpassede vindusutsikter', () => {
  it.each(['playroom', 'pool', 'office', 'mall', 'garage', 'school', 'ward', 'hotel', 'basement'])(
    '%s velger sin utsikt og holder bygningene et stykke unna glasset', (id) => {
      const theme = getTheme(id), view = windowViewFor(theme);
      expect(view).toBe(windowViewFor(id));
      expect(view).not.toBeNull();
      expect(view.firstRow - view.depth[0] - view.depth[1]).toBeGreaterThan(12);
      expect(view.groundY).toBeLessThan(0.9);
      expect(view.roof).toBeGreaterThanOrEqual(0);
      expect(view.setback).toBeGreaterThanOrEqual(0); expect(view.setback).toBeLessThan(0.5);
      expect(view.greenery[0]).toBeGreaterThanOrEqual(0); expect(view.greenery[0]).toBeLessThanOrEqual(1);
      expect(view.firstRow - 8 - view.greenery[1] * 1.5).toBeGreaterThan(12);
      for (const range of [view.width, view.height, view.depth]) {
        expect(range[0]).toBeGreaterThan(0); expect(range[1]).toBeGreaterThanOrEqual(0);
      }
      const before = JSON.stringify(view);
      const day = landscapeMaterial(SKIES.day, theme), night = landscapeMaterial(SKIES.night, theme);
      try {
        expect(day.userData.windowView).toBe(id);
        expect(day.uniforms.uNight.value).toBe(0); expect(night.uniforms.uNight.value).toBe(1);
        expect(luminance(day.uniforms.uGround.value)).toBeGreaterThan(luminance(night.uniforms.uGround.value));
        expect(night.uniforms.uLayout.value.toArray()).toEqual(day.uniforms.uLayout.value.toArray());
        expect(night.uniforms.uGreenery.value.toArray()).toEqual(day.uniforms.uGreenery.value.toArray());
        expect(night.uniforms.uRoof.value).toBe(day.uniforms.uRoof.value);
        expect(night.uniforms.uSetback.value).toBe(day.uniforms.uSetback.value);
        expect(day.uniforms.uSun.value.length()).toBeCloseTo(1);
        expect(day.defines.VIEW_ROOF).toBe(view.roof > 0 ? 1 : 0);
        expect(day.defines.VIEW_GREENERY).toBe(view.greenery[0] > 0 ? 1 : 0);
        expect(JSON.stringify(view)).toBe(before);
      } finally { day.dispose(); night.dispose(); }
    },
  );

  it('rene data beskriver ulike omgivelser, ikke bare samme utsikt med forskjellige farger', () => {
    const geometry = (v) => JSON.stringify([v.firstRow, v.spacing, v.groundY, v.width, v.height, v.depth, v.groundStyle]);
    expect(new Set(Object.values(WINDOW_VIEWS).map(geometry)).size).toBe(Object.keys(WINDOW_VIEWS).length);
    expect(WINDOW_VIEWS.office.height[0]).toBeGreaterThan(WINDOW_VIEWS.school.height[0]);
    expect(WINDOW_VIEWS.mall.width[0]).toBeGreaterThan(WINDOW_VIEWS.hotel.width[0]);
    expect(WINDOW_VIEWS.basement.firstRow).toBeLessThan(WINDOW_VIEWS.hotel.firstRow);
    expect(WINDOW_VIEWS.pool.windows).toBe(0);
    expect(WINDOW_VIEWS.playroom.groundStyle).toBe(0);
  });
  it('keeps the Basement city hidden until a window is built by hand',()=>{
    expect(windows(presetById('basement').make())).toHaveLength(0);
    for(const seed of [1,7,12])expect(windows(generateLevel({theme:'basement',seed}))).toHaveLength(0);
    const level=createLevel({theme:'basement',w:12,h:12});level.tiles[12+5]=TILE.FLOOR;
    expect(paintWindows(level,[[5,0]],true)).toBe(1);
    const copy=levelFromJSON(levelToJSON(level));expect(windows(copy)).toHaveLength(1);
    expect(windowViewFor(copy.theme).city).toBe(true);
    paintWindows(copy,[[5,0]],false);expect(windows(copy)).toHaveLength(0);
  });
  it('places the hidden city far below the room, with high towers and no suburban roofs or trees',()=>{
    const view=WINDOW_VIEWS.basement;
    expect(view.groundY).toBeLessThan(-40);
    expect(view.groundY+view.height[0]*2).toBeLessThan(-10);
    expect(view.groundY+(view.height[0]+view.height[1])*2).toBeGreaterThan(15);
    expect(view.roof).toBe(0);expect(view.greenery[0]).toBe(0);
    expect(Object.entries(WINDOW_VIEWS).filter(([,v])=>v.city).map(([id])=>id)).toEqual(['basement']);
    const city=landscapeMaterial(SKIES.day,getTheme('basement')),office=landscapeMaterial(SKIES.day,getTheme('office'));
    try {expect(city.fragmentShader).not.toBe(office.fragmentShader);}
    finally {city.dispose();office.dispose();}
  });

  it('Level 0 og ukjente temaer får ikke et påtvunget uteområde', () => {
    expect(windowViewFor('backrooms')).toBeNull();
    expect(windowViewFor('missing')).toBeNull(); expect(windowViewFor(null)).toBeNull();
    expect(windowViewFor('toString')).toBeNull(); expect(windowViewFor('constructor')).toBeNull();
    expect(landscapeMaterial(SKIES.day, getTheme('backrooms'))).toBeNull();
  });

  it('grønt og tak følger miljøet; Poolrooms beholder ren arkitektur', () => {
    expect(WINDOW_VIEWS.pool.greenery[0]).toBe(0);
    expect(WINDOW_VIEWS.pool.roof).toBe(0);
    expect(WINDOW_VIEWS.playroom.greenery[0]).toBeGreaterThan(0);
    expect(WINDOW_VIEWS.school.roof).toBeGreaterThan(0);
    expect(WINDOW_VIEWS.office.setback).toBeGreaterThan(0);
    expect(WINDOW_VIEWS.mall.greenery[0]).toBe(0);
  });

  it('sollyset følger tiden på døgnet uten å flytte bebyggelsen', () => {
    const theme = getTheme('playroom');
    const day = landscapeMaterial(SKIES.day, theme), golden = landscapeMaterial(SKIES.golden, theme);
    try {
      expect(golden.uniforms.uSun.value.y).toBeLessThan(day.uniforms.uSun.value.y);
      expect(golden.uniforms.uSun.value.x).toBeLessThan(0);
      expect(golden.uniforms.uLayout.value.toArray()).toEqual(day.uniforms.uLayout.value.toArray());
    } finally { day.dispose(); golden.dispose(); }
  });

  it('teksturstøy er repeterbar, filtreres på avstand og frigjøres med materialet', () => {
    const theme = getTheme('playroom');
    const a = landscapeMaterial(SKIES.day, theme), b = landscapeMaterial(SKIES.day, theme);
    const noise = a.uniforms.uNoise.value;
    let disposed = 0;
    noise.addEventListener('dispose', () => disposed++);
    try {
      expect(noise.image.data).toEqual(b.uniforms.uNoise.value.image.data);
      expect(noise.image.data.byteLength).toBeLessThanOrEqual(16384);
      expect(new Set(noise.image.data).size).toBeGreaterThan(200);
      expect(noise.generateMipmaps).toBe(true);
    } finally { a.dispose(); b.dispose(); }
    expect(disposed).toBe(1);
  });
});
