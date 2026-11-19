import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PickupEffects} from '../src/pickup-effects.js';
const world=o=>o.getWorldPosition(new THREE.Vector3());
const near=(a,b)=>assert.ok(a.distanceTo(b)<1e-7,a.toArray()+' != '+b.toArray());
function setup(){
 const scene=new THREE.Scene(),floor=new THREE.Group(),shard=new THREE.Object3D(),target=new THREE.Vector3(14,11,0);
 scene.add(floor);floor.add(shard);shard.position.set(15,10,0);
 const texture=new THREE.Texture(),effects=new PickupEffects(scene,texture,out=>out.copy(target));
 return {scene,floor,shard,target,texture,effects};
}
test('collapse follows the rotating gem, detached flight and ribbon follow the player instead',()=>{
 const {scene,floor,shard,target,texture,effects}=setup();
 const original=Math.random;Math.random=()=>.5;
 try{effects.collect(shard,()=>{},{followTarget:true});}finally{Math.random=original;}
 effects.update(.14);floor.rotation.y=.35;effects.update(0);
 const e=effects.active[0];near(world(e.group),world(shard));
 effects.update(.2);
 for(const step of [.0,.45,.3]){
  effects.update(step);const before=world(e.group),ribbon=world(e.trail.mesh);
  const delta=new THREE.Vector3(-8,3,12);target.add(delta);floor.rotation.y+=.7;
  const trail=e.trail.points.map(p=>p.position.clone());effects.update(0);
  near(world(e.group),before.add(delta));near(world(e.trail.mesh),ribbon.add(delta));
  assert.equal(e.trail.points.length,trail.length);e.trail.points.forEach((p,i)=>near(p.position,trail[i]));
  assert.equal(e.root.parent,scene);assert.notEqual(e.root.parent,floor);
 }
 effects.clear();assert.equal(scene.children.length,1);texture.dispose();
});
test('arrival follows the moving player, awards once, and clears all transient roots',()=>{
 const {scene,floor,shard,target,texture,effects}=setup();let arrivals=0;
 effects.collect(shard,()=>arrivals++);effects.update(.14);
 assert.equal(shard.visible,true);assert.ok(Math.abs(shard.scale.x-.875)<1e-9);
 effects.update(.15);assert.equal(shard.visible,false);
 target.set(-13,20,6);floor.rotation.y=2;effects.update(3);
 const e=effects.active[0];assert.equal(arrivals,1);near(world(e.group),target);
 target.add(new THREE.Vector3(2,-1,4));effects.update(.1);near(world(e.group),target);assert.equal(arrivals,1);
 effects.update(1);assert.equal(effects.active.length,0);assert.deepEqual(scene.children,[floor]);
 effects.collect(new THREE.Object3D());effects.clear();assert.deepEqual(scene.children,[floor]);texture.dispose();
});
test('warmup returns the complete player root including the trail and clears safely',()=>{
 const scene=new THREE.Scene(),texture=new THREE.Texture(),effects=new PickupEffects(scene,texture);
 const roots=effects.prepareWarmup();const e=effects.active[0];
 assert.ok(roots.includes(e.root));assert.equal(e.trail.mesh.parent,e.root);
 effects.clear();assert.equal(scene.children.length,0);texture.dispose();
});

test('a moving or jumping target never leaves the hover point anchored to a distant gem',()=>{
 const {shard,target,effects,texture}=setup();effects.collect(shard,()=>{},{followTarget:true});
 effects.update(.14);target.add(new THREE.Vector3(9,6,-8));effects.update(.15);
 const e=effects.active[0];
 assert.ok(e.outward.v3.y>=.45&&e.outward.v3.y<=1.9);
 assert.ok(Math.hypot(e.outward.v3.x,e.outward.v3.z)<=.975);
 near(e.home.v0,e.outward.v3);
 near(e.outward.v0.clone().add(e.root.position),world(shard));
 effects.clear();texture.dispose();
});

test('static floors keep outward flight, hover and the ribbon in world space when the player runs away',()=>{
 const {shard,target,effects,texture}=setup();effects.collect(shard);
 effects.update(.3);const e=effects.active[0],anchor=e.root.position.clone();
 const from=world(e.group),ribbon=world(e.trail.mesh);target.add(new THREE.Vector3(8,2,-7));effects.update(0);
 near(world(e.group),from);near(world(e.trail.mesh),ribbon);near(e.root.position,anchor);
 // Stop during the hold phase, then move the player again.
 effects.update(e.outDuration+e.chargeDuration*.5-.02);
 const hover=world(e.group);target.add(new THREE.Vector3(-4,0,9));effects.update(0);near(world(e.group),hover);
 // Homing still ends at the player's current location and awards exactly once.
 effects.update(3);near(world(e.group),target);effects.clear();texture.dispose();
});
