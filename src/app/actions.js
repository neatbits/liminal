// Fil-handlinger: nytt rom, eksempler, lagring, deling, import/eksport og generering.
import { spotDialog, descentDialog, runResultDialog, noclipDialog } from '../ui/run-dialogs.js';
import { startRun } from '../view3d/game-mode.js';
import { loadRuns } from '../core/storage.js';
import { applySnapshot } from '../core/history.js';
import { cloneLevel } from '../core/level.js';
import { randomSeed, parseSeed } from '../core/rng.js';
import { encodeLevel, levelFromJSON, levelToJSON } from '../core/serialize.js';
import { listRooms, loadRoom, saveRoom, deleteRoom } from '../core/storage.js';
import { generateLevel } from '../gen/index.js';
import { generateBuilding, newBuilding } from '../gen/new-building.js';
import { storeyCount } from '../core/storeys.js';
import { newRoomDialog, examplesDialog, myRoomsDialog, shareDialog } from '../ui/dialogs.js';
import { gameModeDialog } from '../ui/game-dialog.js';
import { startGame, startDaily } from '../view3d/game-mode.js';
import { dailyDialog, dailyResultDialog } from '../ui/daily-dialog.js';
import { dailyKey, dailyLabel, streak } from '../gen/daily.js';
import { loadDaily } from '../core/storage.js';
import { confirmDialog } from '../ui/modal.js';
import { SHARE_PARAM, WEB_APP, shareUrl } from '../core/share-link.js';
import { openSharedLinkDialog } from './shared-link.js';
import { toast } from '../ui/toast.js';

export { SHARE_PARAM };
const STORAGE_FULL = 'Could not save – browser storage is full, blocked or damaged. Export the room to keep a copy.';

/** Spør før ulagret arbeid erstattes. */
async function confirmReplace(app) {
  if (!app.dirty) return true;
  return confirmDialog(
    'Replace this room?',
    'The room you are working on has changes that are not saved to “My rooms”. Continue anyway?',
    'Yes, continue',
  );
}

/** draft: ved oppstart med et utkast fra forrige gang (da er «Continue» hovedvalget). */
export function newRoom(app, { startup = false, draft = false } = {}) {
  newRoomDialog({
    theme: app.editor.level.theme,
    startup,
    draft: draft ? app.level.name : null,
    onExamples: () => openExamples(app),
    onMine: () => openMine(app),
    onCreate: async (o) => {
      if (!(await confirmReplace(app))) return;
      const seed = parseSeed(o.seed) ?? randomSeed();
      const { template, ...options } = o;
      const room = newBuilding(template, { ...options, seed, name: 'New room' });
      app.setLevel(room);
      const n = storeyCount(room);
      if (n < o.floors) toast(`Only ${n} of ${o.floors} floors could be joined by stairs or ladders in this room size.`, { error: true });
      else if (template === 'random') toast(`New random room – seed ${seed}${n > 1 ? ` · ${n} floors` : ''}`);
    },
  });
}

/** Etter et spill (app.afterGame) og når det ikke gikk å starte: tilbake dit man kom fra. */
function startedGame(app, started, back) {
  if (started) app.afterGame = back ?? null;
  else if (back) {
    toast('This room has no floor to start from – continue the room and draw some first.', { error: true, ms: 5000 });
    back();
  }
}

/**
 * Tape hunt og Lights out (forsiden → app/#play, app/#lights, og menyene): velg stemning, så rett inn på
 * Level 1. back: fra hovedmenyen; Back, Esc og å gå ut av spillet går tilbake dit, ikke til editoren.
 */
export function playGame(app, mode = 'tapes', { back } = {}) {
  gameModeDialog({
    mood: app.settings.mood,
    mode,
    onBack: back,
    onStart: (mood) => startedGame(app, startGame(app.viewer, mood, () => (app.walk(), app.viewer.mode === 'walk'), mode), back),
  });
}

/** Spot the wrong og The Descent (menyene, app/#spot, app/#descent): side med rekorden, så rett inn. back: som playGame. */
export function playRun(app, run, { back } = {}) {
  const again = () => playRun(app, run, { back });
  app.viewer.options.onRun = (result) => runResultDialog(result, { again, onBack: back });
  const dialog = { spot: spotDialog, noclip: noclipDialog }[run] ?? descentDialog;
  dialog({
    records: loadRuns()[run],
    onBack: back,
    onStart: () => startedGame(app, startRun(app.viewer, run, () => (app.walk(), app.viewer.mode === 'walk')), back),
  });
}

