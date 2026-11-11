import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gaps, END } from '../src/game.js';
import { ThreatType,createThreats,platformMotion,platformTravel,updateThreats,unsupportedThreat,movingPlatformSupports } from '../src/threats.js';

test('threat registry contains holes and platforms while respecting reserved shelves and gaps',()=>{
  const threats=createThreats(gaps,END,new Set([12]));
  assert.equal(threats.filter(t=>t.type===ThreatType.HOLE).length,gaps.length);
  const moving=threats.filter(t=>t.type===ThreatType.MOVING_PLATFORM);assert.ok(moving.length>0);
  assert.ok(!moving.some(t=>t.s===12));
  for(const t of moving)assert.ok(gaps.every(g=>Math.abs(g-t.s)>=3));
});
test('platform warns, slides inward every five seconds, then returns',()=>{
  assert.equal(platformMotion(0).offset,0);assert.ok(platformMotion(4.5).warning);
  assert.equal(platformMotion(5.5).offset,-platformTravel(0));assert.equal(platformMotion(6.5).offset,0);
  for(const t of [5.1,5.5,6.2,8,9.5]){
    const a=platformMotion(t),b=platformMotion(t+5);
    assert.ok(Math.abs(a.offset-b.offset)<1e-10);assert.equal(a.warning,b.warning);assert.equal(a.moving,b.moving);
  }
});
test('moving platform supports the inner lane but can leave the outer lane unsupported',()=>{
  const threats=createThreats(gaps,END),platform=threats.find(t=>t.type===ThreatType.MOVING_PLATFORM);
  updateThreats(threats,0);assert.ok(movingPlatformSupports(platform,platform.s,1.8));
  updateThreats(threats,5.5);
  assert.ok(movingPlatformSupports(platform,platform.s,-1.8));
  assert.equal(unsupportedThreat(threats,platform.s,1.8),platform);
  assert.equal(unsupportedThreat(threats,gaps[0],0).type,ThreatType.HOLE);
  updateThreats(threats,0);assert.equal(unsupportedThreat(threats,platform.s,1.8),null);
});
