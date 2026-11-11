import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Abilities,AbilityType,applyPhaseDelta,phaseHitsTarget} from '../src/abilities.js';
import * as THREE from 'three';
import {PhaseTrail} from '../src/phase-trail.js';
import {route,JUMP_SPEED} from '../src/game.js';
test('jump is a registered ability with grounded activation and shared reset',()=>{
  const a=new Abilities();assert.equal(a.use(AbilityType.JUMP,{height:1}),null);
  assert.equal(a.use(AbilityType.JUMP).velocity,JUMP_SPEED);assert.equal(a.use(AbilityType.JUMP),null);
  a.advance(.2);assert.ok(a.use(AbilityType.JUMP));a.reset();assert.equal(a.cooldowns.jump,0);
  assert.equal(a.use(AbilityType.PHASING,{falling:true}),null);
});
test('dash hits enemies between frame endpoints, but not above or beside the path',()=>{
  const from={x:0,y:1,z:0},to={x:4,y:1,z:0};
  assert.ok(phaseHitsTarget(from,to,{x:2,y:1,z:0}));
  assert.ok(phaseHitsTarget(from,to,{x:2,y:1,z:1}));
  assert.ok(!phaseHitsTarget(from,to,{x:2,y:1,z:1.15}));
  assert.ok(!phaseHitsTarget(from,to,{x:2,y:3,z:0}));
  assert.ok(!phaseHitsTarget(from,to,{x:2,y:1,z:2}));
});
test('trail samples retain the rabbit colour at emission and fade from the old end',()=>{
  const trail=new PhaseTrail(new THREE.Scene()),camera=new THREE.PerspectiveCamera();camera.position.set(0,3,5);
  const first=new THREE.Color('#e4ba78'),next=new THREE.Color('#a38cff');
  trail.update(0,new THREE.Vector3(),true,camera,first);
  trail.update(.1,new THREE.Vector3(1,0,0),true,camera,next);
  assert.ok(trail.samples[0].color.equals(first));assert.ok(trail.samples.at(-1).color.equals(next));
  assert.ok(trail.alphas[0]<trail.alphas[(trail.samples.length-1)*2]);
  trail.update(.4,new THREE.Vector3(1,0,0),false,camera,next);assert.equal(trail.mesh.visible,false);
});
test('phase captures direction, travels the requested distance at different FPS, and has a cooldown',()=>{
  for(const fps of [25,60,144]){
    const a=new Abilities(),direction={x:3,z:4};a.use(AbilityType.PHASING,{direction,distance:5.4});direction.x=-3;
    let x=0,z=0;for(let i=0;i<fps;i++){const d=a.advance(1/fps);if(d){x+=d.x;z+=d.z;}}
    assert.ok(Math.abs(x-3.24)<1e-9);assert.ok(Math.abs(z-4.32)<1e-9);
    assert.equal(a.phase,null);assert.equal(a.use(AbilityType.PHASING),null);
    a.advance(1);assert.ok(a.use(AbilityType.PHASING));a.reset();assert.equal(a.phase,null);
  }
});
test('world-space phase translation stays continuous across spiral turns',()=>{
  for(const s of [-.5,0,27.9,56,139.5]){
    const before=route(s,.3),delta={x:1.8,z:-3};const moved=applyPhaseDelta(s,.3,delta),after=route(moved.s,moved.lane);
    assert.ok(Math.abs(after.x-before.x-delta.x)<1e-9);assert.ok(Math.abs(after.z-before.z-delta.z)<1e-9);
  }
});
