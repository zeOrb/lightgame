import test from 'node:test';
import assert from 'node:assert/strict';
import {threatsCanNeighbor} from '../src/threat-adjacency.js';
import {FLOOR_CONFIG,buildFloorLayout} from '../src/floor-config.js';

function config(){
  const source=structuredClone(FLOOR_CONFIG);
  source.baseFloors=1;source.floors=[{}];source.defaults.secret.enabled=false;
  for(const key of ['windows','loot','enemies','shadows','chests','bottles','books','springboards'])source.defaults[key]={mode:'generated',count:0};
  source.defaults.steps.holes.count=0;
  return source;
}
test('adjacency exclusions are symmetric and only affect listed pairs',()=>{
  assert.equal(threatsCanNeighbor('hole','hole'),false);
  assert.equal(threatsCanNeighbor('hole','shadow'),true);
  const rules={shadow:{cannotNeighbor:['thorns']}};
  assert.equal(threatsCanNeighbor('shadow','thorns',rules),false);
  assert.equal(threatsCanNeighbor('thorns','shadow',rules),false);
});
test('generated holes obey adjacency and impossible counts are corrected with a warning',()=>{
  const source=config();source.defaults.threats={mode:'generated',count:5,pool:['hole']};
  for(let seed=0;seed<50;seed++){
    const floor=buildFloorLayout(source,0,String(seed))[0];
    assert.ok(floor.holes.length>0&&floor.holes.length<5);
    assert.ok(floor.holes.every((offset,i)=>i===0||offset-floor.holes[i-1]>1));
    assert.ok(floor.placementWarnings.some(w=>w.code==='threat-count-adjusted'&&w.fromCount===5&&w.toCount===floor.holes.length));
  }
});
test('adjacent authored holes move apart and report the correction without editing JSON',()=>{
  const source=config();source.defaults.threats={mode:'explicit',items:[{id:'hole',offset:4},{id:'hole',offset:5},{id:'shadow',offset:8}]};
  const before=structuredClone(source),floor=buildFloorLayout(source)[0];
  assert.ok(floor.holes[1]-floor.holes[0]>1);
  assert.ok(floor.placementWarnings.some(w=>w.code==='authored-placement-adjusted'&&w.category==='threats'));
  assert.deepEqual(source,before);
});
