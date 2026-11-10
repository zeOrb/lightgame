import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VitralGlow } from '../src/vitral-glow.js';

test('window glow uses the window palette and disappears exactly one second after exit',()=>{
  const glow=new VitralGlow(new THREE.Group(),new THREE.Texture());
  const zone={palette:[new THREE.Color('red'),new THREE.Color('blue'),new THREE.Color('gold')]};
  glow.update(1/60,zone,1,0);assert.equal(glow.strength,1);assert.equal(glow.palette,zone.palette);assert.ok(glow.group.visible);
  assert.ok(glow.rays[0].ray.material.color.equals(zone.palette[0]));
  glow.update(.5,null,1,.5);assert.equal(glow.strength,.5);assert.ok(glow.group.visible);
  glow.update(.5,null,1,1);assert.equal(glow.strength,0);assert.equal(glow.group.visible,false);
  glow.update(.1,zone,0,2);assert.equal(glow.group.visible,false,'zero HP cannot emit colored light');
  glow.reset();assert.equal(glow.strength,0);
});
