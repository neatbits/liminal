import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/app.js';

afterEach(() => vi.useRealTimers());

function appFor(size) {
  const app = Object.create(App.prototype);
  app.level = { w: size, h: size };
  app._refreshUI = vi.fn();
  app._saveDraftSoon = vi.fn();
  app._rebuild = vi.fn(() => { clearTimeout(app._pending3D); app._pending3D = null; });
  return app;
}

describe('3D-bygging under tegning', () => {
  it('store rom venter under kontinuerlig tegning og bygger straks strøket er ferdig', () => {
    vi.useFakeTimers();
    const app = appFor(96);
    for (let i = 0; i < 20; i++) {
      app.changed('live');
      vi.advanceTimersByTime(20);
    }
    expect(app._rebuild).not.toHaveBeenCalled();
    app.changed('commit');
    vi.advanceTimersByTime(30);
    expect(app._rebuild).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(app._rebuild).toHaveBeenCalledTimes(1);
  });

  it('små rom beholder løpende forhåndsvisning under tegning', () => {
    vi.useFakeTimers();
    const app = appFor(32);
    for (let i = 0; i < 10; i++) {
      app.changed('live');
      vi.advanceTimersByTime(20);
    }
    expect(app._rebuild).toHaveBeenCalledTimes(1);
  });
});
