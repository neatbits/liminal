// Fargevarianter av tapet, teppe og fliser for hotell, kontor, Poolrooms og lekerom (core/looks.js).
import { hotelCarpet, hotelWallpaper } from './hotel.js';
import { officeWall, officeCarpet, poolTilesWith, poolTilesBand } from './tiles.js';
import { foamMat, playWall, playStripe } from './playroom.js';
import { schoolPaint, wardFloor, wardMint } from './school.js';
import { garagePaint } from './concrete.js';
import { wallpaperYellow, carpetDamp } from './yellow.js';

// [bakgrunn, mørk, gull, lys gull] og [lys stripe, mørk stripe, strek, prikker, ruter].
const HOTEL = {
  Emerald: [['#17503c', '#0e3528', '#b0a058', '#c9b868'], ['#a9b394', '#b7c0a2', 'rgba(70,95,70,0.5)', 'rgba(60,85,60,0.35)', 'rgba(70,105,75,0.45)']],
  Navy: [['#1b2c52', '#111d38', '#a8914f', '#c2a860'], ['#9fa8b6', '#afb7c4', 'rgba(60,75,105,0.5)', 'rgba(55,70,100,0.35)', 'rgba(60,80,115,0.45)']],
  Ochre: [['#8a5a18', '#633f0f', '#d8b768', '#ecd084'], ['#c6ad6e', '#d2bb7f', 'rgba(140,105,40,0.5)', 'rgba(125,92,35,0.35)', 'rgba(150,110,40,0.45)']],
  Plum: [['#4b1c4a', '#331232', '#b98f5a', '#d2a56a'], ['#ab98a8', '#b9a7b5', 'rgba(95,65,95,0.5)', 'rgba(85,60,85,0.35)', 'rgba(105,70,105,0.45)']],
};
const WALLS = { Blue: '#b6c2cc', Green: '#b9c4b2', Beige: '#d3c6a8', Dark: '#8d9196' };
const CARPETS = { Blue: [58, 78, 118], Green: [66, 92, 78], Brown: [104, 88, 70], Charcoal: [52, 54, 60] };

const POOL = { Seafoam: [[188, 226, 214], '#8fb5aa'], Blush: [[240, 208, 208], '#c4a0a2'], Sand: [[226, 208, 172], '#b29f7c'], Black: [[38, 42, 46], '#6e7a7e'],
  Cyan: [[118, 212, 224], '#5fa9b4'] };
const PINK = [[238, 150, 190], '#c07a9a']; // båndet i «Pink & cyan»
const PLAY = {
  Pastel: [['#f0e6ee', '#f1dcae', '#dce8ee'], ['#efa8a8', '#f4dc9c', '#a8cce8', '#b0dcb4'], ['#e0a0a0', '#9cc0e0', '#ecd690', '#a4d0ac']],
  Faded: [['#c9c2b4', '#b8a878', '#b4b8b4'], ['#94504a', '#a68a44', '#4c6680', '#58765c'], ['#8c4c46', '#486078', '#9c8444', '#54705a']],
  Neon: [['#1c1830', '#2a2048', '#16283a'], ['#ff2e88', '#ffe600', '#00e0ff', '#39ff14'], ['#c0186a', '#00a0c8', '#c8b400', '#28c010']],
};

const SCHOOL = { Blue: '#a9bdd2', Peach: '#e0bfa4', Yellow: '#e2cf8c' };
const WARD = { Blue: ['#a8bfd2', '#bccbd8'], Rose: ['#d2aeb0', '#d8c6c6'], Cream: ['#d8cca4', '#d4cfbc'] };
const GARAGE = { Yellow: [168, 138, 52], Red: [132, 56, 48], Blue: [58, 84, 118] };

const LEVEL0 = { Pale: ['#e0d2a0', '#bdb38c'], Mustard: ['#c49c38', '#a08650'], Dingy: ['#a8955c', '#857a58'] };

export const LOOK_PAINTERS = {
  ...Object.fromEntries(Object.entries(LEVEL0).flatMap(([name, [paper, carpet]]) => [
    [`wallpaperYellow${name}`, (rand) => wallpaperYellow(rand, paper)],
    [`carpetDamp${name}`, (rand) => carpetDamp(rand, carpet)],
  ])),
  ...Object.fromEntries(Object.entries(SCHOOL).map(([name, c]) => [`schoolPaint${name}`, (rand) => schoolPaint(rand, c)])),
  ...Object.fromEntries(Object.entries(WARD).flatMap(([name, [paint, floor]]) => [
    [`wardMint${name}`, (rand) => wardMint(rand, paint)],
    [`wardFloor${name}`, (rand) => wardFloor(rand, floor)],
  ])),
  ...Object.fromEntries(Object.entries(GARAGE).map(([name, c]) => [`garagePaint${name}`, (rand) => garagePaint(rand, c)])),
  ...Object.fromEntries(Object.entries(POOL).map(([name, [base, grout]]) => [`poolTiles${name}`, (rand) => poolTilesWith(rand, base, grout)])),
  poolTilesCyanPink: (rand) => poolTilesBand(rand, ...POOL.Cyan, ...PINK),
  ...Object.fromEntries(Object.entries(PLAY).flatMap(([name, [wall, stripe, mat]]) => [
    [`playWall${name}`, (rand) => playWall(rand, wall)],
    [`playStripe${name}`, (rand) => playStripe(rand, stripe)],
    [`foamMat${name}`, (rand) => foamMat(rand, mat)],
  ])),
  ...Object.fromEntries(Object.entries(HOTEL).flatMap(([name, [carpet, paper]]) => [
    [`hotelCarpet${name}`, (rand) => hotelCarpet(rand, carpet)],
    [`hotelWallpaper${name}`, (rand) => hotelWallpaper(rand, paper)],
  ])),
  ...Object.fromEntries(Object.entries(WALLS).map(([name, base]) => [`officeWall${name}`, (rand) => officeWall(rand, base)])),
  ...Object.fromEntries(Object.entries(CARPETS).map(([name, base]) => [`officeCarpet${name}`, (rand) => officeCarpet(rand, base)])),
};
