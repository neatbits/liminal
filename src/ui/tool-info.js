// Fargeprøver, hjelpetekster og felt for verktøyene i sidepanelet (bare data).
import { HEIGHT_MIN, HEIGHT_MAX, DEPTH_MIN, DEPTH_MAX, FLOOR_MAX, DECK_MIN, DECK_MAX } from '../core/level.js';
import { DOOR } from '../core/doors.js';

export const SWATCH = {
  wall: '#5a5d62',
  water: '#8ccbe0',
  pillar: 'radial-gradient(circle, #45474b 0 38%, #efe4b8 40%)',
  door: 'linear-gradient(#efe4b8 0 38%, #c8893a 38% 62%, #efe4b8 62%)',
  light: 'radial-gradient(circle, #ffd75e 0 40%, #fff6d6 42%)',
  flicker: 'radial-gradient(circle, #ff9f3a 0 40%, #fff1dc 42%)',
  broken: 'radial-gradient(circle, #9b9a95 0 40%, #f1f0ec 42%)',
  spawn: 'radial-gradient(circle, #1f7a72 0 40%, #e2eeec 42%)',
  ceiling: 'linear-gradient(#5c46a0 0 22%, #beaeee 22% 100%)',
  depth: 'linear-gradient(#8ccbe0, #22587c)',
  leaf: 'linear-gradient(90deg, #5a5d62 0 22%, #f1eee7 22% 64%, #c9a45a 64% 72%, #f1eee7 72% 78%, #5a5d62 78%)',
  raise: 'linear-gradient(#efe4b8 0 40%, #7a5a30 40% 50%, #c8a26e 50%)',
  stairs: 'repeating-linear-gradient(90deg, #efe4b8 0 3px, #7a5a30 3px 4px)',
  escalator: 'repeating-linear-gradient(135deg, #44464b 0 4px, #d7b74f 4px 5px)',
  stairwell: 'repeating-linear-gradient(90deg, #e6def5 0 3px, #6b4fa0 3px 4px)',
  tiles: 'linear-gradient(90deg, transparent 47%, #8a8c8c 47% 53%, transparent 53%), linear-gradient(transparent 44%, #8a8c8c 44% 56%, transparent 56%), #e6e6e1',
  slide: 'radial-gradient(circle at 0 0, transparent 52%, #4a9dbb 53% 78%, transparent 79%), #cdeef7',
  window: 'linear-gradient(90deg, #5a5d62 0 20%, #eef4f7 20% 48%, #5a5d62 48% 52%, #eef4f7 52% 80%, #5a5d62 80%)',
  object: 'linear-gradient(#efe4b8 0 30%, #3a3440 30% 80%, #f2c14e 80% 88%, #efe4b8 88%)',
  corner: 'linear-gradient(135deg, #5a5d62 0 42%, #efe4b8 42%)',
  deck: 'repeating-linear-gradient(135deg, #2f6f8f 0 2px, transparent 2px 6px), linear-gradient(#efe4b8 0 55%, #8c8f94 55% 70%, #efe4b8 70%)',
  led: 'linear-gradient(90deg, #ff4d9e 0 34%, #00e5d4 34% 67%, #aa00ff 67%)',
  panel: 'linear-gradient(90deg, #e4eef8 0 33%, #ffe8a8 33% 67%, #c8a838 67%)',
};

/** Verktøyene i sidepanelet, gruppert: [overskrift, [verktøy-id, …]]. */
export const TOOL_GROUPS = [
  ['Build', ['floor', 'wall', 'corner', 'water', 'pillar', 'window']],
  ['Heights', ['ceiling', 'depth', 'raise', 'stairs', 'stairwell', 'escalator', 'deck', 'slide']],
  ['Lights', ['light', 'flicker', 'broken', 'led', 'panel']],
  ['Details', ['door', 'leaf', 'tiles', 'object', 'spawn']],
];

export const HINT = 'Right-click erases. Rectangle and fill with a light tool place lights in an even pattern.';

