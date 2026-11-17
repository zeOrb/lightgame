import * as THREE from 'three';

// Upload first-action buffers and compile their shaders before gameplay starts.
// Real effect objects are restored afterwards; no particles or cooldowns are consumed.
export async function warmupFirstActions(renderer,scene,camera,roots){
  const target=new THREE.WebGLRenderTarget(2,2,{type:THREE.HalfFloatType}),previousTarget=renderer.getRenderTarget(),previousLayers=camera.layers.mask,background=scene.background;
  const screenTarget=new THREE.WebGLRenderTarget(2,2);screenTarget.texture.colorSpace=renderer.outputColorSpace;
  const warmCamera=camera.clone();warmCamera.position.set(0,1,5);warmCamera.lookAt(0,0,0);warmCamera.updateMatrixWorld();
  const effects=new Set(),saved=new Map(),culled=new Map();
  for(const root of roots)root.traverse(o=>effects.add(o));
  scene.traverse(o=>{if(o.isMesh||o.isSprite||o.isPoints||o.isLine){saved.set(o,o.visible);o.visible=effects.has(o);if(effects.has(o)){culled.set(o,o.frustumCulled);o.frustumCulled=false;}} });
  for(const root of roots)for(let o=root;o&&o!==scene;o=o.parent){if(!saved.has(o))saved.set(o,o.visible);o.visible=true;}
  try{
    scene.background=null;camera.layers.set(0);warmCamera.layers.set(0);renderer.setRenderTarget(target);
    for(const root of roots)await renderer.compileAsync(root,warmCamera,scene);
    renderer.clear();renderer.render(scene,warmCamera);
    // The ribbon is composited directly to the sRGB screen with no scene lights.
    renderer.setRenderTarget(screenTarget);camera.layers.set(3);warmCamera.layers.set(3);
    for(const root of roots)if(root.layers.test(warmCamera.layers))await renderer.compileAsync(root,warmCamera,scene);
    renderer.clear();renderer.render(scene,warmCamera);
  }finally{
    for(const [object,visible] of saved)object.visible=visible;
    for(const [object,value] of culled)object.frustumCulled=value;
    camera.layers.mask=previousLayers;scene.background=background;renderer.setRenderTarget(previousTarget);target.dispose();screenTarget.dispose();
  }
}
