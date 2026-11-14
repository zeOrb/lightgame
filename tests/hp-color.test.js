import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hpBrightness } from '../src/game.js';

test('rabbit stays white through 20 percent light and smoothly becomes shadow below it',()=>{
  assert.equal(hpBrightness(100),1);assert.equal(hpBrightness(0),0);
  assert.equal(hpBrightness(-5),0);assert.equal(hpBrightness(110),1);
  for(let hp=20;hp<=100;hp++)assert.equal(hpBrightness(hp),1);
  assert.equal(hpBrightness(10),.5);
  for(let hp=1;hp<=20;hp++)assert.ok(hpBrightness(hp)>hpBrightness(hp-1));
});
