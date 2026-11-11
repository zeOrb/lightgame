import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RabbitAnimation } from '../src/rabbit-animation.js';

test('walking animation moves only the visual model and settles after stopping',()=>{
  const root=new THREE.Group(),visual=new THREE.Group();root.add(visual);root.position.set(12,99,.4);
  const ears=[new THREE.Object3D(),new THREE.Object3D()],paws=[new THREE.Object3D(),new THREE.Object3D()],tail=new THREE.Object3D();
  const animation=new RabbitAnimation(visual,ears,paws,tail);let peak=0;
  for(let i=0;i<60;i++){animation.update(1/60,{speed:3.8,height:0,velocity:0});peak=Math.max(peak,visual.position.y);}
  assert.ok(peak>.1);assert.deepEqual(root.position.toArray(),[12,99,.4]);
  for(let i=0;i<120;i++)animation.update(1/60,{speed:0,height:0,velocity:0});
  assert.ok(visual.position.y<.001);assert.ok(Math.abs(visual.scale.y-1)<.001);
  animation.update(.1,{speed:3,height:2,velocity:-3});animation.update(.1,{speed:0,height:0,velocity:0});
  assert.ok(visual.scale.y<1,'landing has a small squash');
  animation.reset();assert.deepEqual(visual.scale.toArray(),[1,1,1]);assert.deepEqual(visual.position.toArray(),[0,0,0]);
});
test('fall animation turns upside down, kicks both paws and resets without moving physics',()=>{
  const root=new THREE.Group(),visual=new THREE.Group();root.add(visual);root.position.set(7,55,3);
  const ears=[new THREE.Object3D(),new THREE.Object3D()],paws=[new THREE.Object3D(),new THREE.Object3D()],tail=new THREE.Object3D();
  const animation=new RabbitAnimation(visual,ears,paws,tail);
  animation.update(.1,{speed:3,height:2,velocity:-4});animation.reset();
  for(let i=0;i<40;i++)animation.updateFall(1/60);
  const up=new THREE.Vector3(0,1,0).applyEuler(visual.rotation);assert.ok(up.y<-.99);
  const kick=paws[0].rotation.x;animation.updateFall(.04);assert.notEqual(paws[0].rotation.x,kick);
  assert.ok(Math.abs(paws[0].rotation.x+paws[1].rotation.x)<1e-10);
  assert.deepEqual(root.position.toArray(),[7,55,3]);
  animation.reset();assert.equal(visual.rotation.x,0);assert.equal(paws[0].rotation.z,0);assert.deepEqual(visual.position.toArray(),[0,0,0]);
});
