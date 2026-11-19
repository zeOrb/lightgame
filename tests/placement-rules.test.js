import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOOR_CONFIG,buildFloorLayout} from '../src/floor-config.js';
const empty=()=>{
 const c=structuredClone(FLOOR_CONFIG);c.baseFloors=1;c.floors=[{id:'test'}];
 for(const key of ['windows','loot','enemies','shadows','chests','bottles','books','springboards','threats'])c.defaults[key]={mode:'generated',count:0};
 c.defaults.steps.holes.count=0;c.defaults.secret.enabled=false;return c;
};
const separated=(a,b,d)=>a.every(x=>b.every(y=>x===y||Math.abs(x.offset-y.offset)>=d));
test('default windows never occupy adjacent steps across 200 seeds',()=>{
 for(let i=0;i<200;i++)for(const floor of buildFloorLayout(FLOOR_CONFIG,0,'spacing-'+i)){
  const w=floor.placements.windows;assert.equal(w.length,3);assert.ok(separated(w,w,2));
 }
});
test('search finds a tight valid arrangement instead of getting stuck on random greedy choices',()=>{
 const c=empty();c.floors[0]={steps:{count:8},windows:{count:3}};
 for(let i=0;i<40;i++)assert.deepEqual(buildFloorLayout(c,0,'tight-'+i)[0].placements.windows.map(p=>p.offset),[1,3,5]);
 c.floors[0].windows.count=4;assert.throws(()=>buildFloorLayout(c),/no valid placement/);
});
test('rules apply symmetrically to generated and authored categories',()=>{
 const c=empty();c.defaults.placementRules=[{between:['windows','windows'],minDistance:2},{between:['windows','chests'],minDistance:3}];
 c.floors[0]={windows:{count:3},chests:{mode:'explicit',items:[5]}};
 for(let i=0;i<60;i++){
  const f=buildFloorLayout(c,0,'cross-'+i)[0];assert.ok(separated(f.placements.windows,f.placements.chests,3));
 }
 c.floors[0]={windows:{mode:'explicit',items:[5]},chests:{count:3}};
 const f=buildFloorLayout(c)[0];assert.ok(separated(f.placements.windows,f.placements.chests,3));
});
test('authored rule violations fail clearly and floor overrides can disable inherited rules',()=>{
 const c=empty();c.floors[0]={windows:{mode:'explicit',items:[2,3]}};
 assert.throws(()=>buildFloorLayout(c),/authored placements violate placementRules on floor-1/);
 c.floors[0].placementRules=[];assert.deepEqual(buildFloorLayout(c)[0].placements.windows.map(p=>p.offset),[2,3]);
 c.floors[0].placementRules=[{between:['windows','windows'],minDistance:3}];
 c.floors[0].windows.items=[2,4];assert.throws(()=>buildFloorLayout(c),/violate/);
});
test('invalid rule definitions are rejected before placement',()=>{
 for(const bad of [null,{},[{between:['window','windows'],minDistance:2}],[{between:['windows'],minDistance:2}],[{between:['windows','windows'],minDistance:1.5}],[{between:['windows','windows'],minDistance:0}]]){
  const c=empty();c.floors[0].placementRules=bad;assert.throws(()=>buildFloorLayout(c),/placement rule|placementRules/);
 }
});
test('constraints preserve seeded reproducibility and do not mutate the configuration',()=>{
 const c=empty();c.floors[0]={windows:{count:3},chests:{count:2}};const before=structuredClone(c);
 assert.deepEqual(buildFloorLayout(c,0,'repeat'),buildFloorLayout(c,0,'repeat'));assert.deepEqual(c,before);
});
