// Fil-handlinger: nytt rom, eksempler, lagring, deling, import/eksport og generering.
import { applySnapshot } from '../core/history.js';
import { cloneLevel } from '../core/level.js';
import { randomSeed, parseSeed } from '../core/rng.js';
import { encodeLevel, levelFromJSON, levelToJSON } from '../core/serialize.js';
import { listRooms, loadRoom, saveRoom, deleteRoom } from '../core/storage.js';
import { generateLevel, levelFromTemplate } from '../gen/index.js';
import { newRoomDialog, examplesDialog, myRoomsDialog, shareDialog } from '../ui/dialogs.js';
import { confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

export const SHARE_PARAM = 'room';
const STORAGE_FULL = 'Could not save – browser storage is full or blocked.';

/** Spør før ulagret arbeid erstattes. */
async function confirmReplace(app) {
  if (!app.dirty) return true;
  return confirmDialog(
    'Replace this room?',
    'The room you are working on has changes that are not saved to “My rooms”. Continue anyway?',
    'Yes, continue',
  );
}

export function newRoom(app) {
  newRoomDialog({
    theme: app.level.theme,
    onCreate: async (o) => {
      if (!(await confirmReplace(app))) return;
      const seed = parseSeed(o.seed) ?? randomSeed();
      app.setLevel(levelFromTemplate(o.template, { ...o, seed, name: 'New room' }));
      if (o.template === 'random') toast(`New random room – seed ${seed}`);
    },
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
      deleteRoom(id);
      if (app.level.id === id) app.level.id = null;
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
  const url = `${location.origin}${location.pathname}#${SHARE_PARAM}=${code}`;
  shareDialog({ url, onCopy: copyText });
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

/** Genererer et rom i samme tema og størrelse fra frøet (eller et tilfeldig), kan angres. */
export function generateInto(app, seed = null) {
  const { theme, w, h } = app.level;
  const s = parseSeed(seed) ?? randomSeed();
  const fresh = generateLevel({ theme, w, h, seed: s });
  app.editor.checkpoint();
  applySnapshot(app.level, fresh);
  app.mutated();
  toast(`Generated from seed ${s} – Ctrl+Z to undo`);
}
