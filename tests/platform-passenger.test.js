import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gaps,END,route,shelfInnerRadius,SHELF_OUTER_RADIUS} from '../src/game.js';
import {ThreatType,createThreats,platformPassenger,carryPlatformPassenger,platformTravel,updateThreats,hasShelfSupport} from '../src/threats.js';
test('the start has an exposed left edge rather than an invisible support wall',()=>{
  const threats=createThreats(gaps,END);
  assert.ok(hasShelfSupport(threats,-.4,0));assert.ok(!hasShelfSupport(threats,-.8,0));
});
test('each shelf retracts by half its own randomized radial length',()=>{
  const threats=createThreats(gaps,END);updateThreats(threats,5.5);
  for(const t of threats.filter(t=>t.type===ThreatType.MOVING_PLATFORM)){
    assert.equal(platformTravel(t.s),(SHELF_OUTER_RADIUS-shelfInnerRadius(t.s))*.5);assert.equal(t.offset,-platformTravel(t.s));
  }
});
test('grounded passenger follows the full world translation and returns without drift',()=>{
  for(const fps of [25,60,144]){
    const threats=createThreats(gaps,END),platform=threats.find(t=>t.type===ThreatType.MOVING_PLATFORM);
    let s=platform.s+.15,lane=0;const start=route(s,lane);
    for(let i=0;i<fps*7;i++){
      const rider=platformPassenger(threats,s,lane,0);assert.equal(rider,platform);
      const offset=platform.offset;updateThreats(threats,(i+1)/fps);
      const moved=carryPlatformPassenger(platform,s,lane,offset);s=moved.s;lane=moved.lane;
      assert.ok(hasShelfSupport(threats,s,lane));
    }
    const end=route(s,lane);assert.ok(Math.hypot(end.x-start.x,end.z-start.z)<1e-9);
    assert.equal(platformPassenger(threats,s,lane,.2),null);assert.equal(platformPassenger(threats,s,lane,0,true),null);
  }
});
