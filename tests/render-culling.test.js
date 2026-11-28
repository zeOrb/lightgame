import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RenderCulling,freezeStaticKit} from '../src/render-culling.js';

test('render culling restores gameplay visibility and follows moving parent transforms',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,100),parent=new THREE.Group();scene.add(parent);camera.position.z=10;camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const inside=new THREE.Group(),outside=new THREE.Group(),hidden=new THREE.Group();parent.add(inside,outside,hidden);outside.position.x=100;hidden.visible=false;
  for(const root of [inside,outside,hidden])root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));
  scene.updateMatrixWorld(true);const culling=new RenderCulling([inside,outside,hidden]);culling.begin(camera);
  assert.equal(inside.visible,true);assert.equal(outside.visible,false);assert.equal(hidden.visible,false);culling.end();assert.equal(outside.visible,true);assert.equal(hidden.visible,false);
  parent.position.x=-100;scene.updateMatrixWorld(true);culling.begin(camera);assert.equal(outside.visible,true);assert.equal(inside.visible,false);culling.end();assert.equal(inside.visible,true);
});
test('frozen decorations still follow their animated shelf root',()=>{
  const root=new THREE.Group(),child=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());child.position.x=2;root.add(child);freezeStaticKit(root);root.position.set(5,3,0);root.rotation.y=Math.PI/2;root.updateMatrixWorld(true);const p=child.getWorldPosition(new THREE.Vector3());assert.ok(p.distanceTo(new THREE.Vector3(5,3,-2))<1e-6);assert.equal(root.matrixAutoUpdate,true);assert.equal(child.matrixAutoUpdate,false);
});
