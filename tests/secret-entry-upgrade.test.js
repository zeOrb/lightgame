import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SecretLevels,SECRET_ROAD_REBOUND,SECRET_ROAD_HEAD_CLEARANCE} from '../src/secret-levels.js';
import {RabbitAnimation} from '../src/rabbit-animation.js';
import {createRabbitTraveler} from '../src/rabbit-model.js';
import {SkillProgression,skillStats} from '../src/progression.js';
import {SecretDirtParticles} from '../src/secret-dirt-particles.js';

const setup=()=>{const levels=new SecretLevels(new THREE.Scene(),{carved:new THREE.MeshBasicMaterial()}),road=levels.routes[0];levels.reveal(road.s,1,0);const point=road.points[3].clone();return {levels,road,point,top:road.road.heightAt(point)};};

test('secret slip is opt-in, requires the jump upgrade and persists after purchasing',()=>{
  const saved=new Map(),storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
  const p=new SkillProgression(storage);p.award(100);
  assert.equal(skillStats(p.state).secretRoadSlip,false);assert.equal(p.buy('secretSlip'),false);
  for(const id of ['source','speed','jump'])assert.equal(p.buy(id),true);
  const points=p.state.points;assert.equal(p.buy('secretSlip'),true);assert.equal(points-p.state.points,12);
  assert.equal(skillStats(new SkillProgression(storage).state).secretRoadSlip,true);
  p.reset();assert.equal(skillStats(p.state).secretRoadSlip,false);
});

test('default underside entry pushes down, while the purchased skill retains smooth ascent',()=>{
  const {levels,point,top}=setup(),original=point.clone();
  const blocked=levels.enterFromBelow(point,top-1.35,top-1.2,5,.03);
  assert.equal(blocked.blocked,true);assert.equal(blocked.velocity,-SECRET_ROAD_REBOUND);
  assert.ok(blocked.y<=top-1.25);assert.equal(levels.assist,null);assert.deepEqual(point,original);
  assert.equal(levels.enterFromBelow(point,blocked.y,blocked.y-.1,blocked.velocity,.03),null);
  const allowed=levels.enterFromBelow(point,top-1.35,top-1.2,5,.03,true);
  assert.ok(allowed);assert.equal(allowed.blocked,undefined);assert.ok(allowed.velocity>=0);assert.ok(levels.assist);
});

test('underside blocking ignores top-side jumps, stationary/descending movement, hidden roads and drop-through',()=>{
  const {levels,road,point,top}=setup();
  for(const args of [[top,top+.2,5],[top-4,top-4,0],[top-3.5,top-3.6,-4],[top-4,top-3.8,4]])assert.equal(levels.enterFromBelow(point,...args,.03),null);
  levels.drop({route:road});assert.equal(levels.enterFromBelow(point,top-1.35,top-1.2,5,.03),null);
  road.dropCooldown=0;road.road.reveal(0);assert.equal(levels.enterFromBelow(point,top-1.35,top-1.2,5,.03),null);
});

test('head clearance uses the real underside while flexible ear tips remain below it at all frame rates',()=>{
  const {levels,road,point,top}=setup(),ceiling=road.road.undersideAt(point,SECRET_ROAD_HEAD_CLEARANCE.radius);
  assert.ok(ceiling<top-.5);
  const visual=new THREE.Group(),material=new THREE.MeshBasicMaterial(),parts=createRabbitTraveler(visual,material,material,material);
  const animation=new RabbitAnimation(visual,parts.ears,parts.paws,parts.coat,parts.arms,parts.head);
  for(const fps of [30,60,144])for(const speed of [0,7]){
    animation.reset();animation.jump(12,speed);
    for(let i=0;i<Math.ceil(fps*.8);i++){
      animation.update(1/fps,{speed,height:2,velocity:12-i*20/fps,ceiling:SECRET_ROAD_HEAD_CLEARANCE.height-.12});visual.updateMatrixWorld(true);
      let earTop=-Infinity;
      for(const ear of parts.ears)ear.traverse(mesh=>{
        if(!mesh.isMesh)return;
        const positions=mesh.geometry.attributes.position,vertex=new THREE.Vector3();
        for(let j=0;j<positions.count;j++){vertex.fromBufferAttribute(positions,j).applyMatrix4(mesh.matrixWorld);earTop=Math.max(earTop,vertex.y+.12);}
      });
      assert.ok(earTop<SECRET_ROAD_HEAD_CLEARANCE.height);
      const hit=levels.enterFromBelow(point,ceiling-3,ceiling-.3,20,1/fps);
      assert.ok(hit?.blocked);assert.ok(hit.y+earTop<ceiling,'rendered ears stay below the underside');
    }
  }
  const nearEdge=point.clone().add(new THREE.Vector3(.5,0,0));
  assert.ok(road.road.undersideAt(nearEdge,.9)!==null);
});

test('soil debris starts underneath the impact, falls in world space and expires',()=>{
  const dirt=new SecretDirtParticles(new THREE.Scene(),{random:()=>.5}),point=new THREE.Vector3(3,40,6);
  dirt.burst(point);dirt.updateDirt(.02);assert.equal(dirt.mesh.count,13);
  const p=dirt.particles[0],before=p.position.clone();assert.ok(before.y<point.y-.6);assert.ok(p.velocity.y<0);
  dirt.updateDirt(.1);assert.ok(p.position.y<before.y);assert.ok(p.velocity.y<-2);
  for(let i=0;i<60;i++)dirt.updateDirt(1/60);
  assert.equal(dirt.mesh.count,0);dirt.burst(point);dirt.clear();assert.equal(dirt.mesh.count,0);dirt.dispose();
});

test('ear contact curls the tips, keeps the bases fixed and softly releases/reset',()=>{
  const visual=new THREE.Group(),material=new THREE.MeshBasicMaterial(),parts=createRabbitTraveler(visual,material,material,material);
  const animation=new RabbitAnimation(visual,parts.ears,parts.paws,parts.coat,parts.arms,parts.head);
  const frame=dt=>animation.update(dt,{speed:0,height:1,velocity:-2});
  animation.ceilingBump();frame(.04);
  const bend=animation.earBends[0],position=bend.mesh.geometry.attributes.position;
  assert.ok(bend.angle>.5);
  let movedTip=false;
  for(let i=0;i<position.count;i++){
    const along=bend.rest[i*3+1]*bend.mesh.scale.y+bend.mesh.position.y;
    if(along<0)assert.ok(Math.abs(position.getY(i)-bend.rest[i*3+1])<1e-6);
    if(along>.3&&Math.abs(position.getZ(i)-bend.rest[i*3+2])>.1)movedTip=true;
  }
  assert.ok(movedTip);assert.equal(visual.position.x,0);
  for(let i=0;i<90;i++)frame(1/60);
  assert.equal(bend.angle,0);
  animation.ceilingBump();frame(.04);animation.reset();
  assert.equal(animation.earContactAge,1);assert.equal(bend.angle,0);
  assert.deepEqual(Array.from(position.array),Array.from(bend.rest));
});
