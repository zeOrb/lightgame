import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gaps,END,shelfInnerRadius,SHELF_OUTER_RADIUS,ROUTE_RADIUS} from '../src/game.js';
import {createThreats,hasShelfSupport,ThreatType,updateThreats} from '../src/threats.js';
import {RabbitState} from '../src/rabbit-state.js';
test('ordinary shelves support the playable centre but not either exposed edge',()=>{
  const threats=createThreats([],END);
  for(const s of [0,4,8,23,45,99,END]){
    assert.ok(hasShelfSupport(threats,s,0));
    assert.ok(!hasShelfSupport(threats,s,SHELF_OUTER_RADIUS-ROUTE_RADIUS+.1));
    assert.ok(!hasShelfSupport(threats,s,shelfInnerRadius(s)-ROUTE_RADIUS-.1));
  }
  const withGaps=createThreats(gaps,END);
  for(const s of gaps)assert.ok(!hasShelfSupport(withGaps,s,0));
});
test('overlapping steps remain supported, retracted platforms lose the outer lane',()=>{
  const threats=createThreats([],END),platform=threats.find(t=>t.type===ThreatType.MOVING_PLATFORM);
  for(let s=0;s<8;s+=.03)assert.ok(hasShelfSupport(threats,s,0));
  assert.ok(hasShelfSupport(threats,platform.s,1.8));updateThreats(threats,5.5);
  assert.ok(!hasShelfSupport(threats,platform.s,1.8));assert.ok(hasShelfSupport(threats,platform.s,-1.8));
});
test('accidental fall starts downward without a bell launch and preserves health',()=>{
  const rabbit=new RabbitState();rabbit.startFall({x:9,y:90,z:0},false,false);
  rabbit.updateFall(.1);assert.ok(rabbit.fall.y<90);assert.equal(rabbit.updateLight(42,.1,true),42);
});

test('a layout with a gap at a formerly hardcoded test position still has valid support elsewhere',()=>{
  const threats=createThreats([4],END);
  assert.equal(hasShelfSupport(threats,4,0),false);
  assert.equal(hasShelfSupport(threats,0,0),true);
  assert.equal(hasShelfSupport(threats,8,0),true);
});
