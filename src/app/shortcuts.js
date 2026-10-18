// Hurtigtaster for editoren og appen.
import { TOOLS, SHAPES } from '../editor/tools.js';
import { helpDialog } from '../ui/dialogs.js';
import { isTyping } from '../ui/dom.js';
import { save } from './actions.js';

export function bindShortcuts(app) {
  window.addEventListener('keydown', (e) => {
    if (isTyping(e) || document.querySelector('.modal-backdrop')) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod) {
      if (key === 'z' && !e.shiftKey) app.editor.undo();
      else if (key === 'y' || (key === 'z' && e.shiftKey)) app.editor.redo();
      else if (key === 's') save(app);
      else return;
      e.preventDefault();
      return;
    }
    if (e.altKey) return;

    if (e.code === 'Space') {
      app.editor.spaceDown = true;
      if (e.target === document.body) e.preventDefault();
      return;
    }
    // Bokstavtaster (verktøy C/D, former B/R/F) gjelder ikke når man går – D er å gå til høyre.
    const walking = app.viewer.mode === 'walk';
    const tool = TOOLS.find((t) => t.key.toLowerCase() === key);
    if (tool && !(walking && /[a-z]/i.test(tool.key))) return app.setTool(tool.id);
    const shape = SHAPES.find((s) => s.key.toLowerCase() === key);
    if (shape && !walking) return app.setShape(shape.id);
    if (e.key === '[') return app.setBrush(app.editor.brush - 1);
    if (e.key === ']') return app.setBrush(app.editor.brush + 1);
    if (e.key === '0') return app.editor.fit();
    if (e.key === '?') return helpDialog();
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') app.editor.spaceDown = false;
  });
  window.addEventListener('blur', () => (app.editor.spaceDown = false));
}
