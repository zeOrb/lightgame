import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {floorGateLayout,gateCrossed,FloorGates} from '../src/floor-gates.js';
import {END,gaps} from '../src/game.js';
test('each floor ends in one gate on a real plank, including the final approach',()=>{
  const gates=floorGateLayout();assert.equal(gates.length,12);
  for(const gate of gates){assert.ok(!gaps.includes(gate.plank));assert.equal(gate.plank%14,13);assert.ok(gateCrossed(gate,gate.s-.5,gate.s+.5,0,0));assert.ok(!gateCrossed(gate,gate.s+.5,gate.s-.5,0,0));assert.ok(!gateCrossed(gate,gate.s-.5,gate.s+.5,-5,-5));gate.passed=true;assert.ok(!gateCrossed(gate,gate.s-.5,gate.s+.5,0,0));}
  assert.ok(gates.at(-1).s<END-.1);
});
test('crossing a carved gate emits one second of rainbow VFX and resets for replay',()=>{
  const gates=new FloorGates(new THREE.Scene(),new THREE.Texture(),[new THREE.Color('red'),new THREE.Color('cyan'),new THREE.Color('yellow')]);
  const s=gates.gates[0].s;assert.ok(gates.check(s-.2,s+.2,0,0));assert.ok(gates.burst.visible);
  gates.update(.5);assert.ok(gates.burst.visible);gates.update(.49);assert.ok(gates.burst.visible);gates.update(.01);assert.equal(gates.burst.visible,false);
  assert.equal(gates.check(s-.2,s+.2,0,0),null);gates.reset();assert.ok(gates.check(s-.2,s+.2,0,0));
});
