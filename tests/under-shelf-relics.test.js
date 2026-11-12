import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UnderShelfRelics} from '../src/under-shelf-relics.js';

test('under-shelf debris uses shared instanced batches and follows moving shelves without shifting static debris',()=>{
  const scene=new THREE.Scene(),relics=new UnderShelfRelics(scene),fixed=new THREE.Group(),moving=new THREE.Group();
  scene.add(fixed,moving);relics.addShelf(fixed,0);relics.addShelf(moving,9,true);relics.build();
  const batches=scene.children.filter(o=>o.isInstancedMesh);assert.ok(batches.length<=3);assert.ok(batches.reduce((n,b)=>n+b.count,0)>=12);
  const part=relics.dynamic[0],before=new THREE.Matrix4(),after=new THREE.Matrix4();part.batch.getMatrixAt(part.index,before);
  moving.position.set(-2,5,1);relics.updateDynamic();part.batch.getMatrixAt(part.index,after);
  assert.ok(Math.abs(after.elements[12]-before.elements[12]+2)<1e-5);
  assert.ok(Math.abs(after.elements[13]-before.elements[13]-5)<1e-5);
  assert.ok(Math.abs(after.elements[14]-before.elements[14]-1)<1e-5);
  for(const batch of batches)assert.ok([...batch.instanceMatrix.array].every(Number.isFinite));
});
