// Fictional games. Adjacent cabinets get different art without changing saved rooms.
export const ARCADE_VARIANTS = [
  { name: 'STAR LANES', motif: 'space', colors: ['#3de0ff', '#ff3d9a', '#ffc14f'], background: '#10102c' },
  { name: 'NEON RALLY', motif: 'road', colors: ['#ff9d32', '#f54871', '#70e9ff'], background: '#201024' },
  { name: 'DEEP SIGNAL', motif: 'ocean', colors: ['#53f4cd', '#3789ff', '#f3db6b'], background: '#052534' },
  { name: 'CIRCUIT RUN', motif: 'maze', colors: ['#b9ff5b', '#40cec1', '#ff944d'], background: '#112319' },
  { name: 'LUNAR HAUL', motif: 'lunar', colors: ['#e6e2ff', '#a88bff', '#ffb451'], background: '#191a35' },
  { name: 'PRISM DROP', motif: 'blocks', colors: ['#ffd94e', '#f75cb7', '#63e7f5'], background: '#25162d' },
  { name: 'MOSS RELAY', motif: 'jungle', colors: ['#92df5b', '#ffd17a', '#d78b45'], background: '#102a22' },
  { name: 'IRON COMET', motif: 'robot', colors: ['#ff6f48', '#9fbbc9', '#ffdc71'], background: '#271921' },
  { name: 'SUNSET SERVE', motif: 'tennis', colors: ['#ff95ae', '#fce9a2', '#67c8d2'], background: '#312339' },
  { name: 'NOVA BUMPER', motif: 'pinball', colors: ['#c38cff', '#69fbeb', '#ffeb76'], background: '#201136' },
];

export function arcadeVariant(o) {
  const v = Number.isFinite(o.v) ? Math.trunc(o.v) : o.x + o.z * 3;
  return ((v % ARCADE_VARIANTS.length) + ARCADE_VARIANTS.length) % ARCADE_VARIANTS.length;
}
