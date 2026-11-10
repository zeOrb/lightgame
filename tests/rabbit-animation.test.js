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
