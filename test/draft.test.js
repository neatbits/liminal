import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftSaver } from '../src/app/draft.js';
import { createLevel } from '../src/core/level.js';
import { loadDraft } from '../src/core/storage.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  const data = new Map();
  vi.stubGlobal('localStorage', { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('automatisk lagring av utkast', () => {
  it('lagrer siste endring etter at redigeringen har hvilt', () => {
    const level = createLevel({ name: 'A' });
    const drafts = new DraftSaver(() => level, vi.fn());
    drafts.schedule();
    vi.advanceTimersByTime(500);
    level.name = 'B';
    drafts.schedule();
    vi.advanceTimersByTime(500);
    expect(loadDraft()).toBeNull();
    vi.advanceTimersByTime(100);
    expect(loadDraft().name).toBe('B');
  });

  it.each(['pagehide', 'visibilitychange'])('lagrer straks ved %s før ventetiden har gått', (type) => {
    const level = createLevel({ name: 'Last edit' });
    new DraftSaver(() => level, vi.fn()).schedule();
    if (type === 'pagehide') window.dispatchEvent(new Event(type));
    else {
      document.hidden = true;
      document.dispatchEvent(new Event(type));
    }
    expect(loadDraft().name).toBe('Last edit');
  });

  it('varsler én gang ved gjentatt feil, og prøver igjen ved neste endring', () => {
    const onError = vi.fn();
    const level = createLevel();
    const drafts = new DraftSaver(() => level, onError);
    const storage = globalThis.localStorage;
    vi.stubGlobal('localStorage', undefined);
    for (let i = 0; i < 2; i++) { drafts.schedule(); drafts.flush(); }
    expect(onError).toHaveBeenCalledTimes(1);
    vi.stubGlobal('localStorage', storage);
    drafts.schedule();
    expect(drafts.flush()).toBe(true);
    expect(loadDraft()).not.toBeNull();
    vi.stubGlobal('localStorage', undefined);
    drafts.schedule();
    drafts.flush();
    expect(onError).toHaveBeenCalledTimes(2);
  });
});
