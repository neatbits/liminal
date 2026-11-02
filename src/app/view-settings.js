// Innstillingene (View → Settings … og hovedmenyen): endringene lagres og brukes i 3D-visningen med en gang.
import { saveSettings } from '../core/storage.js';
import { settingsDialog } from '../ui/settings-dialog.js';

/** back: fra hovedmenyen; Done og Esc går tilbake dit. */
export function openSettings(app, { back } = {}) {
  settingsDialog(app.settings, (patch) => {
    Object.assign(app.settings, patch);
    saveSettings(app.settings);
    app.viewer.updateSettings({});
    app.viewer.options.onSettingsChange?.(app.settings); // musikknappen følger innstillingen
  }, back);
}
