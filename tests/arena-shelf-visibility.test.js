import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ArenaShelfVisibility} from '../src/arena-shelf-visibility.js';
import {UnderShelfRelics} from '../src/under-shelf-relics.js';

test('arena hides upper shelves and their instanced debris, then restores them',()=>{
  const scene=new THREE.Scene(),upper=new THREE.Group(),lower=new THREE.Group();
  upper.position.y=20;lower.position.y=8;scene.add(upper,lower);
  const visibility=new ArenaShelfVisibility([{parent:upper},{parent:lower}]);
  const relics=new UnderShelfRelics(scene);relics.addShelf(upper,3);relics.build();
  const part=relics.dynamic[0],matrix=new THREE.Matrix4();
  part.batch.getMatrixAt(part.index,matrix);const original=matrix.clone();
  visibility.update({y:10});relics.updateDynamic();
  assert.equal(upper.visible,false);assert.equal(lower.visible,true);
  part.batch.getMatrixAt(part.index,matrix);assert.equal(matrix.determinant(),0);
  visibility.update(null);relics.updateDynamic();
  assert.equal(upper.visible,true);
  part.batch.getMatrixAt(part.index,matrix);assert.deepEqual(matrix.elements,original.elements);
});

test('restores original visibility when changing arenas',()=>{
  const group=new THREE.Group();group.position.y=20;group.visible=false;
  const visibility=new ArenaShelfVisibility([{parent:group}]);
  visibility.update({y:10});visibility.update({y:30});
  assert.equal(group.visible,false);
});
