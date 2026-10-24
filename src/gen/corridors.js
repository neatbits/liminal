// Korridornivåer for de uendelige nivåene: én lang, rett gang der dører (til små nisjer) og lys
// gjentar seg i et fast mønster – så gangen kan bli uendelig i gåmodus (world/anomalies.js). Det
// eneste som bryter mønsteret er utgangen i den andre enden. Ren logikk.
import { createLevel, TILE, LIGHT } from '../core/level.js';
import { DOOR, setDoor } from '../core/doors.js';
import { getTheme } from '../core/themes.js';
import { rectIndices } from '../core/ops.js';
import { fillZone, FINISH } from '../core/zones.js';
import { yawFromDir } from '../core/spawn.js';
import { fillRect } from './util.js';
import { scaled } from './sizes.js';

export const CORRIDOR_THEMES = ['hotel', 'office', 'school', 'ward', 'backrooms', 'basement'];

/**
 * En lang gang i temaet. Returnerer nivået (med startpunkt i den ene enden og utgang i den andre).
 * scale gjør gangen kortere eller lengre (gen/sizes.js).
 */
export function corridorLevel(theme, rand, name, scale = 1) {
  const w = scaled(72 + Math.floor(rand() * 4) * 8, scale, 32);
  const width = 2 + Math.floor(rand() * 2); // 2 eller 3 ruter bred
  const h = width + 6;
  const level = createLevel({ theme, w, h, name });
  const z0 = 3;
  const z1 = z0 + width - 1;
  fillRect(level, 2, z0, w - 3, z1, TILE.FLOOR);
  // Dører i fast takt på begge sider, forskjøvet en halv periode, med en liten nisje bak. Takten er
  // to ganger lysavstanden, så hele mønsteret gjentar seg hver P meter.
  const spacing = getTheme(theme).lightSpacing;
  const P = 2 * spacing;
  for (let x = 4; x < w - 4; x += P) {
    for (const [dz, door, x0] of [[-1, z0 - 1, x], [1, z1 + 1, x + P / 2]]) {
      if (x0 >= w - 4) continue;
      fillRect(level, x0, door + dz, x0, door + dz, TILE.FLOOR);
      fillRect(level, x0, door, x0, door, TILE.DOOR);
      setDoor(level, x0, door, DOOR.CLOSED);
    }
  }
  // Lys i midten av gangen med temaets avstand (alle tent: blinking ville brutt mønsteret).
  const zl = Math.floor((z0 + z1) / 2);
  for (let x = 2; x < w - 2; x++) if (x % spacing === 1) level.lights[zl * w + x] = LIGHT.ON;
  if (theme === 'school') fillZone(level, 'finish', rectIndices(level, { x0: 2, z0, x1: w - 3, z1 }), FINISH.TILES); // skap
  level.spawn = { x: 3, z: (z0 + z1 + 1) / 2, a: yawFromDir(1, 0) };
  // Utgangen i endeveggen i den andre enden (ikke i en nisje midt i gangen – det ville brutt mønsteret).
  fillRect(level, w - 2, z0, w - 2, z0, TILE.DOOR);
  setDoor(level, w - 2, z0, DOOR.CLOSED);
  return level;
}
