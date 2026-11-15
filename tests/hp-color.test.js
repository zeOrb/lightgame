import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hpBrightness,SHADOW_LIGHT_THRESHOLD } from '../src/game.js';

test('rabbit stays white above the configured shadow threshold and smoothly darkens below it',()=>{
  assert.equal(hpBrightness(100),1);assert.equal(hpBrightness(0),0);
  assert.equal(hpBrightness(-5),0);assert.equal(hpBrightness(110),1);
  for(let hp=SHADOW_LIGHT_THRESHOLD;hp<=100;hp++)assert.equal(hpBrightness(hp),1);
  assert.equal(hpBrightness(SHADOW_LIGHT_THRESHOLD/2),.5);
  for(let hp=1;hp<=SHADOW_LIGHT_THRESHOLD;hp++)assert.ok(hpBrightness(hp)>hpBrightness(hp-1));
});
