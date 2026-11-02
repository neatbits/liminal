// Daily level i produksjonsbygget (gen/daily.js, view3d/daily.js): app/#daily åpner dagens nivå, likt
// ved ny lasting (samme tema, rom og kassetter); døren er låst til alle kassettene er funnet, klokken går,
// og målet gir resultatet med tid og tekst å dele, og en lagret rekord.
import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';

export async function checkDaily(browser, origin) {
  const { call, evaluate } = browser;
  const open = async () => {
    await call('Page.navigate', { url: 'about:blank' });
    await call('Page.navigate', { url: `${origin}/app/#daily` });
    await waitFor(() => evaluate(`Boolean(window.liminal?.level && document.querySelector('.modal[aria-label="Daily level"]'))`).catch(() => false), 'daily dialog');
    await evaluate(`liminal.layout.set('3d'); document.querySelector('.modal .btn-accent').click()`);
    await waitFor(() => evaluate(`liminal.viewer.mode === 'walk' && liminal.viewer.explorer.daily.active && liminal.viewer.explorer.total > 0`).catch(() => false), 'daily level');
    return evaluate(`(() => { const v = liminal.viewer, ex = v.explorer; v.renderer.setAnimationLoop(null);
      return { name: v.walk.level.name, theme: v.world.theme.id, mood: v.settings.mood, total: ex.total,
        tapes: ex.tapes.items.map((t) => [+t.x.toFixed(3), +t.z.toFixed(3)]), title: document.querySelector('.hud-title')?.textContent ?? '' }; })()`);
  };
  const first = await open();
  assert.match(first.name, /^Daily \d{4}-\d{2}-\d{2}$/);
  assert.equal(first.mood, 'liminal');
  assert.match(first.title, /DAILY LEVEL/);
  const again = await open();
  assert.deepEqual(again, first, 'the same level and tapes after a reload');
  // Låst dør, klokken går, kassettene plukkes opp, og døren blir målet.
  const run = await evaluate(`(async () => { const v = liminal.viewer, ex = v.explorer, w = v.walk.walker; v.walk.session.resume();
    ex.goDeeper({ door: {} });
    const locked = ex.daily.active && v.walk.mode !== 'overview';
    for (let i = 0; i < 90; i++) ex.update(1 / 30); // 3 s
    const clock = ex.daily.run.time;
    for (const t of [...ex.tapes.items]) { w.x = t.x; w.z = t.z; w.floorY = t.y; ex.update(1 / 30); }
    const extra = document.querySelector('.hud-extra').textContent;
    ex.goDeeper({ door: {} });
    await new Promise((r) => setTimeout(r, 100));
    const dialog = document.querySelector('.modal[aria-label="Daily level complete"]');
    return { locked, clock: +clock.toFixed(1), found: ex.found, extra, mode: v.mode, done: !ex.daily.active,
      time: dialog?.querySelector('.daily-time')?.textContent ?? '', share: dialog?.querySelector('textarea')?.value ?? '',
      saved: Object.keys(JSON.parse(localStorage.getItem('liminal.daily.v1') ?? '{}')).length }; })()`);
  assert.equal(run.locked, true, 'the door is locked until every tape is found');
  assert.ok(run.clock >= 2.9, `the clock runs: ${run.clock}`);
  assert.equal(run.found, first.total);
  assert.match(run.extra, /DAILY · ⏱ 0:0\d/);
  assert.deepEqual({ mode: run.mode, done: run.done, saved: run.saved }, { mode: 'overview', done: true, saved: 1 });
  assert.match(run.time, /^0:0\d$/);
  assert.match(run.share, new RegExp(`^Liminal Simulator · Daily \\d{4}-\\d{2}-\\d{2} · 📼 ${first.total}/${first.total} in 0:0\\d\\nliminalsimulator.com$`));
  await evaluate(`document.querySelector('.modal-foot .btn:not(.btn-accent)').click(); liminal.viewer.renderer.setAnimationLoop((t) => liminal.viewer._tick(t))`);
  console.log(`PASS daily level: the same ${first.theme} level and ${first.total} tapes on reload, locked door, clock, result and record`);
}
