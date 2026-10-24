// Oppstart: laster stilark, lager appen og åpner riktig rom
// (delt lenke → eksempel fra forsiden (#example=…) → utkast fra forrige økt → «Level 0»).
import './styles/base.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/tools.css';
import './styles/panes.css';
import './styles/hud.css';
import './styles/hud-fx.css';
import './styles/hud-pause.css';
import './styles/overlays.css';
import './styles/mobile-player.css';
import { decodeLevel } from './core/serialize.js';
import { loadDraft } from './core/storage.js';
import { presetById } from './gen/index.js';
import { App } from './app/app.js';
import { MobilePlayer } from './app/mobile-player.js';
import { phoneLayout } from './core/phone.js';
import { toast } from './ui/toast.js';
import { newRoom } from './app/actions.js';
import { bindFeedback } from './ui/feedback.js';

// #room=… (nå) og #rom=… (lenker fra første, norske versjon).
const SHARE_HASH = /^#(?:room|rom)=(.+)$/;

async function levelFromHash() {
  const m = SHARE_HASH.exec(location.hash);
  if (!m) return null;
  try {
    return await decodeLevel(m[1]);
  } catch (e) {
    toast(e.message, { error: true, ms: 5000 });
    return null;
  } finally {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/** #example=pools osv. – lenkene fra forsiden. */
function presetFromHash() {
  const m = /^#example=([\w-]+)$/.exec(location.hash);
  if (!m) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return presetById(m[1])?.make() ?? null;
}

async function start() {
  const shared = await levelFromHash();
  const preset = shared ? null : presetFromHash();
  const phone = phoneLayout({ coarse: matchMedia('(pointer: coarse)').matches,
    width: document.documentElement.clientWidth, height: innerHeight });
  const app = phone ? new MobilePlayer({ initial: shared ?? preset ?? loadDraft() }) : new App();
  window.liminal = app; // nyttig for feilsøking i konsollen
  bindFeedback({ endpoint: '../api/feedback.php', page: 'simulator' });
  if(phone)return;
  app.setLevel(shared ?? preset ?? loadDraft() ?? presetById('level0').make());
  if (shared) toast(`Shared room: “${shared.name}”. Press “Walk the room” to explore.`, { ms: 5000 });
  if (!shared && !preset) newRoom(app, { startup: true });
}

start();
