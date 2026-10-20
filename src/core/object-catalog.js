// Katalogen over gjenstander (core/objects.js har reglene for hvor de står). Ren data.
import { BUILT_OBJECTS } from './object-catalog-built.js';

/**
 * Katalogen. size = [bredde, høyde, dybde] i meter slik gjenstanden står i rommet (selve filen
 * sentreres av world/objects.js), scale = skalering av modellfilen (size er allerede skalert),
 * file = models/<file>.glb, build = bygges av enkle former (world/props.js) i stedet for fil.
 * surface = høyden på en flate andre gjenstander kan stå på. screen = området i teksturen
 * [u0, v0, u1, v1] der en skjerm viser sne-støy, glow = hvor sterkt den lyser opp rundt seg
 * (andel av et taklys). soft = myke lekeklosser: kan stables, og i gåmodus har de fysikk (de
 * dyttes, velter og faller ned) i stedet for å stå fast (world/softphysics.js). loose = lette
 * gjenstander som også har fysikk i gåmodus (men ikke stables): { mass (kg), com (tyngdepunktets
 * høyde, m), parts: [[x, y, z, hx, hy, hz], …] } – bokser (midtpunkt og halv størrelse) målt fra
 * midt under gjenstanden, forsiden mot +z. mount = 'ceiling'
 * (henger under taket) eller 'wall' (henger på veggen bak seg, `lift` m over gulvet; uten mount
 * flytter lift gjenstanden opp, eller ned i gulvet med negativ verdi). gap = avstand fra veggen bak (m). spin = rad/s
 * (snurrer, f.eks. en takvifte). turn = dreining av modellfilen (radianer) så forsiden vender mot
 * +z. attribution = kreditering som lisensen krever (CC BY): vises med lenker på About-siden
 * (changes = hva vi har endret, f.eks. byttet grafikk).
 * Modellene er fra Poly Haven (CC0) med mindre annet står.
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
  // Fra Sketchfab (CC BY): krever kreditering, se attribution og About-siden.
  arcade2: {
    label: 'Arcade cabinet',
    file: 'arcade_machine_2',
    scale: 0.27,
    size: [0.678, 1.845, 0.725],
    lift: -0.12, // sokkelen nederst ser rar ut: senkes ned i gulvet
    // Grafikken (sider, skjerm, toppskilt, panel) er byttet ut med egen (scripts/arcade-art.mjs).
    credit: '“Arcade Machine” by Bruno Macena (CC BY 4.0), with new artwork',
    attribution: {
      title: 'Arcade Machine',
      changes: 'artwork replaced with our own',
      source: 'https://sketchfab.com/3d-models/arcade-machine-e9f530f79c674880ad48ff23b5cf5ed1',
      author: 'Bruno Macena',
      authorUrl: 'https://sketchfab.com/Macena',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  register: {
    label: 'Cash register',
    file: 'cash_register',
    scale: 0.05,
    size: [0.423, 0.257, 0.362],
    credit: '“Cash Register” by BumBácBonifác (CC BY 4.0)',
    attribution: {
      title: 'Cash Register',
      source: 'https://sketchfab.com/3d-models/cash-register-1e04d7a73a004e2380e2ee715ce7bd06',
      author: 'BumBácBonifác',
      authorUrl: 'https://sketchfab.com/ondraman43',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  dinerchair: {
    label: 'Diner chair',
    file: 'diner_chair',
    scale: 0.00094,
    size: [0.451, 0.88, 0.524],
    credit: '“Diner Chair” by pleatham (CC BY 4.0)',
    attribution: {
      title: 'Diner Chair',
      source: 'https://sketchfab.com/3d-models/diner-chair-b10ee58a01b649d381598d899850176c',
      author: 'pleatham',
      authorUrl: 'https://sketchfab.com/pleatham',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  dinerset: {
    label: 'Diner table set',
    file: 'diner_table_chair_set',
    scale: 1,
    size: [0.889, 0.827, 1.419],
    credit: '“Retro Diner Table Set” by deleted_cube (CC BY 4.0)',
    attribution: {
      title: 'Retro Diner Table Set',
      source: 'https://sketchfab.com/3d-models/retro-diner-table-set-307918ddc85645da9805b105584ee77b',
      author: 'deleted_cube',
      authorUrl: 'https://sketchfab.com/deleted_cube',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  officechair: {
    label: 'Office chair',
    file: 'office_chair',
    scale: 1,
    size: [0.678, 1.062, 0.722],
    credit: '“Office chair” by AK STUDIO (CC BY 4.0)',
    attribution: {
      title: 'Office chair',
      source: 'https://sketchfab.com/3d-models/office-chair-af2f07d06f6349158c1d24d87f5ceb95',
      author: 'AK STUDIO',
      authorUrl: 'https://sketchfab.com/inven2000',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  desk2: {
    label: 'Office desk (wood)',
    file: 'office_desk_2',
    scale: 4.3,
    size: [1.402, 0.8, 0.602],
    surface: 0.8,
    credit: '“Office desk” by ms_Butor (CC BY 4.0)',
    attribution: {
      title: 'Office desk',
      source: 'https://sketchfab.com/3d-models/office-desk-bf2f5c812068489c92188cde9932ef0d',
      author: 'ms_Butor',
      authorUrl: 'https://sketchfab.com/butortervezo',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  pc: {
    label: 'Retro PC',
    file: 'retro_pc_with_screen',
    scale: 0.15, // bordplaten og matta modellen kom med er fjernet (model.json)
    size: [0.783, 0.409, 0.662],
    credit: '“PC” by PixelAudaz (CC BY 4.0)',
    attribution: {
      title: 'PC',
      source: 'https://sketchfab.com/3d-models/pc-14a47b56707c4404bb5c9981c4b04531',
      author: 'PixelAudaz',
      authorUrl: 'https://sketchfab.com/laeljd',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  soda: {
    label: 'Soda machine',
    file: 'soda_machine',
    scale: 0.0225,
    size: [1.012, 1.8, 0.9],
    credit: '“Soda Machine” by charlesmconard (CC BY 4.0)',
    attribution: {
      title: 'Soda Machine',
      source: 'https://sketchfab.com/3d-models/soda-machine-ab98557c5e3e495e8268754413cf29b5',
      author: 'charlesmconard',
      authorUrl: 'https://sketchfab.com/charlesmconard',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  flamingo: {
    label: 'Flamingo float',
    file: 'fkamingo_float',
    scale: 1.25,
    size: [1.163, 0.889, 1.164],
    floats: true,
    credit: '“Flamingo Pool Float 3D Model” by Mohammad Rajabloo (CC BY 4.0)',
    attribution: {
      title: 'Flamingo Pool Float 3D Model',
      source: 'https://sketchfab.com/3d-models/flamingo-pool-float-3d-model-d1c4beb004c6415d8b04de9cf7a74163',
      author: 'Mohammad Rajabloo',
      authorUrl: 'https://sketchfab.com/MohammadRajabloo',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  plasticchair: {
    label: 'Plastic chair',
    file: 'simple_plastic_chair',
    scale: 0.75,
    size: [0.609, 0.803, 0.604],
    // Lett: dyttes, velter og kan havne i bassenget. Bein, sete, rygg og armlener.
    loose: {
      mass: 2.5,
      com: 0.42,
      parts: [
        [-0.26, 0.2, -0.22, 0.025, 0.2, 0.025],
        [0.26, 0.2, -0.22, 0.025, 0.2, 0.025],
        [-0.26, 0.2, 0.24, 0.025, 0.2, 0.025],
        [0.26, 0.2, 0.24, 0.025, 0.2, 0.025],
        [0, 0.42, 0.04, 0.28, 0.025, 0.21],
        [0, 0.62, -0.24, 0.27, 0.18, 0.03],
        [-0.29, 0.6, 0.02, 0.02, 0.02, 0.2],
        [0.29, 0.6, 0.02, 0.02, 0.02, 0.2],
      ],
    },
    credit: '“Simple Plastic Chair” by Artem P (CC BY 4.0)',
    attribution: {
      title: 'Simple Plastic Chair',
      source: 'https://sketchfab.com/3d-models/simple-plastic-chair-3f63a5ab46df4f78a5df646001a5fced',
      author: 'Artem P',
      authorUrl: 'https://sketchfab.com/temp0.crazy',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  tvbench: {
    label: 'TV bench',
    file: 'tv_bench',
    scale: 0.0254, // modellen er i tommer
    size: [1.8, 0.6, 0.42],
    surface: 0.6, // TV-en står oppå
    gap: 0.28, // trukket ut fra veggen: det store TV-et (0,7 m dypt) står med forkanten i flukt og baksiden mot veggen
    credit: '“Brunn Design KAALM Lowboard Sand” by Brunn Design (CC BY 4.0)',
    attribution: {
      title: 'Brunn Design KAALM Lowboard Sand',
      source: 'https://sketchfab.com/3d-models/brunn-design-kaalm-lowboard-sand-b4c4b0b7ad85457a84e5ea6f947cdc19',
      author: 'Brunn Design',
      authorUrl: 'https://sketchfab.com/brunndesign',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  deckchair: {
    label: 'Deck chair',
    file: 'deck_chair',
    scale: 1.56, // modellen er for liten: 0,6 m bred
    turn: -Math.PI / 2, // forsiden mot +z
    size: [0.601, 0.838, 0.948],
    credit: '“deck chair” by MaX3Dd (CC BY 4.0)',
    attribution: {
      title: 'deck chair',
      source: 'https://sketchfab.com/3d-models/deck-chair-38de6171cbeb41c5bdc49c07df76ede9',
      author: 'MaX3Dd',
      authorUrl: 'https://sketchfab.com/MaX3Dd',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  plasticpalm: {
    label: 'Plastic palm',
    file: 'plastic_palm',
    scale: 0.67, // 2,4 m høy (modellen er 3,6 m)
    size: [1.651, 2.407, 1.677],
    credit: '“Palm Tree Fiberglass” by Bensonnix (CC BY 4.0)',
    attribution: {
      title: 'Palm Tree Fiberglass',
      source: 'https://sketchfab.com/3d-models/palm-tree-fiberglass-9695d4db80554d20b2751839582cf8a9',
      author: 'Bensonnix',
      authorUrl: 'https://sketchfab.com/Bensonnix',
      license: 'CC BY 4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  duck: { label: 'Rubber duck', file: 'rubber_duck', size: [0.214, 0.286, 0.3], floats: true, credit: 'Rubber Duck Toy – Poly Haven (CC0)' },
  ...BUILT_OBJECTS, // bygget av enkle former (object-catalog-built.js)
};

export const OBJECT_IDS = Object.keys(OBJECTS);
