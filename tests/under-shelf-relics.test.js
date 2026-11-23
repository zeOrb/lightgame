import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UnderShelfRelics,applyRopeSway} from '../src/under-shelf-relics.js';

test('rope wind uses shared GPU curves with pinned endpoints and no player interaction',()=>{
 const scene=new THREE.Scene(),relics=new UnderShelfRelics(scene);
 for(let section=0;section<2;section++){const group=new THREE.Group();group.position.z=section*3;scene.add(group);relics.addShelf(group,section,false,()=>.3);}
 const ropes=relics.parts[3].filter(part=>part.link);
 for(let row=0;row<ropes.length/8;row++){
  const pieces=ropes.slice(row*8,(row+1)*8);assert.equal(pieces.length,8);
  assert.equal(pieces[0].wind.center-pieces[0].wind.span/2,0);
  assert.equal(pieces[7].wind.center+pieces[7].wind.span/2,1);
  assert.equal(new Set(pieces.map(part=>part.wind.phase)).size,1,'adjacent pieces sway together');
 }
 relics.build();const rope=scene.children.find(object=>object.isInstancedMesh&&object.geometry.hasAttribute('ropeWind'));
 assert.ok(rope);assert.equal(rope.geometry.attributes.ropeWind.count,rope.count);
 const before=rope.instanceMatrix.array.slice();relics.updateWind(.2);relics.updateWind(0);assert.equal(relics.windTime.value,.2);
 assert.deepEqual(rope.instanceMatrix.array,before,'animation never updates CPU instance transforms');
 const shader={vertexShader:'#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <fog_fragment>',uniforms:{}};
 rope.material.onBeforeCompile(shader);assert.equal(shader.uniforms.ropeClock,relics.windTime);
 assert.ok(shader.vertexShader.includes('sin(ropeT*3.14159265)'));
 assert.doesNotMatch(shader.vertexShader,/player|rabbit/);
});

test('horizontal ropes connect neighboring stationary shelves without spanning gaps or separate floor roots',()=>{
 const scene=new THREE.Scene(),relics=new UnderShelfRelics(scene);
 const shelf=(section,moving=false,floor=0)=>{
  const group=new THREE.Group();group.position.z=section*3;group.userData.floorIndex=floor;scene.add(group);
  relics.addShelf(group,section,moving,()=>.3);return relics.parts.flat().filter(part=>part.group===group&&part.link);
 };
 assert.equal(shelf(0).length,0);
 const links=shelf(1);assert.equal(links.filter(part=>part.kind===3).length,8);
 assert.equal(links.filter(part=>part.kind===1).length,2);
 assert.equal(links.filter(part=>part.kind===4).length,2);
 assert.equal(shelf(3).length,0,'gap');
 assert.equal(shelf(4,true).length,0,'moving destination');
 assert.equal(shelf(5).length,0,'moving origin');
 assert.equal(shelf(6,false,1).length,0,'independent floor root');
});

test('six structural kits have different silhouettes and stay below the walkable tread',()=>{
 const scene=new THREE.Scene(),relics=new UnderShelfRelics(scene),counts=[];
 for(let style=0;style<6;style++){
  const group=new THREE.Group();scene.add(group);relics.addShelf(group,style,false,()=>style/6+.01);
  const parts=relics.parts.flat().filter(part=>part.group===group);counts.push(parts.length);
  assert.ok(parts.length>8&&parts.length<75);
  assert.ok(parts.every(part=>part.local.elements[13]<-.3));
  assert.ok(parts.every(part=>part.style===style));
  for(const part of parts){
   const x=new THREE.Vector3().setFromMatrixColumn(part.local,0).normalize(),y=new THREE.Vector3().setFromMatrixColumn(part.local,1).normalize(),z=new THREE.Vector3().setFromMatrixColumn(part.local,2).normalize();
   assert.ok(Math.abs(x.dot(y))<1e-6&&Math.abs(x.dot(z))<1e-6&&Math.abs(y.dot(z))<1e-6,'no global directional stretch or shear');
   if(part.kind===4)assert.ok(new THREE.Vector3().setFromMatrixColumn(part.local,0).length()<1,'scrap sheets retain their stock width');
  }
 }
 assert.ok(new Set(counts).size>=3,'different assemblies, not one repeated hanging panel');
 relics.build();
 const batches=scene.children.filter(object=>object.isInstancedMesh);
 assert.equal(batches.length,5);
 assert.ok(batches.every(batch=>batch.material.fog&&batch.material.depthWrite));
});

test('under-shelf debris uses shared instanced batches and follows moving shelves without shifting static debris',()=>{
  const scene=new THREE.Scene(),relics=new UnderShelfRelics(scene),fixed=new THREE.Group(),moving=new THREE.Group();
  scene.add(fixed,moving);relics.addShelf(fixed,0);relics.addShelf(moving,9,true);relics.build();
  const batches=scene.children.filter(o=>o.isInstancedMesh);assert.ok(batches.length<=5);assert.ok(batches.reduce((n,b)=>n+b.count,0)>=12);
  const part=relics.dynamic.find(p=>p.moving),before=new THREE.Matrix4(),after=new THREE.Matrix4();part.batch.getMatrixAt(part.index,before);
  moving.position.set(-2,5,1);relics.updateDynamic();part.batch.getMatrixAt(part.index,after);
  assert.ok(Math.abs(after.elements[12]-before.elements[12]+2)<1e-5);
  assert.ok(Math.abs(after.elements[13]-before.elements[13]-5)<1e-5);
  assert.ok(Math.abs(after.elements[14]-before.elements[14]-1)<1e-5);
  for(const batch of batches)assert.ok([...batch.instanceMatrix.array].every(Number.isFinite));
});