/** Daily level (forsiden → app/#daily og menyene): dagens nivå på tid, likt for alle. back: som playGame. */
export function playDaily(app, { back } = {}) {
  const key = dailyKey();
  const records = loadDaily();
  app.viewer.options.onDaily = (result) => dailyResultDialog(result, { again: () => playDaily(app, { back }), onBack: back });
  dailyDialog({
    date: dailyLabel(key),
    best: records[key]?.best ?? null,
    days: streak(records, key),
    onBack: back,
    onStart: () => startedGame(app, startDaily(app.viewer, () => (app.walk(), app.viewer.mode === 'walk')), back),
  });
}

export function openExamples(app) {
  examplesDialog({
    onPick: async (level) => {
      if (!(await confirmReplace(app))) return;
      app.setLevel(level);
      toast(`Opened “${level.name}”`);
    },
  });
}

export function openMine(app) {
  myRoomsDialog({
    rooms: listRooms(),
    onOpen: async (id) => {
      if (!(await confirmReplace(app))) return;
      const level = loadRoom(id);
      if (level) app.setLevel(level);
      else toast('Could not find the room.', { error: true });
    },
    onDelete: (id) => {
      if (!deleteRoom(id)) {
        toast('Could not delete – browser storage is blocked or damaged.', { error: true });
        return false;
      }
      if (app.level.id === id) {
        app.level.id = null;
        app.changed();
      }
      return true;
    },
    onImport: () => importFile(app),
    onExport: () => exportFile(app),
  });
}

export function save(app, { copy = false } = {}) {
  if (copy) {
    const dup = cloneLevel(app.level);
    dup.id = null;
    dup.name = `${app.level.name} (copy)`;
    if (!saveRoom(dup)) return toast(STORAGE_FULL, { error: true });
    app.setLevel(dup);
    return toast(`Saved as “${dup.name}”`);
  }
  if (!saveRoom(app.level)) return toast(STORAGE_FULL, { error: true });
  app.markSaved();
  toast(`Saved “${app.level.name}” to My rooms`);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Link copied');
  } catch {
    toast('Could not copy automatically – select the link and copy it yourself.', { error: true });
  }
}

export async function share(app) {
  const code = await encodeLevel(app.level);
  // I programmet er adressen app://…, som ikke virker for andre: lenken går til nettsiden.
  const url = shareUrl(code, window.liminalDesktop ? WEB_APP : `${location.origin}${location.pathname}`);
  shareDialog({ url, onCopy: copyText });
}

/** Programmet: åpne en delt lenke man har fått (File → Open shared link …). */
export function openShared(app) {
  openSharedLinkDialog(async (level) => {
    if (!(await confirmReplace(app))) return;
    app.setLevel(level);
    toast(`Opened “${level.name}”`);
  });
}

function slug(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'room'
  );
}

export function exportFile(app) {
  const blob = new Blob([JSON.stringify(levelToJSON(app.level), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(app.level.name)}.liminal.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function importFile(app) {
  const input = document.getElementById('file-input');
  input.value = '';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const level = levelFromJSON(JSON.parse(await file.text()));
      if (!(await confirmReplace(app))) return;
      app.setLevel(level, { dirty: true });
      toast(`Imported “${level.name}”`);
    } catch (e) {
      toast(e instanceof SyntaxError ? 'The file is not valid JSON.' : e.message, { error: true });
    }
  };
  input.click();
}

/**
 * Genererer i samme størrelse fra frøet (eller et tilfeldig), kan angres. floors: 'this' = bare etasjen som
 * tegnes, ellers hele bygget i rommets tema, med 'random' (1–3) eller så mange etasjer.
 */
export function generateInto(app, seed = null, floors = 'random') {
  const { w, h, height, waterDepth, name } = app.level;
  const ed = app.editor;
  const s = parseSeed(seed) ?? randomSeed();
  if (floors === 'this') {
    const fresh = generateLevel({ theme: ed.level.theme, w, h, seed: s }); // etasjen med sitt tema
    ed.checkpoint();
    applySnapshot(ed.level, fresh);
    app.mutated();
    toast(`Generated from seed ${s} – Ctrl+Z to undo`);
    return;
  }
  const wanted = floors === 'random' ? floors : +floors;
  const fresh = generateBuilding({ theme: app.level.theme, w, h, seed: s, floors: wanted, height, waterDepth, name });
  ed.checkpoint(true);
  applySnapshot(app.level, fresh);
  app.level.storeys = fresh.storeys ?? [];
  app.level.spawnStorey = 0;
  ed.setStorey(0);
  app.mutated();
  const n = storeyCount(app.level);
  toast(`Generated ${n > 1 ? `${n} floors` : '1 floor'} from seed ${s} – Ctrl+Z to undo`);
}
