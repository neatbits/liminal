// Interior batches use the ordinary opaque surface pipeline, one material per type/surface.
import { SHOP_INTERIORS } from '../core/shop-interiors.js';
import { surfaceMaterial } from './materials.js';

export function shopInteriorMaterials(shared, anisotropy) {
  return Object.fromEntries(SHOP_INTERIORS.flatMap((def, style) =>
    ['floor', 'wall', 'ceiling'].map(surface => [
      `shop${surface[0].toUpperCase() + surface.slice(1)}_${style}`,
      () => surfaceMaterial(def[surface], shared, anisotropy),
    ])));
}
