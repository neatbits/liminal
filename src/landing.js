// Forsiden: kort for hvert eksempel med et ekte planbilde av rommet (generert her, uten
// three.js), og plassen til reklamebanneret.
import './styles/landing.css';
import '@fontsource/vt323/latin-400.css'; // VHS-fonten pakkes med (OFL), ingen henting fra Google
import './styles/landing-sections.css';
import './styles/landing-hall.css';
import { PRESETS } from './gen/index.js';
import { planImage } from './editor/plan-image.js';
import { bindFeedback } from './ui/feedback.js';

const THUMB = 4; // piksler per rute i planbildet

function thumbnail(level) {
  const plan = planImage(level);
  const canvas = document.createElement('canvas');
  canvas.width = level.w * THUMB;
  canvas.height = level.h * THUMB;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(plan, 0, 0, canvas.width, canvas.height);
  // Lysene som små prikker, som i skissen.
  ctx.fillStyle = 'rgba(255, 236, 150, 0.9)';
  for (let i = 0; i < level.lights.length; i++) {
    if (!level.lights[i]) continue;
    ctx.fillRect((i % level.w) * THUMB + 1, Math.floor(i / level.w) * THUMB + 1, THUMB - 2, THUMB - 2);
  }
  return canvas;
}

function card(preset) {
  const a = document.createElement('a');
  a.className = 'l-card';
  a.href = `app/#example=${preset.id}`;
  a.innerHTML = `<div class="l-thumb"></div><div class="l-card-body"><h3></h3><p></p><span class="l-card-go">Walk it →</span></div>`;
  a.querySelector('h3').textContent = preset.name;
  a.querySelector('p').textContent = preset.hint;
  return a;
}

function fillCards() {
  const root = document.getElementById('example-cards');
  for (const preset of PRESETS) {
    const el = card(preset);
    root.append(el);
    // Rommene lages litt etter hverandre så siden er klar til å vises med en gang.
    setTimeout(() => {
      const level = preset.make({ seed: 7, layout: 'gallery' });
      const thumb = el.querySelector('.l-thumb');
      thumb.append(thumbnail(level));
    }, 0);
  }
}

function adSlot() {
  const slot = document.getElementById('ad-slot');
  if (window.liminalDesktop) return slot.remove(); // ingen reklame i programmet (desktop/preload.cjs)
  if (slot.children.length) return;
  if (import.meta.env.DEV) slot.innerHTML = '<span>Ad space (728 × 90) – paste the ad code into #ad-slot in index.html</span>';
  else slot.hidden = true;
}

fillCards();
adSlot();
bindFeedback({ endpoint: 'api/feedback.php', page: 'home' });
