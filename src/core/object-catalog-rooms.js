// Innredning til planløsningene (gen/furnish-rooms.js, gen/furnish-institutions.js): sengen, toalettet og vasken er
// modeller, resten bygges av enkle former (world/props-rooms.js, world/props-institution.js). Del av katalogen i object-catalog.js. Ren data.
import { ccBy } from './object-credit.js';
import { HALF_WALL, GLASS_WALL } from './half-walls.js';

export const ROOM_OBJECTS = {
  double_bed: {
    label: 'Double bed',
    file: 'double_bed',
    scale: 0.66, // kildefilen er 3 m lang
    size: [1.407, 1.141, 1.985],
    ...ccBy('Victorian Bed', 'BATRIC_18', 'https://sketchfab.com/3d-models/victorian-bed-c56b0776992041648ba5c1615f6e1fed', 'https://sketchfab.com/BATRIC_18'),
  },
  nightstand: { label: 'Nightstand', build: 'nightstand', size: [0.46, 0.55, 0.42], surface: 0.55 },
  toilet: {
    label: 'Toilet',
    file: 'toilet',
    scale: 0.0927, // kildefilen er 8,6 enheter høy
    size: [0.468, 0.8, 0.801],
    ...ccBy('toilet', 'motaman', 'https://sketchfab.com/3d-models/toilet-c98c73d7b70e4635b8cc01705915aea6', 'https://sketchfab.com/motaman'),
  },
  // Vasken henger på veggen med kanten 85 cm over gulvet; rørene går inn i veggen. Speilet over er egen gjenstand.
  sink: {
    label: 'Sink',
    file: 'simple_sink',
    scale: 0.01, // centimeter
    turn: -Math.PI / 2, // rørene (−x) inn i veggen
    size: [0.516, 0.514, 0.51],
    mount: 'wall',
    lift: 0.51,
    ...ccBy('Simple Sink', 'Andrew.Mischenko', 'https://sketchfab.com/3d-models/simple-sink-73bda35b6e7a499a80427fc1b049b192', 'https://sketchfab.com/Andrew.Mischenko'),
  },
  mirror: { label: 'Mirror', build: 'mirror', size: [0.56, 0.76, 0.04], mount: 'wall', lift: 1.2 },
  // Ekspeditøren bak kassen i Noclip (gen/noclip.js): animert (world/animated-objects.js).
  cashier: {
    label: 'Cashier',
    file: 'man_behind_desk',
    animate: true,
    size: [0.64, 1.802, 0.428],
    ...ccBy('ANIMATED OLDER MAN WITH BEARD WEARING SHORT', '360SMS', 'https://sketchfab.com/3d-models/animated-older-man-with-beard-wearing-short-92a3eff136824eb2ab6882dbf2215151', 'https://sketchfab.com/360SMS',
      'optimized for real-time rendering'),
  },
  // Hallene i Level 0 (gen/furnish-halls.js): et mørkt vindu inn til nabohallen og ventiler i gulvet (så lave at man går over dem).
  darkwindow: { label: 'Dark window', build: 'darkwindow', size: [1.6, 1.05, 0.08], mount: 'wall', lift: 1.15 },
  floorvent: { label: 'Floor vent', build: 'floorvent', size: [0.3, 0.012, 0.14] },
  // Firkanten på lagerveggen i Noclip (gen/noclip.js): tegnet som en dør, med skrå streker.
  noclipmark: { label: 'Wall marking', build: 'noclipmark', size: [1, 2.1, 0.04], mount: 'wall', lift: 0.01 },
  washer: {
    label: 'Washing machine',
    file: 'washing_machine_2',
    scale: 0.0361, // kildefilen er 23,5 enheter høy (uten slangene bak, se model.json)
    turn: -Math.PI / 2, // døra (+x) mot +z
    size: [0.587, 0.85, 0.551],
    surface: 0.85,
    ...ccBy('Washing Machine (new)', 'nikita.bulgakov', 'https://sketchfab.com/3d-models/washing-machine-new-82c91049303f4664a56cc0eaffa8d662', 'https://sketchfab.com/bulgakov'),
  },
  copier: { label: 'Copier', build: 'copier', size: [0.8, 1.16, 0.68] },
  archiveshelf: { label: 'Archive shelf', build: 'archiveshelf', size: [1.9, 2.05, 0.5] },
  elevator: { label: 'Elevator doors', build: 'elevator', size: [1.7, 2.22, 0.1], mount: 'wall', glow: 0.04 },
  bookshelf: { label: 'Bookshelf', build: 'bookshelf', size: [1.8, 2.1, 0.36] },
  hoop: { label: 'Basketball hoop', build: 'hoop', size: [1.8, 1.2, 0.76], mount: 'wall', lift: 2.6 },
  ortable: { label: 'Operating table', build: 'ortable', size: [0.7, 1, 2], surface: 1 },
  surgicallamp: { label: 'Surgical lamp', build: 'surgicallamp', size: [0.84, 0.65, 0.84], mount: 'ceiling' },
  morguewall: { label: 'Morgue drawers', build: 'morguewall', size: [1.9, 2.1, 0.76] },
  gurney: { label: 'Covered gurney', build: 'gurney', size: [0.66, 1.2, 2] },
  coveredcar: { label: 'Covered car', build: 'coveredcar', size: [1.84, 1.42, 4.3] },
  boiler: { label: 'Boiler', build: 'boiler', size: [1.12, 2.35, 1.12] },
  bunkbed: {
    label: 'Bunk bed',
    file: 'bunk_bed',
    scale: 0.00947, // kildefilen er 211 enheter lang
    turn: Math.PI / 2, // lengden ut fra veggen
    size: [0.957, 1.526, 1.999],
    ...ccBy('Bunk Bed', 'Aarón Galindo Chavero', 'https://sketchfab.com/3d-models/bunk-bed-106e4d25ea6e4e0ab0d1e64bf1dcf603', 'https://sketchfab.com/nellhilda'),
  },
  glasswall: { label: 'Glass wall', build: 'glasswall', structural: true, size: [HALF_WALL.width, GLASS_WALL.height, GLASS_WALL.depth] },
};
