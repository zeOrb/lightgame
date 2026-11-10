import { test } from 'node:test';
import assert from 'node:assert/strict';
import { END, floorAt, depthLight, canStomp } from '../src/game.js';
test('route contains exactly twelve ordered floors and progressively loses daylight',()=>{
  const floors=new Set();let last=1;
  for(let s=0;s<=END;s++){
    floors.add(floorAt(s));const light=depthLight(s);assert.ok(light<=last);last=light;
  }
  assert.equal(floorAt(0),12);assert.equal(floorAt(END),1);assert.equal(floors.size,12);
  assert.equal(depthLight(0),1);assert.equal(depthLight(END),0);
});
test('only descending top contact stomps; side contact, ascent and separated lanes do not',()=>{
  assert.ok(canStomp(1.4,1.05,1.15,1.15,-3,true));
  assert.ok(!canStomp(.2,.2,1.15,1.15,-.3,true));
  assert.ok(!canStomp(1.4,1.05,1.15,1.15,3,true));
  assert.ok(!canStomp(1.4,1.05,1.15,1.15,-3,false));
  assert.ok(!canStomp(2,1.8,1.15,1.15,-3,true));
});
