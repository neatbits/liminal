// Katalogen over gjenstander (core/objects.js har reglene for hvor de står). Ren data.

/**
 * Katalogen. size = [bredde, høyde, dybde] i meter slik gjenstanden står i rommet (selve filen
 * sentreres av world/objects.js), scale = skalering av modellfilen (size er allerede skalert),
 * file = models/<file>.glb, build = bygges av enkle former (world/props.js) i stedet for fil.
 * surface = høyden på en flate andre gjenstander kan stå på. screen = området i teksturen
 * [u0, v0, u1, v1] der en skjerm viser sne-støy, glow = hvor sterkt den lyser opp rundt seg
 * (andel av et taklys). soft = myke lekeklosser: kan stables, og i gåmodus har de fysikk (de
 * dyttes, velter og faller ned) i stedet for å stå fast (world/softphysics.js). mount = 'ceiling'
 * (henger under taket) eller 'wall' (henger på veggen bak seg, `lift` m over gulvet). spin = rad/s
 * (snurrer, f.eks. en takvifte). turn = dreining av modellfilen (radianer) så forsiden vender mot
 * +z. attribution = kreditering som lisensen krever (CC BY): vises med lenker på About-siden.
 * Modellene er fra Poly Haven (CC0) med mindre annet står.
 * Alle modellene er fra Poly Haven (CC0).
 */
export const OBJECTS = {
  tv: {
    label: 'CRT TV',
    file: 'television_crt',
    size: [0.8, 0.822, 0.7], // modellen × 2: et stort, gammelt TV
    scale: 2,
    screen: [0.691, 0.011, 0.994, 0.235],
    glow: 0.16,
    credit: 'Television 02 – Poly Haven (CC0)',
  },
  boombox: { label: 'Boombox', file: 'classic_boombox', size: [0.724, 0.47, 0.186], credit: 'Boombox – Poly Haven (CC0)' },
  laptop: { label: 'Laptop', file: 'classic_laptop', size: [0.326, 0.272, 0.243], scale: 0.5, credit: 'Classic Laptop – Poly Haven (CC0)' },
  desk: { label: 'Office desk', file: 'office_desk', size: [2, 0.788, 0.947], surface: 0.788, credit: 'Metal Office Desk – Poly Haven (CC0)' },
  fan: { label: 'Ceiling fan', file: 'ceiling_fan', size: [1.463, 0.516, 1.463], mount: 'ceiling', spin: 2.2, credit: 'Ceiling Fan – Poly Haven (CC0)' },
  clock: { label: 'Wall clock', file: 'wall_clock', size: [0.32, 0.32, 0.047], mount: 'wall', lift: 1.95, credit: 'Wall Clock – Poly Haven (CC0)' },
  console: { label: 'Game console', file: 'gaming_console', size: [0.325, 0.1, 0.319], credit: 'Gaming Console – Poly Haven (CC0)' },
  gamepad: { label: 'Game controllers', file: 'game_pad', size: [0.404, 0.019, 0.435], credit: 'Game Pad – Poly Haven (CC0)' },
  cassette: { label: 'Cassette player', file: 'cassette_player', size: [0.129, 0.237, 0.049], credit: 'Cassette Player – Poly Haven (CC0)' },
  sofa: {
    label: 'Sofa',
    file: 'couch',
    turn: Math.PI / 2, // modellen står på langs med ryggen mot +x
    scale: 0.027,
    size: [2.001, 0.862, 0.916],
    credit: '“Old Reliable Couch” by Jace B. (CC BY 4.0)',
    attribution: {
      title: 'Old Reliable Couch',
      source: 'https://sketchfab.com/3d-models/old-reliable-couch-c9a365e5ba9f456db4887dc1e5f4b5d5',
      author: 'Jace B.',
      authorUrl: 'https://sketchfab.com/snomss',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  duck: { label: 'Rubber duck', file: 'rubber_duck', size: [0.214, 0.286, 0.3], floats: true, credit: 'Rubber Duck Toy – Poly Haven (CC0)' },
  // Bygget av enkle former (world/props.js), uten modellfil.
  kiosk: { label: 'Food kiosk', build: 'kiosk', size: [3, 2.6, 1.5], glow: 0.22 },
  cafe: { label: 'Café table', build: 'cafe', size: [1.7, 0.92, 1.7] },
  shelf: { label: 'Shop shelf', build: 'shelf', size: [2.1, 1.62, 0.9] },
  wallshelf: { label: 'Wall shelf', build: 'wallshelf', size: [2, 2, 0.45] },
  counter: { label: 'Shop counter', build: 'counter', size: [1.86, 1.2, 0.72] },
  // Myke lekeklosser i skumgummi (lekerommet), i lyse farger etter variant (v).
  softcube: { label: 'Soft cube', build: 'soft', size: [0.6, 0.6, 0.6], soft: true },
  softblock: { label: 'Soft platform', build: 'soft', size: [1.2, 0.6, 1.2], soft: true },
  softpillar: { label: 'Soft pillar', build: 'soft', size: [0.5, 1.5, 0.5], soft: true },
  softbeam: { label: 'Soft beam', build: 'soft', size: [2.4, 0.45, 0.45], soft: true },
  softslab: { label: 'Soft wall', build: 'soft', size: [1.2, 1.2, 0.4], soft: true },
};

export const OBJECT_IDS = Object.keys(OBJECTS);