export const HINTS = {
  pillar: 'Poolrooms pillars are round; other themes use square columns. Choose the diameter, then place columns on open cells. Large columns need clear space around them. Right-click erases.',
  door: 'Click a wall cell between two rooms, or a 1-cell gap in a wall (green outline = a door fits). A wall with nothing behind gives a door to nowhere. Click a door again to flip it; right-click removes it but keeps the opening. While walking, press E to open and close doors.',
  stairs:
    'Drag from the bottom to the top. The stairs climb to a raised floor or a deck at the top end – or 0.6 m per cell up into a stairwell, as stairs to nowhere. Brush size sets the width; right-drag removes stairs.',
  stairwell:
    'Stairs to the floor above: drag from the bottom to the top. You come out on the cell past the top (marked ↑), which becomes floor upstairs – the run itself becomes a stairwell wall there. Brush size sets the width.',
  escalator:
    'Drag from the lower landing to the upper landing, beside a raised floor or deck. Choose Up or Down for the travel direction. Brush size sets the width; right-drag removes the run. Moving steps carry you while walking.',
  window:
    "Paint along a wall that faces a room to put in windows – daylight comes in, and the sun throws bright patches on the floor. Choose the time of day under Light & atmosphere. Right-click removes windows.",
  object:
    'Click a floor cell to place the object – it turns its back to a wall next to it. Click it again to turn it a quarter turn; right-click removes it.',
  corner:
    'Click near a corner where two walls meet, or where a wall sticks out into a room: Angled cuts it at 45°, Rounded gives a curve. Generated rooms sometimes get them too. Right-click removes it.',
  led:
    'Paint colored LED strips on wall cells next to a room. Choose a color, then click or drag along walls; Fill inside a room lines all its walls. Right-click removes.',
  panel:
    'Paint glowing ceiling panels on open cells. White gives flat fluorescent light; Warm gives a softer hotel glow; Dim gives aged, yellowed panels. Fill covers a whole room. Right-click removes.',
  slide:
    'Drag from a raised floor (at least 1 m – use Raise and Stairs) down to the water, turning as you like. Drag back to undo part of the path. Walk into the top to slide. On an upper floor you can also drag from the floor down to a pool on the floor below (shown in blue). Right-click a slide to remove it.',
};

export const SLIDE_COLOR_CHOICES = [
  ['blue', 'Blue'],
  ['red', 'Red'],
  ['green', 'Green'],
  ['white', 'White'],
];

export const ESCALATOR_DIRECTIONS = [[false, 'Up'], [true, 'Down']];

export const PANEL_TYPE_CHOICES = [
  [1, 'White'],
  [2, 'Warm'],
  [3, 'Dim'],
];

export const CORNER_KINDS = [
  [1, 'Angled'],
  [2, 'Rounded'],
];

export const SLIDE_SHAPES = [
  [false, 'Open'],
  [true, 'Tube'],
];

/** Feltet for høyden et soneverktøy maler. */
export const ZONE = {
  ceiling: {
    label: 'Paint height',
    min: HEIGHT_MIN,
    max: HEIGHT_MAX,
    hint: "Paints the ceiling height of open cells. Right-click resets to the room's ceiling height. Fill changes a whole zone.",
  },
  depth: {
    label: 'Paint depth',
    min: DEPTH_MIN,
    max: DEPTH_MAX,
    hint: "Paints the depth of water cells. Right-click resets to the room's water depth. In deep water you swim.",
  },
  floor: {
    label: 'Floor height',
    min: 0,
    max: FLOOR_MAX,
    hint: 'Raises the floor of open cells – platforms and landings. You can step up 0.45 m; higher needs stairs. Right-click lowers the floor to 0.',
  },
  deck: {
    label: 'Deck height',
    min: DECK_MIN,
    max: DECK_MAX,
    hint: 'Adds an upper floor (a mezzanine) above floor and pillar cells: you walk underneath and on top. Leave cells without a deck for an open atrium – deck edges get railings. Use Stairs up to the deck. Right-click removes the deck.',
  },
  finish: {
    label: null,
    hint: 'Choose a finish, then paint the floor and matching walls. Rectangle covers an area; Fill covers a connected finish zone. Arcade adds patterned carpet. Right-click restores the theme default.',
  },
};

export const DOOR_STATES = [
  [DOOR.CLOSED, 'Closed'],
  [DOOR.AJAR, 'Ajar'],
  [DOOR.OPEN, 'Open'],
];
