// About-siden: stilene fra forsiden, og krediteringen av modellene rett fra katalogen.
import './styles/landing.css';
import './styles/landing-sections.css';
import { OBJECTS } from './core/objects.js';

const list = document.getElementById('model-credits');
for (const o of Object.values(OBJECTS).filter((def) => def.credit)) {
  const li = document.createElement('li');
  li.textContent = `${o.label}: ${o.credit}`;
  list.append(li);
}
