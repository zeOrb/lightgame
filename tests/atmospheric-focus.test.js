import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AtmosphericFocus} from '../src/atmospheric-focus.js';
import {ForegroundRuins} from '../src/foreground-ruins.js';

test('atmospheric focus isolates scene, grade, antialias and paper passes and restores renderer state',()=>{
  const focus=new AtmosphericFocus(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(58,1.5,.1,240),point=new THREE.Vector3(12,100,0),output={},draws=[];
  let target=output;scene.background=new THREE.Color('#303849');const background=scene.background,depth=new THREE.DepthTexture(800,600);
  const renderer={autoClear:true,getDrawingBufferSize:v=>v.set(800,600),getRenderTarget:()=>target,setRenderTarget:t=>target=t,clear(){},render:(s,c)=>draws.push({s,c,target,layers:c.layers.mask,background:s.background})};
  focus.render(renderer,scene,camera,point,.7,depth);
  assert.equal(draws.length,5);assert.equal(draws[0].s,scene);assert.equal(draws[0].target,focus.target);assert.equal(draws[1].target,focus.aoTarget);assert.equal(draws[2].target,focus.graded);assert.equal(draws[3].target,output);assert.equal(draws[4].s,scene);assert.equal(target,output);assert.equal(camera.layers.mask,1);
  assert.equal(focus.target.width,800);assert.ok(focus.material.uniforms.focusPoint.value.equals(point));
  assert.equal(focus.target.samples,0);assert.equal(focus.material.uniforms.sceneDepth.value,depth);assert.equal(draws[4].layers,4);assert.equal(draws[4].background,null);assert.equal(scene.background,background);assert.equal(renderer.autoClear,true);
  renderer.render=()=>{throw new Error('render failed');};assert.throws(()=>focus.render(renderer,scene,camera,point,.7));assert.equal(target,output);
});

test('foreground silhouettes stay at screen edges across aspect ratios and never enter solid depth passes',()=>{
  const scene=new THREE.Scene(),foreground=new ForegroundRuins(scene),camera=new THREE.PerspectiveCamera(58,1,.1,240);
  for(const aspect of [.6,1,2]){
    camera.aspect=aspect;foreground.update(camera,.016);
    const halfWidth=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*2.8*aspect;
    for(const {mesh} of foreground.sides){assert.ok(Math.abs(mesh.position.x)>halfWidth*.95);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.depthWrite,false);}
  }
  foreground.update(camera,.016,false);assert.equal(foreground.root.visible,false);
});

test('AO uses its own pixel grid at even, odd and resized render resolutions',()=>{
  const focus=new AtmosphericFocus(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),output={};let target=output;
  let width=1280,height=720;
  const renderer={autoClear:true,getDrawingBufferSize:v=>v.set(width,height),getRenderTarget:()=>target,setRenderTarget:t=>target=t,clear(){},render(){}};
  for(const size of [[1280,720],[1293,776],[1440,900],[800,601]]){
    [width,height]=size;focus.render(renderer,scene,camera,new THREE.Vector3(),1,null);
    assert.deepEqual(focus.material.uniforms.resolution.value.toArray(),size);
    assert.deepEqual(focus.aoMaterial.uniforms.aoResolution.value.toArray(),size.map(value=>Math.ceil(value/2)));
    assert.equal(focus.aoTarget.width,Math.ceil(width/2));assert.equal(focus.aoTarget.height,Math.ceil(height/2));
    assert.equal(target,output);
  }
});
test('fall darkness is composited after ungraded objects and leaves render state intact',()=>{
  const focus=new AtmosphericFocus(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),output={},draws=[];let target=output;
  const renderer={autoClear:true,getDrawingBufferSize:v=>v.set(800,600),getRenderTarget:()=>target,setRenderTarget:t=>target=t,clear(){},render:(s,c)=>draws.push({scene:s,material:focus.quad.material})};
  focus.render(renderer,scene,camera,new THREE.Vector3(),1,null,.75);
  assert.equal(draws.length,6);assert.equal(draws[4].scene,scene);assert.equal(draws[5].material,focus.fallFade);
  assert.equal(focus.fallFade.uniforms.strength.value,.75);assert.equal(focus.fallFade.depthTest,false);
  assert.equal(focus.quad.material,focus.material);assert.equal(camera.layers.mask,1);assert.equal(target,output);assert.equal(renderer.autoClear,true);
});
