// Utseendet i visningen: tåke, eksponering og etterbehandling for oversikt og gåmodus. I gåmodus
// gjør stemningen (gen/moods.js) tåka tettere og bildet mørkere jo nærmere Nightmare.
import * as THREE from 'three';
import { getMood } from '../gen/moods.js';

export const OVERVIEW_BG = new THREE.Color('#d8d6cf');

export function applyLook(viewer) {
  viewer.storeys?.setWalking(viewer.mode === 'walk'); // først: kan bytte viewer.world (view3d/storeys.js)
  const { world, scene, renderer, camera, settings } = viewer;
  const theme = world?.theme;
  if (!theme) return;
  const walking = viewer.mode === 'walk';
  const fog = scene.fog;
  renderer.toneMappingExposure = theme.exposure;
  if (walking) {
    fog.color.set(theme.fog.color);
    const mood = getMood(settings.mood);
    fog.density = theme.fog.density * (viewer.level.fog ?? 1) * mood.fog;
    renderer.toneMappingExposure = theme.exposure * mood.exposure;
    scene.background.copy(fog.color);
    camera.fov = settings.fov;
    world.setBoost(1);
  } else {
    fog.density = 0;
    scene.background.copy(OVERVIEW_BG);
    camera.fov = 45;
    world.setBoost(1.15);
  }
  camera.updateProjectionMatrix();
  world.water?.setMirror(walking);
  world.floorReflection?.setEnabled(walking && settings.effects !== 'reduced');
  viewer.postfx.setBeforeRender(() => world.floorReflection?.render(renderer, scene, camera));
  viewer.postfx.setLook({
    bloom: walking ? theme.bloom : theme.bloom * 0.5,
    grain: walking && settings.grain ? 0.055 : 0,
    vignette: walking ? 0.65 : 0.1,
    aberration: walking ? 0.0025 : 0,
    vhs: walking && settings.vhs,
    rose: walking && theme.id === 'mall' ? 0.13 : 0,
  });
  viewer.hud.setVhs(walking && settings.vhs);
  viewer.audio.eerieScale = walking ? getMood(settings.mood).eerie : 1;
  viewer.audio.eerieExtra = (walking && getMood(settings.mood).sounds) || [];
}
