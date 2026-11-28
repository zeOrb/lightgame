import test from 'node:test';
import assert from 'node:assert/strict';
import {RandomStream} from '../src/random-manager.js';
import {resolveThreatPreset,validateThreatPresets} from '../src/threat-presets.js';
import {buildFloorLayout,FLOOR_CONFIG} from '../src/floor-config.js';

test('weighted draws respect boundaries, zero weights and invalid pools',()=>{
  const rng=new RandomStream('weights'),pool=[{id:'disabled',weight:0},{id:'a',weight:3},{id:'b',weight:1}];
  rng.float=()=>0;assert.equal(rng.weightedPick(pool),'a');
  rng.float=()=>.749;assert.equal(rng.weightedPick(pool),'a');
  rng.float=()=>.75;assert.equal(rng.weightedPick(pool),'b');
  for(const weights of [[],[{id:'a',weight:0}],[{id:'a',weight:-1}],[{id:'a',weight:Infinity}]])assert.throws(()=>rng.weightedPick(weights),/RNG/);
});

test('preset pools resolve both weighted levels and reject invalid references',()=>{
  const source={version:1,presets:{
    quiet:{count:0,pool:[]},
    danger:{count:[2,3],pool:[{id:'shadow',weight:3},{id:'hole',weight:1}]}
  },pools:{test:[{id:'quiet',weight:1},{id:'danger',weight:3}]}};
  validateThreatPresets(source);
  const rng=new RandomStream('preset');rng.float=()=>.5;
  const resolved=resolveThreatPreset({presetPool:'test'},rng,source);
  assert.equal(resolved.presetId,'danger');
  assert.deepEqual(resolved.count,[2,3]);
  assert.deepEqual(resolved.weights,{shadow:3,hole:1});
  assert.equal(resolveThreatPreset({preset:'quiet'},rng,source).count,0);
  assert.throws(()=>resolveThreatPreset({presetPool:'unknown'},rng,source),/unknown/);
  assert.throws(()=>resolveThreatPreset({preset:'unknown'},rng,source),/unknown/);
  source.presets.danger.pool[0].id='unknown';
  assert.throws(()=>validateThreatPresets(source),/invalid/);
});

test('floor preset selection is seeded, inherited, replaceable and does not mutate source',()=>{
  const config=structuredClone(FLOOR_CONFIG);
  config.defaults.threats={presetPool:'varied'};
  config.floors[0].threats={preset:'none'};
  config.floors[1].threats={preset:'mechanisms'};
  const before=structuredClone(config),found=new Set();
  for(let seed=0;seed<40;seed++){
    const floors=buildFloorLayout(config,0,String(seed));
    assert.deepEqual(buildFloorLayout(config,0,String(seed)),floors);
    assert.equal(floors[0].placements.threats.length,0);
    assert.equal(floors[1].threats.presetId,'mechanisms');
    assert.ok(floors[1].placements.threats.every(item=>['pendulum','ink-wave','thorns'].includes(item.id)));
    for(const floor of floors.slice(2))found.add(floor.threats.presetId);
  }
  assert.deepEqual(found,new Set(['mixed','mechanisms','gaps-and-shadows']));
  assert.deepEqual(config,before);
});
