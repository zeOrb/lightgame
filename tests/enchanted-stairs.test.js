import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEnchantedStep} from '../src/enchanted-stairs.js';
test('carved stairs preserve the tread height and carry every ornament as one platform',()=>{
  const materials={wood:new THREE.MeshStandardMaterial(),carved:new THREE.MeshStandardMaterial(),bronze:new THREE.MeshStandardMaterial()};
  for(const section of [0,12,48,84,138,167]){
    const group=new THREE.Group(),floor=createEnchantedStep(group,section,materials);
    floor.geometry.computeBoundingBox();
    assert.ok(Math.abs(floor.geometry.boundingBox.max.y+floor.position.y+.02)<1e-6);
    assert.equal(group.children.length,4);
    const initial=new THREE.Box3().setFromObject(group);
    assert.ok(initial.max.y<.02,'decoration stays flush, without railings');
    group.position.set(-2.7,100,0);group.updateMatrixWorld(true);
    const moved=new THREE.Box3().setFromObject(group);
    assert.ok(Math.abs(moved.min.x-initial.min.x+2.7)<1e-6);
    for(const child of group.children){assert.equal(child.parent,group);assert.ok([...child.geometry.attributes.position.array].every(Number.isFinite));child.geometry.dispose();}
  }
});
