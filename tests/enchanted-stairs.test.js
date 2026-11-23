import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEnchantedStep} from '../src/enchanted-stairs.js';
import {shelfInnerRadius,SHELF_OUTER_RADIUS,SHELF_HALF_ANGLE} from '../src/game.js';
test('carved stairs preserve the tread height and carry every ornament as one platform',()=>{
  const materials={wood:new THREE.MeshStandardMaterial(),carved:new THREE.MeshStandardMaterial(),bronze:new THREE.MeshStandardMaterial()};
  for(const section of [0,12,48,84,138,167])for(const sample of [.01,.30,.55,.99]){
    const group=new THREE.Group(),floor=createEnchantedStep(group,section,materials,()=>sample);
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

test('gothic tread changes its silhouette while support rays keep the original collision',()=>{
  for(const sample of [.01,.30,.55,.99]){
  const materials={wood:new THREE.MeshStandardMaterial(),carved:new THREE.MeshStandardMaterial(),bronze:new THREE.MeshStandardMaterial()},group=new THREE.Group(),floor=createEnchantedStep(group,0,materials,()=>sample);
  assert.equal(floor.geometry.userData.gothicKind,Math.floor(sample*4));
  const original=new THREE.Mesh(floor.userData.collisionGeometry,materials.wood);original.position.copy(floor.position);group.add(original);group.position.set(2,7,-3);group.rotation.y=.6;group.updateMatrixWorld(true);
  const inner=shelfInnerRadius(0),ray=new THREE.Raycaster();
  for(const r of [inner-.10,inner+.08,inner+.5,15,SHELF_OUTER_RADIUS-.08,SHELF_OUTER_RADIUS+.1])for(const t of [-SHELF_HALF_ANGLE*.9,0,SHELF_HALF_ANGLE*.9]){
    const origin=group.localToWorld(new THREE.Vector3(Math.cos(t)*r,2,Math.sin(t)*r));ray.set(origin,new THREE.Vector3(0,-1,0));
    const a=ray.intersectObject(floor,false),b=ray.intersectObject(original,false);assert.equal(a.length,b.length);if(a.length){assert.ok(a[0].point.distanceTo(b[0].point)<1e-7);assert.equal(a[0].object,floor);}
  }
  floor.geometry.computeBoundingBox();original.geometry.computeBoundingBox();assert.ok(floor.geometry.boundingBox.min.y<original.geometry.boundingBox.min.y-.08,'the carved nose changes the actual body silhouette');
  }
});
