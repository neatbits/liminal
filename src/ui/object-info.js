// Gjenstandene i objektvelgeren (object-picker.js): grupper, ikoner og en kort beskrivelse av hva
// gjenstanden kan (bare data og tekst). Gjenstander som ikke står i en gruppe, havner under «Other».
import { OBJECTS } from '../core/objects.js';

export const OBJECT_GROUPS = [
  ['Furniture', ['sofa', 'armchair', 'desk', 'desk2', 'moderndesk', 'table', 'officechair', 'dinerchair', 'dinerset', 'plasticchair', 'deckchair', 'tvbench', 'mallbench', 'cafe']],
  ['School & office', ['schoolcabinet', 'whiteboard', 'wallboard', 'desklamp', 'mug', 'halfwall']],
  ['Hospital', ['hospitalbed', 'waitingchairs', 'medicalscreen', 'medicalcabinet', 'medicaltrolley']],
  ['Electronics', ['tv', 'pc', 'retropcdesktop', 'retropctower', 'retropccompact', 'retropcterminal', 'laptop', 'console', 'gamepad', 'boombox', 'hifi', 'walkman', 'vhsplayer', 'cassette', 'arcade2', 'register', 'soda', 'clock', 'fan']],
  ['Pool & water', ['divingboard', 'flamingo', 'duck']],
  ['Plants', ['pottedpalm', 'pottedplant', 'pottedtree']],
  ['Play', ['playball', 'playground', 'bouncehouse', 'bouncecombo', 'bouncecourse', 'softcube', 'softblock', 'softpillar', 'softbeam', 'softslab', 'softramp', 'softcylinder', 'softsteps']],
  ['Shop & food', ['kiosk', 'shelf', 'wallshelf', 'cosmeticsshelf', 'pharmacyshelf', 'vhsshelf', 'minifridge', 'counter']],
];

export const OBJECT_ICONS = {
  halfwall: '▰',
  table: '🗄️',
  vhsshelf: '📼', vhsplayer: '📼', minifridge: '🧊',
  hifi: '🎶', walkman: '📼', retropcdesktop: '🖥️', retropctower: '🖥️', retropccompact: '🖥️', retropcterminal: '🖥️',
  mallbench: '🪑', pottedpalm: '🌴', pottedplant: '🪴', pottedtree: '🌳',
  armchair: '🛋️', moderndesk: '🗄️', mug: '☕', desklamp: '💡', schoolcabinet: '🗃️', whiteboard: '📋', wallboard: '📋',
  hospitalbed: '🛏️', waitingchairs: '💺', medicalscreen: '🏥', medicalcabinet: '🗄️', medicaltrolley: '🏥',
  playball: '🔴',
  sofa: '🛋️', desk: '🗄️', desk2: '🗄️', officechair: '💺', dinerchair: '🪑', dinerset: '🍽️', plasticchair: '🪑',
  deckchair: '🏖️', tvbench: '📺', cafe: '☕', tv: '📺', pc: '🖥️', laptop: '💻', console: '🎮', gamepad: '🕹️',
  boombox: '📻', cassette: '📼', arcade2: '👾', register: '💵', soda: '🥤', clock: '🕒', fan: '🌀',
  divingboard: '🤸', flamingo: '🦩', duck: '🦆', playground: '🛝', bouncehouse: '🏰',
  bouncecombo: '🏰', bouncecourse: '🏰', softcube: '🟥', softblock: '🟦', softpillar: '🟨', softbeam: '🟩',
  softslab: '🟪', softramp: '🔺', softcylinder: '🟠', softsteps: '🪜', kiosk: '🏪', shelf: '🛒', wallshelf: '🧺', cosmeticsshelf: '🧴', pharmacyshelf: '💊', counter: '🧾',
};

/** Gruppene med alle gjenstandene i katalogen: [[overskrift, [id, …]], …]. */
export function objectGroups() {
  const listed = new Set(OBJECT_GROUPS.flatMap(([, ids]) => ids));
  const rest = Object.keys(OBJECTS).filter((id) => !listed.has(id));
  const groups = OBJECT_GROUPS.map(([label, ids]) => [label, ids.filter((id) => OBJECTS[id])]);
  return rest.length ? [...groups, ['Other', rest]] : groups;
}

const metres = (v) => `${+v.toFixed(v < 0.2 ? 2 : 1)}`;

/** «1.5 × 5.2 m, 1.7 m tall · Walk out on it and jump (Space)» – størrelse og hva den kan. */
export function objectInfo(id) {
  const o = OBJECTS[id];
  if (!o) return '';
  const [w, h, d] = o.size;
  const traits = [
    o.walk && 'Walk out on it and jump (Space)',
    o.floats && 'Floats in the water',
    o.mount === 'ceiling' && 'Hangs from the ceiling',
    o.mount === 'wall' && 'Hangs on the wall behind it',
    o.surface && 'Small things can stand on it',
    o.soft && 'Stacks on other blocks; can be pushed over',
    o.loose && 'Light – you can push it around',
    o.loose?.radius && 'Rolls and bounces; can rest on ball pits',
    o.spin && 'Spins',
  ].filter(Boolean);
  return [`${metres(w)} × ${metres(d)} m, ${metres(h)} m tall`, ...traits].join(' · ');
}
