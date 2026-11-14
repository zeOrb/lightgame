import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RabbitAnimation } from '../src/rabbit-animation.js';
import {createRabbitTraveler} from '../src/rabbit-model.js';

test('jump squashes 33%, stretches 33%, and is neutral at the apex without sideways wobble',()=>{
  const visual=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  const traveler=createRabbitTraveler(visual,material,material,material);
  const animation=new RabbitAnimation(visual,traveler.ears,traveler.paws,traveler.coat,traveler.arms,traveler.head);
  animation.jump(12);
  const frame=(dt,velocity)=>animation.update(dt,{speed:5,height:1,velocity,turn:1});
  frame(.10,10);assert.ok(Math.abs(visual.scale.y-.67)<1e-8);
  frame(.18,6.4);assert.ok(Math.abs(visual.scale.y-1.33)<1e-8);
  assert.ok(traveler.head.rotation.x<0);assert.ok(traveler.ears[0].rotation.x<0);
  frame(.22,2);assert.ok(visual.scale.y>1&&visual.scale.y<1.33);
  frame(.18,0);
  assert.equal(visual.scale.y,1);assert.equal(Math.abs(traveler.head.rotation.x),0);
  assert.equal(Math.abs(traveler.ears[0].rotation.x),0);
  for(const velocity of [0,-2,-6]){
    frame(.03,velocity);
    assert.equal(Math.abs(visual.rotation.x),0);assert.equal(Math.abs(visual.rotation.z),0);
    assert.equal(visual.position.x,0);assert.equal(visual.position.z,0);
  }
  animation.doubleJump();frame(.10,12);assert.ok(Math.abs(visual.scale.y-.67)<1e-8);
  assert.equal(Math.abs(visual.rotation.x),0,'double jump no longer adds a somersault');
});

test('moving jump follows a diagonal line and keeps its takeoff mode until landing',()=>{
  const visual=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  const traveler=createRabbitTraveler(visual,material,material,material);
  const animation=new RabbitAnimation(visual,traveler.ears,traveler.paws,traveler.coat,traveler.arms,traveler.head);
  animation.jump(12,7);
  animation.update(.09,{speed:7,height:.5,velocity:10.2});
  assert.ok(Math.abs(visual.scale.y-.67)<1e-8);
  animation.update(.16,{speed:0,height:1,velocity:7});
  assert.ok(animation.jumpMoving,'releasing movement in the air does not switch the pose');
  assert.ok(visual.rotation.x>.45&&visual.rotation.x<.8);
  assert.equal(Math.abs(visual.rotation.z),0);
  assert.ok(traveler.head.rotation.x<-.5,'head compensates the diagonal torso');
  animation.update(.35,{speed:0,height:3,velocity:0});
  assert.equal(visual.scale.y,1);assert.equal(visual.rotation.x,0);
  assert.equal(Math.abs(traveler.head.rotation.x),0);
  animation.jump(12,0);
  animation.update(.2,{speed:7,height:1,velocity:8});
  assert.equal(animation.jumpMoving,false,'air steering does not change the standing takeoff');
  assert.equal(visual.rotation.x,0);
});

test('both jump poses hold until 3/4 ascent, release at apex and bounce softly afterwards',()=>{
  for(const speed of [0,7]){
    const visual=new THREE.Group(),material=new THREE.MeshStandardMaterial();
    const traveler=createRabbitTraveler(visual,material,material,material);
    const animation=new RabbitAnimation(visual,traveler.ears,traveler.paws,traveler.coat,traveler.arms,traveler.head);
    animation.jump(12,speed);
    const frame=(dt,velocity)=>animation.update(dt,{speed,height:2,velocity});
    frame(.3,6);assert.equal(visual.scale.y,1.33);
    frame(.15,3);assert.equal(visual.scale.y,1.33,'stretch held through 75% ascent');
    frame(.075,1.5);assert.ok(visual.scale.y>1&&visual.scale.y<1.33);
    frame(.075,0);assert.equal(visual.scale.y,1);
    frame(.04,-1.12);assert.ok(visual.scale.y<1&&visual.scale.y>.96,'small compression overshoot');
    frame(.06,-2.8);assert.ok(visual.scale.y>1&&visual.scale.y<1.04,'small rebound');
    frame(.2,-8.4);assert.equal(visual.scale.y,1,'bounce settles');
    assert.equal(visual.position.x,0);assert.equal(visual.position.z,0);
    animation.jump(12,speed);assert.equal(animation.apexAge,-1,'new jump resets bounce');
  }
});

