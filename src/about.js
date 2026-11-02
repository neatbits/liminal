// About-siden: stilene fra forsiden, og krediteringen av modellene rett fra katalogen. Modeller
// med CC BY-lisens krediteres med tittel, skaper, kilde og lisens (lenket), slik lisensen krever.
import './styles/landing.css';
import '@fontsource/vt323/latin-400.css'; // VHS-fonten pakkes med (OFL), ingen henting fra Google
import './styles/landing-sections.css';
import './styles/changelog.css';
import { OBJECTS } from './core/objects.js';
import { bindFeedback } from './ui/feedback.js';

function link(text, href) {
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  a.textContent = text;
  return a;
}

const list = document.getElementById('model-credits');
for (const o of Object.values(OBJECTS).filter((def) => def.credit)) {
  const li = document.createElement('li');
  const a = o.attribution;
  if (a) {
    // «This work is based on "Title" (kilde) by Author licensed under CC BY 4.0»
    li.append(`${o.label}: based on “`, link(a.title, a.source), '” by ', link(a.author, a.authorUrl), ', licensed under ', link(a.license, a.licenseUrl), a.changes ? ` (${a.changes})` : '', '.');
  } else {
    li.textContent = `${o.label}: ${o.credit}`;
  }
  list.append(li);
}
// I programmet (desktop/preload.cjs): ingen nettstedsmeny eller hjemmeside – én knapp tilbake til
// simulatoren, og tekstene for programmet (data-app) i stedet for nettleseren (data-web).
if (window.liminalDesktop) {
  document.body.classList.add('in-app');
  const back = Object.assign(document.createElement('a'), { className: 'l-btn l-btn-small', href: '../app/', textContent: '← Back to Liminal' });
  document.querySelector('.l-nav a[href="../"]')?.remove();
  document.querySelector('.l-nav a[href="../app/"]')?.replaceWith(back);
  document.querySelector('.l-top .brand').href = '../app/';
}
bindFeedback({ endpoint: '../api/feedback.php', page: 'about' });
