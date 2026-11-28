import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TowerHierarchy} from '../src/tower-hierarchy.js';
test('attaching chest loot preserves world pose without updating unrelated tower subtrees',()=>{
 const scene=new THREE.Scene(),tower=new TowerHierarchy(scene),gem=new THREE.Group(),unrelated=new THREE.Group();tower.root.add(unrelated);let visits=0;unrelated.updateMatrixWorld=()=>visits++;tower.root.rotation.y=.6;tower.floors[0].rotation.y=.3;gem.position.set(15,90,3);scene.add(gem);const expected=gem.getWorldPosition(new THREE.Vector3());visits=0;tower.add(gem,0);assert.equal(visits,0);assert.ok(gem.getWorldPosition(new THREE.Vector3()).distanceTo(expected)<1e-7);
});
