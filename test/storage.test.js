import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLevel } from '../src/core/level.js';
import { saveRoom, loadRoom, listRooms, deleteRoom, saveDraft, loadDraft, saveSettings, loadSettings } from '../src/core/storage.js';

const ROOMS = 'liminal.rooms.v1';
let data;
let storage;

beforeEach(() => {
  data = new Map();
  storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  vi.stubGlobal('localStorage', storage);
});
afterEach(() => vi.unstubAllGlobals());

describe('lokal lagring', () => {
  it('lagrer, oppdaterer, åpner og sletter rom uten å miste andre rom', () => {
    const a = createLevel({ name: 'A' });
    const b = createLevel({ name: 'B' });
    expect(saveRoom(a)).toBe(true);
    expect(saveRoom(b)).toBe(true);
    a.name = 'Renamed';
    expect(saveRoom(a)).toBe(true);
    expect(listRooms()).toHaveLength(2);
    expect(loadRoom(a.id).name).toBe('Renamed');
    expect(deleteRoom(a.id)).toBe(true);
    expect(loadRoom(a.id)).toBeNull();
    expect(loadRoom(b.id).name).toBe('B');
  });

  it('lagrede rom og utkast bevarer høye soner', () => {
    const level = createLevel({ w: 8, h: 8 });
    level.ceilings[9] = 200;
    level.floors[10] = 100;
    level.decks[11] = 100;
    expect(saveRoom(level)).toBe(true);
    expect(saveDraft(level)).toBe(true);
    for (const back of [loadRoom(level.id), loadDraft()]) {
      expect(back.id).toBe(level.id);
      for (const key of ['ceilings', 'floors', 'decks']) expect(back[key]).toEqual(level[key]);
    }
  });

  it.each(['missing', 'blocked', 'full'])('rapporterer feil ved %s lagring og gir ikke rommet en id', (kind) => {
    if (kind === 'missing') vi.stubGlobal('localStorage', undefined);
    if (kind === 'blocked') Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    if (kind === 'full') storage.setItem = () => { throw new Error('quota exceeded'); };
    const level = createLevel();
    expect(saveRoom(level)).toBe(false);
    expect(level.id).toBeNull();
    expect(saveDraft(level)).toBe(false);
    expect(saveSettings({ volume: 0.5 })).toBe(false);
    expect(deleteRoom('id')).toBe(false);
    expect(loadDraft()).toBeNull();
  });

  it.each(['{}', 'null', 'true', '"oops"', '{broken'])('bevarer en ødelagt romliste (%s) og gir ingen ufanget feil', (raw) => {
    data.set(ROOMS, raw);
    expect(listRooms()).toEqual([]);
    expect(loadRoom('id')).toBeNull();
    expect(saveRoom(createLevel())).toBe(false);
    expect(deleteRoom('id')).toBe(false);
    expect(data.get(ROOMS)).toBe(raw);
  });

  it('et ødelagt rom hindrer ikke åpning av et annet rom', () => {
    const level = createLevel();
    saveRoom(level);
    const rooms = JSON.parse(data.get(ROOMS));
    rooms.push({ id: 'broken', data: { format: 'liminal-room' } }, null);
    data.set(ROOMS, JSON.stringify(rooms));
    expect(loadRoom('broken')).toBeNull();
    expect(loadRoom(level.id).id).toBe(level.id);
  });

  it('bruker standardinnstillinger når lagrede innstillinger er ødelagt', () => {
    data.set('liminal.settings.v1', '{broken');
    expect(loadSettings().volume).toBe(0.8);
  });

  it('eldre innstillinger beholder vanlige bølger, og valget om stille vann lagres', () => {
    saveSettings({ volume: 0.5 });
    expect(loadSettings().waterWaves).toBe(1);
    for (const waterWaves of [0, 1.5, 2]) {
      expect(saveSettings({ waterWaves })).toBe(true);
      expect(loadSettings().waterWaves).toBe(waterWaves);
    }
    saveSettings({ waterWaves: 'invalid' });
    expect(loadSettings().waterWaves).toBe(1);
  });
});
