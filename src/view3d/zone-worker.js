// Lager neste område i Noclip i bakgrunnen (view3d/zones.js), så gåingen ikke stopper opp: nivået (gen/) og de tunge
// flatene med bakt lys (world/world-meshes.js). Alt er ren logikk; flatene sendes som typede arrayer uten kopiering.
// Hovedtråden setter bare sammen 3D-en (buildWorld med prebuilt). Kan ikke flatene lages her, sendes bare nivået.
import { makeZone } from '../gen/zones.js';
import { buildWorldMeshes as raw, packMeshes, presplit } from '../world/world-meshes.js';

const buildWorldMeshes = (level) => presplit(raw(level)); // flatene, ferdig delt i biter

self.onmessage = ({ data }) => {
  const { id, level, ...request } = data;
  if (level) { // bare flatene, til et område som er laget før
    try {
      const transfer = [];
      return void self.postMessage({ id, prebuilt: packMeshes(buildWorldMeshes(level), transfer) }, transfer);
    } catch (error) {
      return void self.postMessage({ id, meshError: String(error?.message ?? error) });
    }
  }
  let zone;
  try {
    zone = makeZone(request);
  } catch (error) {
    return void self.postMessage({ id, error: String(error?.message ?? error) });
  }
  try {
    const transfer = [];
    const prebuilt = packMeshes(buildWorldMeshes(zone.level), transfer);
    self.postMessage({ id, zone, prebuilt }, transfer);
  } catch (error) {
    self.postMessage({ id, zone, meshError: String(error?.message ?? error) });
  }
};