test('dash lays the torso forward while head looks slightly up and ears trail behind',()=>{
  const visual=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  const traveler=createRabbitTraveler(visual,material,material,material);
  const animation=new RabbitAnimation(visual,traveler.ears,traveler.paws,traveler.coat,traveler.arms,traveler.head);
  const frame=dashing=>animation.update(1/60,{speed:6,height:0,velocity:0,dashing});
  for(let i=0;i<12;i++)frame(true);
  visual.updateMatrixWorld(true);
  const axis=(node,v)=>v.applyQuaternion(node.getWorldQuaternion(new THREE.Quaternion()));
  const torso=axis(visual,new THREE.Vector3(0,1,0));
  const gaze=axis(traveler.head,new THREE.Vector3(0,0,1));
  assert.ok(torso.z>.95&&torso.y<.2,'torso is nearly horizontal along travel');
  assert.ok(gaze.z>.95&&gaze.y>.05&&gaze.y<.3,'head faces forward and a little upward');
  for(const ear of traveler.ears)assert.ok(axis(ear,new THREE.Vector3(0,1,0)).z<-.9,'ears stream backwards');
  for(let i=0;i<30;i++)frame(false);
  assert.equal(Math.abs(traveler.head.rotation.x),0);
  animation.reset();assert.equal(visual.rotation.x,0);assert.equal(traveler.head.rotation.x,0);
});

test('dash sweeps coat back and smoothly settles after the burst',()=>{
  const visual=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  const traveler=createRabbitTraveler(visual,material,material,material);
  const animation=new RabbitAnimation(visual,traveler.ears,traveler.paws,traveler.coat,traveler.arms);
  const frame=dashing=>animation.update(1/60,{speed:5,height:0,velocity:0,dashing});
  for(let i=0;i<60;i++)frame(false);
  frame(true);assert.ok(animation.dashClothBlend>0&&animation.dashClothBlend<.5);
  for(let i=0;i<15;i++)frame(true);
  assert.ok(animation.dashClothBlend>.99);
  const peak=animation.dashClothBlend;frame(false);
  assert.ok(animation.dashClothBlend<peak&&animation.dashClothBlend>peak*.85);
  for(let i=0;i<120;i++)frame(false);
  assert.ok(animation.dashClothBlend<.001);
  animation.reset();assert.equal(animation.dashClothBlend,0);
});

test('falling coat curls progressively, keeps its collar anchored and its glowing hem attached',()=>{
  const visual=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  const traveler=createRabbitTraveler(visual,material,material,material);
  const animation=new RabbitAnimation(visual,traveler.ears,traveler.paws,traveler.coat,traveler.arms);
  animation.updateFall(1/60);assert.ok(animation.fallClothBlend>0&&animation.fallClothBlend<.1);
  for(let i=0;i<90;i++)animation.updateFall(1/60);
  assert.ok(animation.fallClothBlend>.99);
  const panel=animation.cloth.find(c=>c.kind==='coat'),position=panel.mesh.geometry.attributes.position;
  let displacement=0;
  for(let i=0;i<position.count;i++){
    const restY=panel.rest[i*3+1];
    assert.ok(Number.isFinite(position.getZ(i)));
    if(restY>=0)assert.equal(position.getZ(i),panel.rest[i*3+2]);
    else displacement=Math.max(displacement,Math.abs(position.getZ(i)-panel.rest[i*3+2]));
  }
  assert.ok(displacement>.1,'fall produces a visible rolling fold');
  const before=position.array.slice();animation.updateFall(.1);
  assert.notDeepEqual(position.array,before,'cloth keeps fluttering during the fall');
  animation.reset();assert.equal(animation.fallClothBlend,0);assert.deepEqual(position.array,panel.rest);
});

test('coat has a continuous clock and smoothly blends wind on start and stop',()=>{
  const visual=new THREE.Group(),coat=new THREE.Group(),panel=new THREE.Mesh(new THREE.PlaneGeometry(.4,.8),new THREE.MeshBasicMaterial());
  panel.userData.cloth='coat';coat.add(panel);visual.add(coat);
  const animation=new RabbitAnimation(visual,[],[],coat);
  const tick=speed=>animation.update(1/60,{speed,height:0,velocity:0});
  tick(5);assert.ok(animation.clothWind>0&&animation.clothWind<.2);
  for(let i=0;i<60;i++)tick(5);
  const wind=animation.clothWind,clock=animation.clothTime;
  tick(0);assert.ok(animation.clothWind<wind&&animation.clothWind>wind*.9);
  assert.ok(animation.clothTime>clock);
  for(let i=0;i<180;i++)tick(0);
  assert.ok(animation.clothWind<.04);
  animation.reset();assert.equal(animation.clothWind,0);
});

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
  const up=new THREE.Vector3(0,1,0).applyEuler(visual.rotation);assert.ok(up.y<-.9);
  const kick=paws[0].rotation.x;animation.updateFall(.04);assert.notEqual(paws[0].rotation.x,kick);
  assert.ok(Math.abs(paws[0].rotation.x+paws[1].rotation.x)>.001,'paws struggle with different phases');
  assert.deepEqual(root.position.toArray(),[7,55,3]);
  animation.reset();assert.equal(visual.rotation.x,0);assert.equal(paws[0].rotation.z,0);assert.deepEqual(visual.position.toArray(),[0,0,0]);
});
