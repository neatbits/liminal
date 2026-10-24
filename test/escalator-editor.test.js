import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { History } from '../src/core/history.js';
import { STAIR_DIRS } from '../src/core/heights.js';
import { escalatorRuns, ESCALATOR, ESCALATOR_DOWN } from '../src/core/escalators.js';
import { levelToJSON, levelFromJSON } from '../src/core/serialize.js';
import { applyStairs, toolById, TOOLS } from '../src/editor/tools.js';
import { hoverText, toolText } from '../src/app/status.js';

function room() {
  const level = createLevel({ theme: 'mall', w: 20, h: 20, height: 7 });
  level.tiles.fill(TILE.FLOOR);
  return level;
}

describe('manuelle rulletrapper', () => {
  it('har en egen knapp og en unik hurtigtast, uten å endre Stairs-verktøyet', () => {
    expect(toolById('escalator').escalator).toBe(true);
    expect(toolById('stairs').escalator).toBeUndefined();
    expect(new Set(TOOLS.map(t => t.key.toLowerCase())).size).toBe(TOOLS.length);
  });

  it.each(STAIR_DIRS)('editorens dragning fungerer i retning %s, %s og begge motorretninger', (dx, dz) => {
    for (const down of [false, true]) {
      const level = room();
      const count = applyStairs(level, [9, 9], [9 + dx * 5, 9 + dz * 5], 2, false, { ...toolById('escalator'), down });
      expect(count).toBe(12);
      expect(escalatorRuns(level)).toHaveLength(1);
      expect(escalatorRuns(level)[0]).toMatchObject({ dir: [dx, dz], width: 2, length: 6, down });
      expect(hoverText(level, [9, 9])).toContain(`Escalator (${down ? 'down' : 'up'})`);
    }
  });

  it('kobler gulv til dekke også når man drar fra øvre til nedre repos', () => {
    for (const reverse of [false, true]) {
      const level = room();
      for (let z = 8; z <= 9; z++) level.decks[z * level.w + 12] = 44;
      const a = [6, 8], b = [11, 8];
      applyStairs(level, reverse ? b : a, reverse ? a : b, 2, false, { escalator: true, down: true });
      expect(escalatorRuns(level)[0]).toMatchObject({ dir: [1, 0], low: 0, rise: 4.4, down: true });
    }
  });

  it('kan tegnes om fra ned til opp, gjøres til vanlig trapp og fjernes med viskelær', () => {
    const level = room(), a = [5, 8], b = [10, 8], index = 8 * level.w + 5;
    applyStairs(level, a, b, 2, false, { escalator: true, down: true });
    expect(level.meta[index] & ESCALATOR_DOWN).toBeTruthy();
    applyStairs(level, a, b, 2, false, { escalator: true, down: false });
    expect(level.meta[index] & ESCALATOR_DOWN).toBe(0);
    applyStairs(level, a, b, 2, false);
    expect(escalatorRuns(level)).toHaveLength(0);
    expect(level.meta[index] & ESCALATOR).toBe(0);
    applyStairs(level, a, b, 2, false, { escalator: true });
    expect(applyStairs(level, a, b, 2, true, { escalator: true })).toBe(12);
    expect(escalatorRuns(level)).toHaveLength(0);
    expect(level.tiles[index]).toBe(TILE.FLOOR);
    expect(level.meta[index]).toBe(0);
  });

  it('angre, gjør om og lagring beholder plassering, bredde, høyde og kjøreretning', () => {
    const level = room(), history = new History();
    history.push(level);
    applyStairs(level, [5, 8], [10, 8], 3, false, { escalator: true, down: true });
    history.dropIfUnchanged(level);
    const runs = escalatorRuns(level);
    history.undo(level); expect(escalatorRuns(level)).toHaveLength(0);
    history.redo(level); expect(escalatorRuns(level)).toEqual(runs);
    expect(escalatorRuns(levelFromJSON(levelToJSON(level)))).toEqual(runs);
  });

  it('statuslinjen forklarer hvilken vei motoren går og hvilken bredde man tegner', () => {
    const state = { tool: toolById('escalator'), escalatorDown: true, brush: 2 };
    expect(toolText(state)).toContain('Escalator (down)');
    expect(toolText(state)).toContain('2 m wide');
    expect(toolText({ ...state, escalatorDown: false })).toContain('Escalator (up)');
  });
});
