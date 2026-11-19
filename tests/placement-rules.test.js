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
test('authored conflicts are repaired nearby, reported, and can be disabled per floor',()=>{
 const c=empty();c.floors[0]={windows:{mode:'explicit',items:[{offset:2,width:4},{offset:3,width:5}]}};
 const original=structuredClone(c),f=buildFloorLayout(c)[0];
 assert.deepEqual(f.placements.windows.map(p=>p.offset),[2,4]);assert.equal(f.placements.windows[1].width,5);
 assert.deepEqual(f.placementWarnings,[{code:'authored-placement-adjusted',floorId:'floor-1',category:'windows',index:1,fromOffset:3,toOffset:4}]);
 assert.equal(f.placements.windows[1].s,f.start+4);assert.deepEqual(c,original);
 c.floors[0].placementRules=[];const disabled=buildFloorLayout(c)[0];
 assert.deepEqual(disabled.placements.windows.map(p=>p.offset),[2,3]);assert.deepEqual(disabled.placementWarnings,[]);
 c.floors[0].placementRules=[{between:['windows','windows'],minDistance:3}];
 assert.deepEqual(buildFloorLayout(c)[0].placements.windows.map(p=>p.offset),[2,5]);
});
test('repair avoids holes and reserved sections and generation uses corrected reservations',()=>{
 const c=empty();c.floors[0]={steps:{mode:'explicit',items:[1,2,3,5,6,7,8,9,10,11,12,13]},secret:{enabled:true,offset:5},windows:{mode:'explicit',items:[2,3]},chests:{count:3}};
 const a=buildFloorLayout(c,0,'repair'),b=buildFloorLayout(c,0,'repair');assert.deepEqual(a,b);
 const f=a[0];assert.deepEqual(f.placements.windows.map(p=>p.offset),[2,6]);
 assert.ok(f.placements.chests.every(p=>p.offset!==2&&p.offset!==6&&p.offset!==4&&p.offset!==5));
});
test('repair also corrects authored cross-category conflicts and rejects impossible repairs',()=>{
 const c=empty();c.defaults.placementRules=[{between:['windows','chests'],minDistance:3}];
 c.floors[0]={windows:{mode:'explicit',items:[5]},chests:{mode:'explicit',items:[{offset:6,id:'chest-data'}]}};
 const f=buildFloorLayout(c)[0];assert.equal(f.placements.chests[0].offset,8);assert.equal(f.placements.chests[0].id,'chest-data');
 c.floors[0]={steps:{count:4,mode:'explicit',items:[0,3]},windows:{mode:'explicit',items:[0]},chests:{mode:'explicit',items:[0]}};
 assert.throws(()=>buildFloorLayout(c),/cannot repair authored placementRules/);
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
