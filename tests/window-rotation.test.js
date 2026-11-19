import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWindowLight} from '../src/window-light.js';
test('rotating vitral decals keep world-space clipping and healing footprint aligned',()=>{
 const window=new THREE.Group();window.position.set(18,106,0);window.rotation.y=Math.PI/2;window.userData={targetSection:1,floorIndex:0};
 const pane=new THREE.Mesh(new THREE.BoxGeometry(2,5,.2),new THREE.MeshBasicMaterial({color:'white'}));window.add(pane);
 const parent=new THREE.Group(),floor=new THREE.Mesh();parent.add(floor);floor.userData={s:1,theta:0,y:100};
 const light=createWindowLight([pane],[floor]);assert.equal(light.zones.length,1);
 const patch=light.zones[0].o,decal=patch.children[0],initial=light.zones[0].center.clone();
 assert.match(decal.material.vertexShader,/tileWorld=\(modelMatrix\*vec4\(position,1\.0\)\)\.xyz/);
 for(let i=0;i<180;i++)light.rotate(()=>Math.PI/180);
 patch.updateWorldMatrix(true,true);const actual=light.zones[0].center;
 assert.ok(actual.distanceTo(initial.clone().applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI))<1e-8);
 assert.ok(Math.abs(decal.material.uniforms.floorAngle.value+Math.PI)<1e-8);
 assert.ok(Math.abs(patch.rotation.y-Math.PI)<1e-8);
});
