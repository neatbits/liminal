import { describe, expect, it } from 'vitest';
import { createLevel, setTile, resizeLevel, TILE } from '../src/core/level.js';
import { History, applySnapshot } from '../src/core/history.js';

describe('historikk', () => {
  it('angrer og gjør om endringer', () => {
    const level = createLevel({ w: 8, h: 8 });
    const history = new History();
    history.push(level);
    setTile(level, 1, 1, TILE.FLOOR);
    expect(history.undo(level)).toBe(true);
    expect(level.tiles[9]).toBe(TILE.WALL);
    expect(history.redo(level)).toBe(true);
    expect(level.tiles[9]).toBe(TILE.FLOOR);
    expect(history.canRedo).toBe(false);
  });

  it('ny endring tømmer gjør-om-stakken', () => {
    const level = createLevel({ w: 8, h: 8 });
    const history = new History();
    history.push(level);
    setTile(level, 1, 1, TILE.FLOOR);
    history.undo(level);
    history.push(level);
    expect(history.canRedo).toBe(false);
  });

  it('dropper bilder uten faktisk endring', () => {
    const level = createLevel({ w: 8, h: 8 });
    const history = new History();
    history.push(level);
    history.dropIfUnchanged(level);
    expect(history.canUndo).toBe(false);
  });

  it('respekterer grensen for antall steg', () => {
    const level = createLevel({ w: 8, h: 8 });
    const history = new History(3);
    for (let i = 0; i < 5; i++) history.push(level);
    expect(history.undoStack).toHaveLength(3);
  });

  it('angrer også endring av størrelse', () => {
    const level = createLevel({ w: 8, h: 8 });
    const history = new History();
    history.push(level);
    applySnapshot(level, resizeLevel(level, 16, 10));
    expect(level.w).toBe(16);
    history.undo(level);
    expect(level.w).toBe(8);
    expect(level.tiles).toHaveLength(64);
  });

  it('angrer maling av soner, og tomme strøk gir ikke angre-steg', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 2, 2, TILE.WATER);
    const history = new History();
    history.push(level);
    level.depths[2 * 8 + 2] = 20;
    history.dropIfUnchanged(level);
    expect(history.canUndo).toBe(true);
    history.push(level);
    level.ceilings[2 * 8 + 2] = 40;
    history.undo(level);
    expect(level.ceilings[2 * 8 + 2]).toBe(0);
    history.undo(level);
    expect(level.depths[2 * 8 + 2]).toBe(0);
    history.redo(level);
    expect(level.depths[2 * 8 + 2]).toBe(20);
  });
});

describe('frøet i angrehistorikken', () => {
  it('følger med når man angrer en generering', () => {
    const level = createLevel({ w: 6, h: 6 });
    level.seed = 12;
    const history = new History();
    history.push(level);
    applySnapshot(level, { ...createLevel({ w: 6, h: 6 }), seed: 99 });
    expect(level.seed).toBe(99);
    history.undo(level);
    expect(level.seed).toBe(12);
  });
});
