import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gaps,END,shelfInnerRadius,SHELF_OUTER_RADIUS} from '../src/game.js';
import {createThreats,hasShelfSupport,ThreatType,updateThreats} from '../src/threats.js';
import {RabbitState} from '../src/rabbit-state.js';
test('ordinary shelves support the playable centre but not either exposed edge',()=>{
  const threats=createThreats(gaps,END);
  for(const s of [0,4,8,23,45,99,END]){
    assert.ok(hasShelfSupport(threats,s,0));
    assert.ok(!hasShelfSupport(threats,s,SHELF_OUTER_RADIUS-12+.1));
    assert.ok(!hasShelfSupport(threats,s,shelfInnerRadius(s)-12-.1));
  }
  for(const s of gaps)assert.ok(!hasShelfSupport(threats,s,0));
});
test('overlapping steps remain supported, retracted platforms lose the outer lane',()=>{
  const threats=createThreats(gaps,END),platform=threats.find(t=>t.type===ThreatType.MOVING_PLATFORM);
  for(let s=0;s<8;s+=.03)assert.ok(hasShelfSupport(threats,s,0));
  assert.ok(hasShelfSupport(threats,platform.s,1.8));updateThreats(threats,5.5);
  assert.ok(!hasShelfSupport(threats,platform.s,1.8));assert.ok(hasShelfSupport(threats,platform.s,-1.8));
});
test('accidental fall starts downward without a bell launch and preserves health',()=>{
  const rabbit=new RabbitState();rabbit.startFall({x:9,y:90,z:0},false,false);
  rabbit.updateFall(.1);assert.ok(rabbit.fall.y<90);assert.equal(rabbit.updateLight(42,.1,true),42);
});
