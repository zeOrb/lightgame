import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TowerMist } from '../src/tower-mist.js';

test('fog depth pass captures solid floors, excludes VFX and restores render state',()=>{
  const scene=new THREE.Scene(),mist=new TowerMist(scene),camera=new THREE.PerspectiveCamera(58,1,.1,240);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
  const vfx=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true}));scene.add(floor,vfx);
  let target=null,fail=false;
  const renderer={
    getDrawingBufferSize(size){size.set(800,600);},getRenderTarget(){return target;},setRenderTarget(value){target=value;},clear(){},
    render(){assert.equal(floor.visible,true);assert.equal(vfx.visible,false);assert.equal(mist.mesh.visible,false);if(fail)throw new Error('render failed');},
  };
  mist.renderDepth(renderer,scene,camera);
  assert.equal(vfx.visible,true);assert.equal(mist.mesh.visible,true);assert.equal(target,null);assert.equal(scene.overrideMaterial,null);
  assert.equal(mist.depthTarget.width,800);assert.equal(mist.depthTarget.height,600);
  fail=true;assert.throws(()=>mist.renderDepth(renderer,scene,camera));
  assert.equal(vfx.visible,true);assert.equal(mist.mesh.visible,true);assert.equal(target,null);assert.equal(scene.overrideMaterial,null);
});
