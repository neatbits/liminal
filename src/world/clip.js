// Klipping av en hel verden mot plan (Noclip, view3d/zones.js): hvert område tegnes bare på sin side av skjøten, så to
// områder som ligger oppå hverandre i gangen ved skjøten, ikke tegnes i hverandre. three.js' egne materialer klipper av
// seg selv; våre ShaderMaterial-er får de innebygde klippebitene satt inn (de har alle mvPosition i vertex-shaderen).
// Gjenstandene lastes etter hvert, så de klippes når de er klare.

function clippable(material, planes) {
  if (!material || material.userData.clipped) return;
  material.userData.clipped = true;
  material.clippingPlanes = planes;
  if (material.isShaderMaterial) {
    if (!/vec4 mvPosition/.test(material.vertexShader)) return; // uten mvPosition: tegnes uklippet
    material.clipping = true;
    material.vertexShader = `#include <clipping_planes_pars_vertex>\n${material.vertexShader.replace(/(gl_Position\s*=[^;]*;)/, '$1\n  #include <clipping_planes_vertex>\n')}`; // linjeskift etter: noen shadere fortsetter på samme linje
    material.fragmentShader = material.fragmentShader.replace(/void main\(\)\s*\{/, (m) => `#include <clipping_planes_pars_fragment>\n${m}\n  #include <clipping_planes_fragment>\n`);
  }
  material.needsUpdate = true;
}

/** Klipper alle materialene i verdenen mot planes (et fast array: endre konstantene, ikke antallet). */
export function clipWorld(world, planes) {
  const each = () => world.group.traverse((o) => (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => clippable(m, planes)));
  each();
  world.objects?.ready?.then(each);
}
