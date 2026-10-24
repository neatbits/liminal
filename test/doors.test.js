import { describe, expect, it } from 'vitest';
import { createLevel, setTile, setLight, TILE, LIGHT } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { getTheme } from '../src/core/themes.js';
import { DOOR, doorInfo, canHoldDoor, setDoor, closedDoorFaces, leafPose, doorInReach, toggleDoor } from '../src/core/doors.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { buildDoors, closedLeafBox } from '../src/world/doors.js';
import { moveCircle } from '../src/world/collision.js';
import { createLightField } from '../src/world/lighting.js';
import { hexToLinear } from '../src/world/color.js';
import { doorsInWalls } from '../src/gen/doors.js';

// To rom (z 1–3 og z 5–7) skilt av en vegg i z = 4. Vegg i z = 8 og bakover er massiv.
function rooms() {
  const level = createLevel({ w: 10, h: 12 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 8, z1: 3 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 1, z0: 5, x1: 8, z1: 7 }), TILE.FLOOR);
  return level;
}

describe('dører', () => {
  it('kan settes i vegg mellom rom og i vegg med rom bare på én side', () => {
    const level = rooms();
    expect(canHoldDoor(level, 4, 4)).toBe(true); // mellom rommene
    expect(canHoldDoor(level, 4, 8)).toBe(true); // vegg bak: dør til ingensteds
    expect(canHoldDoor(level, 4, 10)).toBe(false); // massiv vegg
    expect(canHoldDoor(level, 0, 2)).toBe(false); // ytterkanten
    expect(canHoldDoor(level, 4, 2)).toBe(false); // gulv midt i rommet
  });

  it('dørverktøyet lager åpning med dørblad, snur døren og fjerner bladet', () => {
    const level = rooms();
    expect(setDoor(level, 4, 4, DOOR.AJAR)).toBe(1);
    expect(level.tiles[4 * 10 + 4]).toBe(TILE.DOOR);
    const first = doorInfo(level, 4, 4);
    expect(first).toMatchObject({ pz: true, state: DOOR.AJAR, closet: false, hinge: 0 });
    const seen = new Set();
    for (let k = 0; k < 4; k++) {
      setDoor(level, 4, 4, DOOR.AJAR);
      const d = doorInfo(level, 4, 4);
      seen.add(`${d.side}/${d.hinge}`);
    }
    expect(seen.size).toBe(4); // alle fire kombinasjoner av slagside og hengsler
    expect(setDoor(level, 4, 4, DOOR.CLOSED)).toBe(1);
    expect(doorInfo(level, 4, 4).state).toBe(DOOR.CLOSED);
    expect(setDoor(level, 4, 4, 0, true)).toBe(1);
    expect(level.tiles[4 * 10 + 4]).toBe(TILE.DOOR);
    expect(doorInfo(level, 4, 4).state).toBe(DOOR.NONE);
  });

  it('en dør til ingensteds slår alltid ut mot rommet', () => {
    const level = rooms();
    setDoor(level, 4, 8, DOOR.CLOSED);
    const d = doorInfo(level, 4, 8);
    expect(d).toMatchObject({ closet: true, side: -1, face: 8 });
    setDoor(level, 4, 8, DOOR.CLOSED); // snur bare hengslene
    expect(doorInfo(level, 4, 8)).toMatchObject({ side: -1, hinge: 1 });
  });

  it('dørbladet glemmes når ruten blir noe annet', () => {
    const level = rooms();
    setDoor(level, 4, 4, DOOR.OPEN);
    setTile(level, 4, 4, TILE.WALL);
    setTile(level, 4, 4, TILE.DOOR);
    expect(doorInfo(level, 4, 4).state).toBe(DOOR.NONE);
  });

  it('åpen dør står vinkelrett ut i rommet på slagsiden', () => {
    const level = rooms();
    setDoor(level, 4, 4, DOOR.OPEN);
    const d = doorInfo(level, 4, 4);
    const pose = leafPose(d);
    expect(pose.o[1]).toBe(d.face);
    expect(pose.u[0]).toBeCloseTo(0, 6);
    expect(pose.u[1]).toBeCloseTo(d.side, 6);
    setDoor(level, 4, 4, DOOR.CLOSED);
    expect(leafPose(doorInfo(level, 4, 4)).u).toEqual([1, 0]);
  });

  it('lukket dør stenger kanten den sitter i', () => {
    const level = rooms();
    setDoor(level, 4, 4, DOOR.CLOSED);
    const side = doorInfo(level, 4, 4).side;
    expect(closedDoorFaces(level)[4 * 10 + 4]).toBe(side > 0 ? 2 : 1);
    setDoor(level, 4, 4, DOOR.OPEN);
    expect(closedDoorFaces(level).every((f) => f === 0)).toBe(true);
  });

  it('lager karm bare når temaet har det, og boddører får egen tekstur', () => {
    const level = rooms();
    setDoor(level, 4, 4, DOOR.CLOSED);
    setDoor(level, 6, 8, DOOR.CLOSED);
    const plain = buildDoors(level, { frame: null, closet: null }, null);
    expect(plain.trim.vertexCount).toBe(0);
    // Boddøren (vegg bak) ligger i det felles bladet; døren mellom rommene kan åpnes og ligger for seg.
    expect(plain.leaf.quadCount).toBe(6);
    expect(plain.swing).toHaveLength(1);
    expect(plain.swing[0]).toMatchObject({ i: 4 * 10 + 4 });
    expect(plain.swing[0].leaf.quadCount).toBe(6);
    const styled = buildDoors(level, { frame: '#fff', closet: 'x' }, null);
    expect(styled.trim.quadCount).toBeGreaterThan(0);
    expect(styled.leaf.quadCount).toBe(0);
    expect(styled.closet.quadCount).toBe(6);
    // Beslag: vridere med rosett og nøkkelskilt på begge sider, og tre hengsler.
    expect(styled.knob.quadCount).toBeGreaterThan(100);
    const kick = buildDoors(level, { frame: '#fff', closet: 'x', kick: true }, null);
    expect(kick.knob.quadCount).toBe(styled.knob.quadCount + 12); // sparkeplate på begge sider
    const knob = buildDoors(level, { frame: '#fff', closet: 'x', handle: 'knob' }, null);
    expect(knob.knob.quadCount).not.toBe(styled.knob.quadCount);
  });

  it('man åpner og lukker døren man står foran, men ikke dører til ingensteds', () => {
    const level = rooms();
    setDoor(level, 4, 4, DOOR.CLOSED);
    setDoor(level, 6, 8, DOOR.CLOSED);
    const facingDoor = Math.PI; // yaw π ser mot +z
    const near = doorInReach(level, 4.5, 3.2, facingDoor);
    expect(near?.i).toBe(4 * 10 + 4);
    expect(doorInReach(level, 4.5, 3.2, 0)).toBeNull(); // ser bort
    expect(doorInReach(level, 6.5, 7.2, facingDoor)).toBeNull(); // dør til ingensteds
    expect(toggleDoor(level, near.i, 4.5, 3.2, 0.28)).toBe(DOOR.OPEN);
    expect(doorInfo(level, 4, 4).state).toBe(DOOR.OPEN);
    // Står man i døråpningen, lukkes den ikke over en.
    const face = doorInfo(level, 4, 4).face;
    expect(toggleDoor(level, near.i, 4.5, face, 0.28)).toBeNull();
    expect(toggleDoor(level, near.i, 4.5, 3.2, 0.28)).toBe(DOOR.CLOSED);
  });

  it('en dør i en åpning i veggen (gulvrute) går også an', () => {
    const level = rooms();
    level.tiles[4 * 10 + 6] = TILE.FLOOR; // åpning i veggen z = 4
    expect(canHoldDoor(level, 6, 4)).toBe(true);
    expect(setDoor(level, 6, 4, DOOR.CLOSED)).toBe(1);
    expect(level.tiles[4 * 10 + 6]).toBe(TILE.DOOR);
  });

  it('lukket dør stopper spilleren, åpen dør gjør det ikke', () => {
    const level = rooms();
    setDoor(level, 4, 4, DOOR.CLOSED);
    expect(closedLeafBox(doorInfo(level, 4, 4))).not.toBeNull();
    let [, z] = moveCircle(level, 4.5, 2.5, 0, 4, 0.28);
    expect(z).toBeLessThan(5);
    setDoor(level, 4, 4, DOOR.OPEN);
    [, z] = moveCircle(level, 4.5, 2.5, 0, 4, 0.28);
    expect(z).toBeCloseTo(6.5, 6);
  });

  it('lukket dør stenger for lyset fra rommet ved siden av', () => {
    const level = rooms();
    setTile(level, 4, 4, TILE.DOOR);
    setLight(level, 4, 2, LIGHT.ON);
    const theme = getTheme('basement');
    const ambient = hexToLinear(theme.light.ambient)[0];
    const lit = () => createLightField(level, theme).sample(4.5, 0, 6.2, 0, 1, 0)[0];
    const open = lit();
    expect(open).toBeGreaterThan(ambient * 1.2);
    setDoor(level, 4, 4, DOOR.CLOSED);
    expect(lit()).toBeCloseTo(ambient, 5);
  });

  it('dørene lagres og leses igjen', () => {
    const level = rooms();
    setDoor(level, 4, 4, DOOR.AJAR);
    setDoor(level, 4, 4, DOOR.AJAR);
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level))));
    expect(doorInfo(back, 4, 4)).toEqual(doorInfo(level, 4, 4));
  });

  it('generatoren setter dører til ingensteds bare der det er vegg bak', () => {
    const level = rooms();
    const n = doorsInWalls(level, () => 0, 1, { nowhere: true, minGap: 3 });
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < level.tiles.length; i++) {
      if (level.tiles[i] !== TILE.DOOR) continue;
      const d = doorInfo(level, i % 10, (i / 10) | 0);
      expect(d.closet).toBe(true);
      expect(d.state).toBe(DOOR.CLOSED);
    }
  });
});
