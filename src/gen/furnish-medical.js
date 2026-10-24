// A sparse patient area: bed with optional privacy screen and bedside trolley.
import { FACING } from '../core/objects.js';
import { tryPlace, put } from './furnish-sets.js';

export function patient(level, rand, x, z) {
  const bed = tryPlace(level, x, z, 'hospitalbed', 3);
  if (!bed) return false;
  const [fx, fz] = FACING[bed.rot];
  const side = rand() < 0.5 ? -1 : 1;
  if (rand() < 0.7) put(level, 'medicalscreen', x - fz * side * 2 + fx, z + fx * side * 2 + fz, (bed.rot + 1) % 4);
  if (rand() < 0.6) put(level, 'medicaltrolley', x + fz * side * 2, z - fx * side * 2, bed.rot);
  return true;
}
