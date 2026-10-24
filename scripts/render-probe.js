// Sammenlign ekte GPU-rendering med/uten frustum-culling ved samme tid og kamera.
export function compareCulling(viewer) {
  const { renderer, world } = viewer;
  const saved = [];
  const reset = renderer.info.autoReset;
  renderer.info.autoReset = false;
  const render = () => {
    renderer.info.reset();
    viewer.postfx.render(0);
    return { image: renderer.domElement.toDataURL(), triangles: renderer.info.render.triangles };
  };
  try {
    const culled = render();
    world.group.traverse((object) => {
      if (!object.isMesh) return;
      saved.push([object, object.frustumCulled]);
      object.frustumCulled = false;
    });
    const complete = render();
    return { identical: culled.image === complete.image, culledTriangles: culled.triangles, allTriangles: complete.triangles };
  } finally {
    for (const [object, value] of saved) object.frustumCulled = value;
    renderer.info.autoReset = reset;
  }
}
