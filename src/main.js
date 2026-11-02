// Oppstart: laster stilark, lager appen og åpner riktig rom
// (delt lenke → eksempel fra forsiden (#example=…) → utkast fra forrige økt → «Level 0»).
// #play (Game mode fra forsiden): rommet fra forrige økt bak, og stemningsvalget før Level 1.
// I programmet (Electron) åpner vanlig oppstart startmenyen i stedet for «New room».
import './styles/base.css';
import '@fontsource/vt323/latin-400.css'; // VHS-fonten pakkes med (OFL), ingen henting fra Google
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/tools.css';
import './styles/panes.css';
import './styles/hud.css';
import './styles/hud-fx.css';
import './styles/hud-pause.css';
import './styles/overlays.css';
import './styles/mobile-player.css';
import './styles/start-screen.css';
import './styles/start-menu.css';
import { decodeLevel } from './core/serialize.js';
import { loadDraft } from './core/storage.js';
import { presetById } from './gen/index.js';
import { App } from './app/app.js';
import { MobilePlayer } from './app/mobile-player.js';
import { phoneLayout } from './core/phone.js';
import { toast } from './ui/toast.js';
import { newRoom, playGame, playDaily, playRun } from './app/actions.js';
import { desktop, startMenu, bindStartMenu } from './app/start-menu.js';
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

/** Spillkortene på forsiden: #play (Game mode), #lights (Lights out), #daily (Daily level). Ellers false. */
function gameFromHash() {
  const game = { '#play': 'play', '#lights': 'lights', '#daily': 'daily', '#spot': 'spot', '#descent': 'descent', '#noclip': 'noclip' }[location.hash] ?? false;
  if (game) history.replaceState(null, '', location.pathname + location.search);
  return game;
}

async function start() {
  const game = gameFromHash();
  const shared = await levelFromHash();
  const preset = shared ? null : presetFromHash();
  const phone = phoneLayout({ coarse: matchMedia('(pointer: coarse)').matches,
    width: document.documentElement.clientWidth, height: innerHeight });
  const app = phone ? new MobilePlayer({ initial: shared ?? preset ?? loadDraft(), game }) : new App();
  window.liminal = app; // nyttig for feilsøking i konsollen
  bindFeedback({ endpoint: '../api/feedback.php', page: 'simulator' });
  if(phone)return;
  const draft = shared || preset ? null : loadDraft();
  app.setLevel(shared ?? preset ?? draft ?? presetById('level0').make());
  if (shared) toast(`Shared room: “${shared.name}”. Press “Walk the room” to explore.`, { ms: 5000 });
  if (desktop()) bindStartMenu(app); // programmet: logoen åpner startmenyen
  if (game === 'daily') playDaily(app);
  else if (game === 'spot' || game === 'descent' || game === 'noclip') playRun(app, game);
  else if (game) playGame(app, game === 'lights' ? 'lights' : 'tapes');
  else if (!shared && !preset) desktop() ? startMenu(app) : newRoom(app, { startup: true, draft: !!draft });
}

start();
