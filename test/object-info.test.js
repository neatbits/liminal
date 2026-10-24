import { describe, expect, it } from 'vitest';
import { OBJECTS } from '../src/core/objects.js';
import { OBJECT_GROUPS, OBJECT_ICONS, objectGroups, objectInfo } from '../src/ui/object-info.js';

describe('objektvelgeren', () => {
  it('hver gjenstand i katalogen står i nøyaktig én gruppe og har et ikon', () => {
    const listed = OBJECT_GROUPS.flatMap(([, ids]) => ids);
    expect(new Set(listed).size).toBe(listed.length); // ingen dobbelt
    for (const id of Object.keys(OBJECTS)) {
      expect(listed, `${id} mangler gruppe i ui/object-info.js`).toContain(id);
      expect(OBJECT_ICONS[id], `${id} mangler ikon`).toBeTruthy();
    }
    for (const id of listed) expect(OBJECTS[id], `${id} finnes ikke i katalogen`).toBeDefined();
    expect(objectGroups().map(([label]) => label)).not.toContain('Other');
  });

  it('beskriver størrelse og hva gjenstanden kan', () => {
    expect(objectInfo('divingboard')).toMatch(/^1\.5 × 5\.2 m, 1\.7 m tall · Walk out on it/);
    expect(objectInfo('duck')).toContain('Floats in the water');
    expect(objectInfo('fan')).toContain('Hangs from the ceiling');
    expect(objectInfo('nonsense')).toBe('');
  });
});
