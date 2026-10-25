import { describe, expect, it } from 'vitest';
import { WEB_APP, shareCode, shareUrl } from '../src/core/share-link.js';
import { encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { presetById } from '../src/gen/index.js';

describe('delte lenker', () => {
  it('programmet lager lenker til nettsiden, og koden leses fra hele lenken, bare #room= eller koden alene', async () => {
    const level = presetById('level0').make();
    const code = await encodeLevel(level);
    const url = shareUrl(code, WEB_APP);
    expect(url).toBe(`https://liminalsimulator.com/app/#room=${code}`);
    for (const text of [url, `  ${url}\n`, `#room=${code}`, `https://neatbits.no/liminal/app/#rom=${code}`, code]) {
      expect(shareCode(text), text.slice(0, 40)).toBe(code);
    }
    expect((await decodeLevel(shareCode(url))).name).toBe(level.name);
  });

  it('noe som ikke er en romlenke gir null', () => {
    for (const text of ['', 'hei', 'https://liminalsimulator.com/app/', 'https://example.com/#other=abc', null, undefined]) {
      expect(shareCode(text)).toBeNull();
    }
  });
});
