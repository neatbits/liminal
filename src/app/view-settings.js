// Innstillingene (View → Settings …): endringene lagres og brukes i 3D-visningen med en gang.
import { saveSettings } from '../core/storage.js';
import { settingsDialog } from '../ui/settings-dialog.js';

export function openSettings(app) {
  settingsDialog(app.settings, (patch) => {
    Object.assign(app.settings, patch);
    saveSettings(app.settings);
    app.viewer.updateSettings({});
  });
}
