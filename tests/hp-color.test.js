import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hpBrightness } from '../src/game.js';

test('HP color preserves full light, turns black at zero and darkens sharply below half HP',()=>{
  assert.equal(hpBrightness(100),1);assert.equal(hpBrightness(0),0);
  assert.equal(hpBrightness(-5),0);assert.equal(hpBrightness(110),1);
  assert.ok(hpBrightness(75)>.9);
  assert.ok(hpBrightness(50)>.3&&hpBrightness(50)<.4);
  assert.ok(hpBrightness(25)<.02);
  for(let hp=1;hp<=100;hp++)assert.ok(hpBrightness(hp)>hpBrightness(hp-1));
});
