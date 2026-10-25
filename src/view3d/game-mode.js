// Game mode (forsiden → app/#play): rett inn i den uendelige utforskingen på Level 1 i stemningen
// man valgte – genererte nivåer der dørene er låst til kassettene er funnet (view3d/tape-hunt.js).
// Rommet som ligger i editoren, er «hjem» når man går ut, og endres ikke. Kalles fra et klikk
// (Start-knappen), så fullskjerm og muselås er lov.
export function startGame(viewer, mood, enterWalk = () => viewer.walkFullscreen()) {
  viewer.setMood(mood);
  viewer.hud.fade(true, true); // svart med en gang: rommet i editoren skal ikke vises først
  if (!enterWalk()) {
    viewer.hud.fade(false);
    return false;
  }
  viewer.explorer.goDeeper({ wait: 450 });
  return true;
}
