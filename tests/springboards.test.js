import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Springboards,bounceVelocity} from '../src/springboards.js';
import {Abilities,AbilityType} from '../src/abilities.js';
test('holding jump boosts rebound and jump upgrades apply to both heights',()=>{
  assert.ok(bounceVelocity(true)>bounceVelocity(false));
  assert.equal(bounceVelocity(true,1.15),bounceVelocity(true)*1.15);
});
test('springboards trigger only on contact and cannot repeat in one frame',()=>{
  const pads=new Springboards(new THREE.Scene(),[]),pad=pads.items[0];assert.ok(pad);
  assert.equal(pads.contact(pad.s,0,.5,-2),null);
  assert.equal(pads.contact(pad.s,0,0,2),null);
  assert.equal(pads.contact(pad.s,0,0,0),pad);
  assert.equal(pads.contact(pad.s,0,0,0),null);
  pads.update(.6,1);assert.equal(pads.contact(pad.s,0,0,0),pad);
  pads.reset();assert.equal(pad.cooldown,0);
});
test('air jump identifies the acrobatic move and rebound restores it',()=>{
  const abilities=new Abilities({doubleJump:true});
  assert.equal(abilities.use(AbilityType.JUMP).airJump,false);abilities.advance(.2);
  assert.equal(abilities.use(AbilityType.JUMP,{height:1}).airJump,true);abilities.advance(.2);
  assert.equal(abilities.use(AbilityType.JUMP,{height:1}),null);
  abilities.land();assert.equal(abilities.use(AbilityType.JUMP,{height:1}).airJump,true);
});
