// Felles tidsbudsjett per bilde for arbeid som kan deles opp (lysbakingen av gjenstandene, world/object-light.js): alt
// arbeidet deler BUDGET ms i hvert bilde, uansett hvor mange jobber som venter. Mange jobber med hver sine pauser
// (setTimeout) ble ellers kjørt etter hverandre før neste bilde – en rekke bilder på 100 ms.
const BUDGET = 6; // ms per bilde
const tasks = []; // { run(ms) → ferdig?, done() }
let scheduled = false;

const later = (fn) => (typeof requestAnimationFrame === 'function' && !globalThis.document?.hidden ? requestAnimationFrame(fn) : setTimeout(fn, 16));

function pump() {
  scheduled = false;
  const end = performance.now() + BUDGET;
  while (tasks.length && performance.now() < end) {
    const task = tasks[0];
    if (task.run(Math.max(1, end - performance.now()))) { tasks.shift(); task.done(); }
  }
  if (tasks.length) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  later(pump);
}

/** Kjører run(ms) i budsjettet (run returnerer true når den er ferdig). Løses når jobben er ferdig. */
export function inBudget(run) {
  return new Promise((done) => {
    tasks.push({ run, done });
    schedule();
  });
}
