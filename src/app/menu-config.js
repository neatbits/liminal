// Innholdet i toppmenyene.
import { newRoom, openExamples, openMine, save, share, exportFile, importFile, generateInto } from './actions.js';
import { helpDialog } from '../ui/dialogs.js';
import { openModal } from '../ui/modal.js';
import { h } from '../ui/dom.js';

function about() {
  openModal({
    title: 'About Liminal',
    body: h(
      'div',
      {},
      h('p', { text: "Draw rooms that don't exist in the 2D plan, watch them take shape in 3D – and walk through them." }),
      h('p', {
        text: 'All textures, lights and sounds are generated procedurally in the browser. Rooms are stored locally on your device and can be shared as a link.',
      }),
      h('p', {}, h('a', { href: '../about/', target: '_blank', rel: 'noopener', text: 'Privacy, credits and licences →' })),
    ),
    actions: [{ label: 'Close', primary: true }],
  });
}

export function menuConfig(app) {
  return [
    {
      label: 'File',
      items: [
        { label: 'New room …', action: () => newRoom(app) },
        { label: 'Examples …', action: () => openExamples(app) },
        { label: 'My rooms …', action: () => openMine(app) },
        '-',
        { label: 'Save', shortcut: 'Ctrl+S', action: () => save(app) },
        { label: 'Save as copy', action: () => save(app, { copy: true }) },
        '-',
        { label: 'Share link …', action: () => share(app) },
        { label: 'Export file', action: () => exportFile(app) },
        { label: 'Import file …', action: () => importFile(app) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => app.editor.undo() },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => app.editor.redo() },
        '-',
        { label: 'Fill with lights', action: () => app.fillLights() },
        { label: 'Remove all lights', action: () => app.clearLights() },
        { label: 'Generate random room', action: () => generateInto(app) },
      ],
    },
    {
      label: 'View',
      items: [
        { label: '2D and 3D', action: () => app.layout.set('split') },
        { label: '2D plan only', action: () => app.layout.set('2d') },
        { label: '3D only', action: () => app.layout.set('3d') },
        '-',
        { label: 'Fit plan', shortcut: '0', action: () => app.editor.fit() },
        { label: 'Toggle grid', action: () => app.setHelper('grid', !app.settings.grid) },
        { label: 'Toggle rulers', action: () => app.setHelper('rulers', !app.settings.rulers) },
        { label: 'Toggle water reflections', action: () => app.toggleWaterReflections() },
        '-',
        { label: 'Walk the room', action: () => app.walk(false) },
        { label: 'Walk the room in fullscreen', action: () => app.walk(true) },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard shortcuts', shortcut: '?', action: () => helpDialog() },
        { label: 'About Liminal', action: about },
      ],
    },
  ];
}
