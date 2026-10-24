// Saved finish values. 0/1 retain their original theme/tiles meaning.
export const FINISH = Object.freeze({ THEME: 0, TILES: 1, RETAIL: 2, ELECTRONICS: 3, ARCADE: 4, CAFE: 5 });
export const FINISHES = [
  { value: FINISH.THEME, label: 'Theme default' },
  { value: FINISH.TILES, label: 'Tiles', plan: '#cdd2d6' },
  { value: FINISH.RETAIL, label: 'Department store', style: 0, plan: '#cbb6a2' },
  { value: FINISH.ELECTRONICS, label: 'Electronics', style: 1, plan: '#74899a' },
  { value: FINISH.ARCADE, label: 'Arcade', style: 2, plan: '#694294' },
  { value: FINISH.CAFE, label: 'Café', style: 3, plan: '#bd937c' },
];
export const clampFinish = value => FINISHES[Number(value)]?.value ?? FINISH.THEME;
export const isShopFinish = value => value >= FINISH.TILES && value <= FINISH.CAFE;
