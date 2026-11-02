// Et nytt område i Noclip inn i scenen uten hakk (view3d/zones.js): når gjenstandene er på plass, kompileres skyggeleggerne
// for alt i bakgrunnen, og så legges området inn litt om gangen – teksturene lastes opp én per bilde, så delene
// (REVEAL hjørner per bilde). Alt på én gang ga lange bilder: kompilering, opplasting av geometri og store bilder.

const REVEAL = 30000; // hjørner som legges inn per bilde

/**
 * Kompilerer mot bufferet etterbehandlingen tegner scenen i (view3d/postfx.js): mot skjermen velger three.js andre
 * varianter (tonemapping og fargerom), og da ble de riktige kompilert likevel – midt i et bilde.
 */
function compile(viewer, group) {
  const { renderer, camera, scene, postfx } = viewer;
  const before = renderer.getRenderTarget();
  renderer.setRenderTarget(postfx.composer.readBuffer);
  try {
    return renderer.compileAsync(group, camera, scene);
  } finally {
    renderer.setRenderTarget(before);
  }
}

/**
 * Legger området inn litt om gangen. Hver del tegnes én gang uansett hvor man ser (ingen frustum-utvelgelse), så den er
 * lastet opp før man snur seg. zone.reveal() viser resten med en gang (når man krysser skjøten).
 */
function reveal(viewer, zone) {
  const world = zone.world;
  const hidden = [];
  const textures = new Set(); // også gjenstandenes (store bilder): lastes opp én per bilde først
  world.group.traverse((o) => {
    if (!(o.isMesh || o.isPoints) || !o.visible) return;
    o.visible = false;
    hidden.push(o);
    for (const m of [o.material].flat()) for (const u of Object.values(m?.uniforms ?? {})) if (u?.value?.isTexture) textures.add(u.value);
  });
  viewer.scene.add(world.group);
  const queue = [...textures];
  let k = 0;
  const step = (all = false) => {
    if (zone.world !== world) return;
    if (!all && queue.length) { viewer.renderer.initTexture(queue.shift()); return void requestAnimationFrame(() => step()); }
    const shown = [];
    for (let budget = REVEAL; k < hidden.length && (all || budget > 0);) {
      const o = hidden[k++];
      budget -= o.geometry?.attributes.position?.count ?? 1000;
      o.visible = true;
      if (o.frustumCulled) { o.frustumCulled = false; shown.push(o); }
    }
    requestAnimationFrame(() => { for (const o of shown) o.frustumCulled = true; if (k < hidden.length) step(); });
  };
  zone.reveal = () => step(true);
  step();
}

/**
 * Inn i scenen når gjenstandene er på plass og skyggeleggerne er kompilert (compileAsync, mens verdenen står utenfor
 * scenen – den kompilerer bare det som er synlig). now: man står ved skjøten – legges inn med en gang.
 */
export function showZone(viewer, zone, now) {
  const world = zone.world;
  if (now || !viewer.renderer.compileAsync) return void viewer.scene.add(world.group);
  world.objects.ready.then(() => compile(viewer, world.group)).catch(() => {}).finally(() => {
    if (zone.world === world && !world.group.parent) reveal(viewer, zone);
  });
}
