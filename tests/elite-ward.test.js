import test from 'node:test';
import assert from 'node:assert/strict';
import {EliteWard} from '../src/elite-ward.js';
import * as THREE from 'three';
import {EliteMirror} from '../src/elite-mirror.js';
import {cameraPose} from '../src/camera.js';

test('mirror intercepts a fast dash in either direction across the whole shelf',()=>{
  const ward=new EliteWard(16);
  assert.equal(ward.protected,true);
  assert.equal(ward.contact(14,16,0,0),true);
  assert.equal(ward.contact(16,14,2,1),true);
  assert.equal(ward.contact(14,16,3,0),false);
  assert.equal(ward.contact(14,16,0,3),false);
  assert.equal(ward.contact(12,13,0,0),false);
});
test('only breaking the mirror unlocks kills, and a new run restores protection',()=>{
  const ward=new EliteWard(16);
  assert.equal(ward.contact(14,16,0,0),true);
  assert.equal(ward.protected,true); // Walking/jumping contact never consumes it.
  assert.equal(ward.breakWithDash(),true);
  assert.equal(ward.protected,false);
  assert.equal(ward.contact(14,16,0,0),false);
  assert.equal(ward.breakWithDash(),false);
  ward.reset();assert.equal(ward.protected,true);
});
test('shattered mirror cannot reappear during updates, but is restored on restart',()=>{
  const ward=new EliteWard(16),mirror=new EliteMirror(new THREE.Scene(),ward),camera=new THREE.PerspectiveCamera();
  camera.position.set(0,100,0);
  mirror.update(.016,camera,15);assert.equal(mirror.glass.visible,true);
  ward.breakWithDash();mirror.shatter();mirror.update(.4,camera,15);
  assert.equal(mirror.glass.visible,false);assert.equal(mirror.shards.visible,true);
  mirror.update(1,camera,15);assert.equal(mirror.shards.visible,false);
  mirror.reset();mirror.update(.016,camera,15);
  assert.equal(ward.protected,true);assert.equal(mirror.glass.visible,true);
});
test('mirror is a solid fog occluder, visible from the gameplay approach and from afar',()=>{
  const mirror=new EliteMirror(new THREE.Scene(),new EliteWard(16)),camera=new THREE.PerspectiveCamera();
  assert.equal(mirror.glass.material.transparent,false);
  assert.equal(mirror.glass.material.depthWrite,true);
  for(const anchor of [12,14,15,16,18]){
    const pose=cameraPose(anchor,16/9);camera.position.set(pose.position.x,pose.position.y,pose.position.z);
    mirror.update(0,camera,anchor);mirror.root.updateMatrixWorld(true);
    const normal=new THREE.Vector3(0,0,1).transformDirection(mirror.glass.matrixWorld);
    const view=camera.position.clone().sub(mirror.root.position).normalize();
    assert.ok(normal.dot(view)>.4,`mirror face must stay readable at section ${anchor}`);
  }
  mirror.update(0,camera,0);assert.equal(mirror.glass.visible,true);
  assert.doesNotThrow(()=>mirror.glass.onBeforeRender(null,{overrideMaterial:{}},camera));
});
