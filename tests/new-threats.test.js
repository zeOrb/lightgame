import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gaps,END} from '../src/game.js';
import {ThreatType,ThreatInfo,createThreats,threatState,threatHits,consumeThreatHit,resetThreats,updateThreats} from '../src/threats.js';
import {ThreatVisuals} from '../src/threat-visuals.js';

test('all three new threats have safe, separated placements outside reserved shelves',()=>{
  const reserved=new Set(Array.from({length:END},(_,s)=>s).filter(s=>(s>4&&s%5===0)||(s>6&&s%11===0)||(s>12&&s%28===16)||(s>20&&s%29===23)||(s>10&&s%27===13)));
  const threats=createThreats(gaps,END,reserved);
  for(const type of Object.keys(ThreatInfo))assert.ok(threats.filter(t=>t.type===type).length>=2);
  for(const threat of threats.filter(t=>ThreatInfo[t.type])){
    assert.ok(!reserved.has(threat.s));assert.ok(threat.s>8&&threat.s<END-3);
    for(const other of threats)if(other!==threat)assert.ok(Math.abs(other.s-threat.s)>=3);
  }
});
test('bell collision follows its swing, wave can be jumped, thorns have a safe lane',()=>{
  const bell={type:ThreatType.PENDULUM,s:26,phase:0,...threatState({type:ThreatType.PENDULUM,phase:0},0)};
  assert.ok(threatHits(bell,{s:26,lane:0,height:0}));
  assert.ok(!threatHits(bell,{s:26,lane:1.5,height:0}));
  Object.assign(bell,threatState(bell,.9));assert.ok(!threatHits(bell,{s:26,lane:0,height:0}));
  const wave={type:ThreatType.INK_WAVE,s:41,phase:0,...threatState({type:ThreatType.INK_WAVE,phase:0},3.7)};
  assert.ok(threatHits(wave,{s:41,lane:wave.radius,height:0}));
  assert.ok(!threatHits(wave,{s:41,lane:wave.radius,height:.9}));
  const thorns={type:ThreatType.THORNS,s:53,lane:.95,phase:0,...threatState({type:ThreatType.THORNS,phase:0},3.2)};
  assert.ok(threatHits(thorns,{s:53,lane:.95,height:0}));
  assert.ok(!threatHits(thorns,{s:53,lane:-.95,height:0}));
  assert.ok(!threatHits(thorns,{s:53,lane:.95,height:1.2}));
  Object.assign(thorns,threatState(thorns,2.3));assert.ok(thorns.warning);assert.ok(!threatHits(thorns,{s:53,lane:.95,height:0}));
});
test('new hits are rate-limited and restarting clears collision history',()=>{
  const threat={type:ThreatType.THORNS,s:53,lane:.95,phase:0};
  const player={s:53,lane:.95,height:0};updateThreats([threat],3.2);
  assert.equal(consumeThreatHit([threat],player,3.2),threat);
  assert.equal(consumeThreatHit([threat],player,3.3),null);
  resetThreats([threat]);assert.equal(threat.lastHit,-Infinity);assert.equal(threat.active,false);
  updateThreats([threat],3.2);assert.equal(consumeThreatHit([threat],player,3.2),threat);
});
test('new visual objects follow collision state through warnings, attacks and reset',()=>{
  const scene=new THREE.Scene(),threats=createThreats(gaps,END);
  const visuals=new ThreatVisuals(scene,threats);
  for(const time of [0,2.3,3.2,3.7,4.1,5.5,8.9]){
    updateThreats(threats,time);visuals.update(time);scene.updateMatrixWorld(true);
    for(const item of visuals.items){
      assert.ok(item.group.matrixWorld.elements.every(Number.isFinite));
      if(item.pivot)assert.equal(item.pivot.rotation.z,item.threat.swing);
      if(item.wave)assert.equal(item.wave.visible,item.threat.active);
      if(item.spikes)assert.equal(item.spikes.position.y,-.43+item.threat.rise*.92);
    }
  }
  resetThreats(threats);visuals.update(0);
});
