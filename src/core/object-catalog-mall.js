// Imported mall furniture and greenery; dimensions measured from the optimized GLBs.
import { ccBy } from './object-credit.js';

export const MALL_OBJECTS = {
  cosmeticsshelf: {
    label: 'Cosmetics display', file: 'store_empty_cosmetics_shelf', scale: 0.2, turn: Math.PI,
    size: [3.128, 2.272, 0.391],
    ...ccBy('Metaretail: Mueble dermocosmética farmacia', 'vmmaniac', 'https://sketchfab.com/3d-models/metaretail-mueble-dermocosmetica-farmacia-5fd862db38fb447499ece3931954a40f', 'https://sketchfab.com/vmmaniac', 'scaled, optimized and display artwork replaced with original designs'),
  },
  pharmacyshelf: {
    label: 'Pharmacy display', file: 'store_farmacy_shelf', scale: 3.6, turn: Math.PI,
    size: [0.857, 2.208, 0.356],
    ...ccBy('Metaretail: Farmacia -  VM display', 'vmmaniac', 'https://sketchfab.com/3d-models/metaretail-farmacia-vm-display-f474ebb930354ebab3bfe5e6a3e25e67', 'https://sketchfab.com/vmmaniac', 'scaled, optimized; brand geometry removed and packaging/sign replaced with original designs'),
  },
  mallbench: {
    label: 'Mall bench', file: 'mall_bench', scale: 0.72,
    size: [2.161, 0.834, 0.665],
    ...ccBy('Bench', 'YouniqueĪdeaStudio', 'https://sketchfab.com/3d-models/bench-bf1d1033eae0450c828ac9b30a53e96d', 'https://sketchfab.com/sinnervoncrawsz'),
  },
  pottedpalm: {
    label: 'Potted palm', file: 'potted_palm_tree', scale: 0.036,
    size: [2.428, 2.602, 2.369],
    ...ccBy('Potted Palm Tree', 'zaaranakhwa', 'https://sketchfab.com/3d-models/potted-palm-tree-dadb3ed13e894bbaaff3735d0fc425a0', 'https://sketchfab.com/zaaranakhwa'),
  },
  pottedplant: {
    label: 'Potted plant', file: 'potted_plant_02', scale: 0.065,
    size: [1.233, 0.872, 1.293],
    ...ccBy('Plant', 'Tansi Zhang', 'https://sketchfab.com/3d-models/plant-f2a62c8d4352430cab9892e8b11de423', 'https://sketchfab.com/gameshiba'),
  },
  pottedtree: {
    label: 'Potted tree', file: 'potted_tree_01', scale: 0.34,
    size: [1.27, 2.693, 1.293],
    ...ccBy('Potted Tree', 'dylanheyes', 'https://sketchfab.com/3d-models/potted-tree-dd6c9d90421b4a99acdfebbddd4ccf75', 'https://sketchfab.com/dylanheyes'),
  },
};
