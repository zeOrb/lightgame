import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {floorGateLayout,gateCrossed,FloorGates} from '../src/floor-gates.js';
import {END,gaps,FLOOR_COUNT} from '../src/game.js';
test('each floor ends in one gate on a real plank, including the final approach',()=>{
  const gates=floorGateLayout();assert.equal(gates.length,FLOOR_COUNT);
  for(const gate of gates){assert.ok(!gaps.includes(gate.plank));assert.equal(gate.plank%14,13);assert.ok(gateCrossed(gate,gate.s-.5,gate.s+.5,0,0));assert.ok(!gateCrossed(gate,gate.s+.5,gate.s-.5,0,0));assert.ok(!gateCrossed(gate,gate.s-.5,gate.s+.5,-5,-5));gate.passed=true;assert.ok(!gateCrossed(gate,gate.s-.5,gate.s+.5,0,0));}
  assert.ok(gates.at(-1).s<END-.1);
});
test('crossing a lamp lights its head, emits VFX at the transformed head and resets for replay',()=>{
  const gates=new FloorGates(new THREE.Scene(),new THREE.Texture(),[new THREE.Color('red'),new THREE.Color('cyan'),new THREE.Color('yellow')]);
  const lamp=gates.gates[0];lamp.group.rotation.y+=.7;lamp.group.position.x+=2;
  const s=gates.gates[0].s;assert.ok(gates.check(s-.2,s+.2,0,0));assert.ok(gates.burst.visible);
  assert.ok(gates.burst.position.distanceTo(lamp.halo.getWorldPosition(new THREE.Vector3()))<1e-7);
  gates.update(.5);assert.ok(gates.burst.visible);assert.ok(lamp.glass.material.emissiveIntensity>1);assert.ok(lamp.halo.material.opacity>.4);gates.update(.49);assert.ok(gates.burst.visible);gates.update(.01);assert.equal(gates.burst.visible,false);
  assert.equal(gates.check(s-.2,s+.2,0,0),null);gates.reset();assert.equal(lamp.glass.material.emissiveIntensity,0);assert.equal(lamp.halo.material.opacity,0);assert.equal(gates.shake,0);assert.ok(gates.check(s-.2,s+.2,0,0));
});

test('a fast swept crossing ignites the lamp once even when one frame skips past it',()=>{
 const gates=new FloorGates(new THREE.Scene(),new THREE.Texture(),[new THREE.Color('gold')]);const lamp=gates.gates[0];
 assert.equal(gates.check(lamp.s-1.5,lamp.s+1.5,0,.3),lamp);assert.equal(lamp.passed,true);assert.equal(gates.check(lamp.s-1.5,lamp.s+1.5,0,.3),null);
});
