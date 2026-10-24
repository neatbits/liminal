import { ccBy } from './object-credit.js';

const pcCredit = () => ccBy('80s / 90s Computer Pack - Cartoon Stylized', 'TheAlex',
  'https://sketchfab.com/3d-models/80s-90s-computer-pack-cartoon-stylized-6b45ad8c7d1d44f0987acb54c46975cd', 'https://sketchfab.com/TheAlex',
  'split into four computers, scaled and optimized; screen artwork and labels replaced');

export const RETRO_PC_IDS = ['retropcdesktop', 'retropctower', 'retropccompact', 'retropcterminal'];

export const ELECTRONIC_OBJECTS = {
  vhsshelf: { label: 'VHS rental shelf', file: 'store_vhs_shelf', scale: .8, size: [3.244, 1.523, .76],
    ...ccBy('VHS shelf', 'm3org', 'https://sketchfab.com/3d-models/vhs-shelf-4ac998896ed044deb1038d89f7841012', 'https://sketchfab.com/m3org',
      'scaled and optimized; filled with 210 cases using twelve original fictional film covers') },
  vhsplayer: { label: 'VHS player', file: 'vhs_player', scale: 1.15, shift: .18, size: [.428, .094, .303],
    ...ccBy('Vintage VHS Player 1', 'Tejay21', 'https://sketchfab.com/3d-models/vintage-vhs-player-1-19e9ec41b4234e46a3503e8376f3e7a5', 'https://sketchfab.com/tejay21') },
  minifridge: { label: 'Retro mini fridge', file: '80s_avanti_mini_fridge', scale: .11, size: [.493, .726, .472],
    ...ccBy('80s Avanti Mini Fridge', 'AquaEquinox', 'https://sketchfab.com/3d-models/80s-avanti-mini-fridge-db766cb0a5fa4ae99f81dd3a164689e7', 'https://sketchfab.com/ohno9119', 'scaled and optimized; badge replaced with original label') },
  hifi: { label: 'Retro hi-fi system', file: 'retro_hifi_system', size: [1.411, .912, .592],
    ...ccBy('retro hi-fi', 'local.yany', 'https://sketchfab.com/3d-models/retro-hi-fi-46a83c3d6ad04fad9fab0b8fc101ac1b', 'https://sketchfab.com/local.yany',
      'scaled and optimized; album and tape artwork replaced with original designs') },
  walkman: { label: 'Portable cassette player', file: 'retro_walkman', scale: .016, size: [.197, .136, .115],
    ...ccBy('Walkman', 'Tom Seddon', 'https://sketchfab.com/3d-models/walkman-1e8296b489084d6ba76b485d1c2fd37c', 'https://sketchfab.com/bloodmeat08',
      'scaled and optimized; front-panel branding replaced with original labels') },
  retropcdesktop: { label: 'Retro desktop PC', file: 'retro_pc_desktop', scale: .18, turn: -Math.PI / 2,
    fullSupport: true,
    size: [.707, .472, .691], ...pcCredit() },
  retropctower: { label: 'Retro tower PC', file: 'retro_pc_tower', scale: .18, turn: -Math.PI / 2,
    fullSupport: true,
    size: [.751, .372, .69], ...pcCredit() },
  retropccompact: { label: 'Compact retro computer', file: 'retro_pc_compact', scale: .21, turn: -Math.PI / 2,
    fullSupport: true,
    size: [.674, .377, .773], ...pcCredit() },
  retropcterminal: { label: 'Retro terminal', file: 'retro_pc_terminal', scale: .21, turn: -Math.PI / 2,
    fullSupport: true,
    size: [.585, .345, .719], ...pcCredit() },
};
