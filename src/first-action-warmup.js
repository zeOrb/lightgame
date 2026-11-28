import * as THREE from 'three';

// Upload first-action buffers and compile their shaders before gameplay starts.
// Real effect objects are restored afterwards; no particles or cooldowns are consumed.
export async function warmupFirstActions(renderer,scene,camera,roots){
  const target=new THREE.WebGLRenderTarget(2,2,{type:THREE.HalfFloatType}),previousTarget=renderer.getRenderTarget(),previousLayers=camera.layers.mask,background=scene.background;
  const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
  const warmCamera=camera.clone();warmCamera.position.set(0,1,5);warmCamera.lookAt(0,0,0);warmCamera.updateMatrixWorld();
  const effects=new Set(),saved=new Map(),culled=new Map();
  for(const root of roots)root.traverse(o=>effects.add(o));
  scene.traverse(o=>{if(o.isMesh||o.isSprite||o.isPoints||o.isLine){saved.set(o,o.visible);o.visible=effects.has(o);if(effects.has(o)){culled.set(o,o.frustumCulled);o.frustumCulled=false;}} });
  for(const root of roots)for(let o=root;o&&o!==scene;o=o.parent){if(!saved.has(o))saved.set(o,o.visible);o.visible=true;}
  try{
    scene.background=null;camera.layers.set(0);warmCamera.layers.set(0);renderer.setRenderTarget(target);
    for(const root of roots)await renderer.compileAsync(root,warmCamera,scene);
    renderer.clear();renderer.render(scene,warmCamera);
    // Precompile overlay effects on their actual render layers: pickup bursts
    // use layer 2 and the dash ribbons use layer 3.
    for(const layer of [2,3]){
      renderer.setRenderTarget(null);renderer.setViewport(0,0,2,2);renderer.setScissor(0,0,2,2);renderer.setScissorTest(true);camera.layers.set(layer);warmCamera.layers.set(layer);
      // A root group can be on layer 0 while its effect meshes are on layers
      // 2/3, so let Three.js filter the descendants instead of filtering roots.
      for(const root of roots)await renderer.compileAsync(root,warmCamera,scene);
      renderer.clear();renderer.render(scene,warmCamera);
    }
  }finally{
    for(const [object,visible] of saved)object.visible=visible;
    for(const [object,value] of culled)object.frustumCulled=value;
    camera.layers.mask=previousLayers;scene.background=background;renderer.setRenderTarget(previousTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);target.dispose();
  }
}
