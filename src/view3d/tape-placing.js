// Kassettene på et nivå (view3d/explore.js), i alle etasjene.

/** Nye kassetter på nivået; de man ikke fant på forrige nivå, telles ikke lenger. */
export function placeLevelTapes(ex, rand, avoidLoops) {
  const v = ex.v;
  ex.levelFound = ex.found;
  // Ikke i uendelige ganger: der ville kassettene hoppet når man flyttes én periode.
  const loops = avoidLoops ? (v.walk.loops?.loops ?? []) : [];
  const inLoop = (x, z) => loops.some((l) => (l.axis === 'x' ? x >= l.u0 && x <= l.u1 && z >= l.v0 - 3 && z <= l.v1 + 3 : z >= l.u0 && z <= l.u1 && x >= l.v0 - 3 && x <= l.v1 + 3));
  // Med etasjer: én kassett i hver av de andre etasjene, der den kan nås fra trappen (view3d/storeys.js).
  // Bestemmer modusen antallet (tapeCount), ligger alle i etasjen man er i.
  const s = v.storeys;
  const wanted = ex.tapeCount?.(ex.depth);
  const floors = s.levels.map((level, k) => {
    if (k === s.current) return { level: v.walk.level, field: v.world.field, spawn: v.walk.walker, skip: inLoop, base: s.at[k], count: wanted };
    const spawn = s.entry(k);
    return { level, field: s.all[k].field, spawn, base: s.at[k], count: spawn && wanted == null ? 1 : 0 }; // 0 fra modusen: ingen i det hele tatt
  });
  ex.total = ex.found + ex.tapes.placeFloors(floors, rand);
}
