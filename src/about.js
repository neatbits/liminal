// About-siden: stilene fra forsiden, og krediteringen av modellene rett fra katalogen. Modeller
// med CC BY-lisens krediteres med tittel, skaper, kilde og lisens (lenket), slik lisensen krever.
import './styles/landing.css';
import './styles/landing-sections.css';
import './styles/changelog.css';
import { OBJECTS } from './core/objects.js';
import { GHOST } from './core/ghost.js';
import { bindFeedback } from './ui/feedback.js';

function link(text, href) {
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  a.textContent = text;
  return a;
}

const list = document.getElementById('model-credits');
for (const o of [...Object.values(OBJECTS), GHOST].filter((def) => def.credit)) {
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
bindFeedback({ endpoint: '../api/feedback.php', page: 'about' });
