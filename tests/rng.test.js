import {RandomStream,RandomManager,seedFromURL,createVisualRandom,visualSample} from '../src/random-manager.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {rollChestLoot} from '../src/run-loot.js';
import {nextRunURL} from '../src/run-navigation.js';
import {buildFloorLayout,FLOOR_CONFIG} from '../src/floor-config.js';

test('xorshift32 fixed reference vector and valid zero master seed',()=>{
 const r=new RandomStream('reference').restore({state:1,calls:0});
 assert.deepEqual(Array.from({length:3},()=>r.nextUint32()),[270369,67634689,2647435461]);
 const zero=new RandomManager(0);assert.ok(zero.stream('loot').nextUint32()>0);
});
test('named streams and structured object identities do not depend on access order',()=>{
 const a=new RandomManager('run'),b=new RandomManager('run');
 const expected=Array.from({length:30},()=>a.stream('loot').int(0,9));
 for(let i=0;i<1000;i++)b.stream('combat').float();
 assert.deepEqual(Array.from({length:30},()=>b.stream('loot').int(0,9)),expected);
 assert.notEqual(a.sample('floor:1','loot'),a.sample('floor','1:loot'));
 assert.notEqual(a.sample('loot'),new RandomManager('other-run').sample('loot'));
});
test('integer draws reject incomplete buckets, include both ends and floats stay below one',()=>{
 const r=new RandomStream('bounds');let raw=[0xffffffff,1,2];r.nextUint32=()=>raw.shift();
 assert.equal(r.int(3,4),3);assert.equal(r.int(3,4),4);
 raw=[1,0xffffffff];assert.equal(r.float(),0);assert.ok(r.float()<1);
 assert.throws(()=>r.int(6,3),RangeError);assert.throws(()=>r.int(0,2**32),RangeError);
 assert.throws(()=>r.chance(1.1),RangeError);assert.throws(()=>r.pick([]),RangeError);
});
test('snapshot resumes all sequences and reset preserves existing stream references',()=>{
 const a=new RandomManager('save'),loot=a.stream('loot');loot.float();a.stream('combat').float();
 const saved=JSON.parse(JSON.stringify(a.snapshot()));
 const expected=Array.from({length:10},()=>[loot.int(1,100),a.stream('combat').float()]);
 const b=new RandomManager('save').restore(saved);
 assert.deepEqual(Array.from({length:10},()=>[b.stream('loot').int(1,100),b.stream('combat').float()]),expected);
 a.restore(saved);assert.equal(a.stream('loot'),loot);assert.deepEqual([loot.int(1,100),a.stream('combat').float()],expected[0]);
 a.reset();assert.equal(loot.float(),new RandomManager('save').stream('loot').float());
 assert.throws(()=>a.restore({...saved,version:999}),/Incompatible/);
 assert.throws(()=>a.restore({...saved,streams:[{key:'["loot"]',state:0,calls:0}]}),/Invalid/);
});
test('shuffle is a permutation and inclusive chest range covers 3..6 without pool escapes',()=>{
 const a=new RandomManager('loot-tests'),counts=new Set();
 assert.deepEqual(a.create('shuffle').shuffle([1,2,3,4,5]).sort(),[1,2,3,4,5]);
 for(let i=0;i<200;i++){
  const gems=rollChestLoot(a,'floor',i,[3,6],5);counts.add(gems.length);
  assert.ok(gems.every(n=>n>=0&&n<5));
 }
 assert.deepEqual([...counts].sort(),[3,4,5,6]);
 const expected=rollChestLoot(a,'floor',20,[3,6],5);
 rollChestLoot(a,'floor',4,[3,6],5);for(let i=0;i<1000;i++)Math.random();
 assert.deepEqual(rollChestLoot(a,'floor',20,[3,6],5),expected);
});
test('graphics use ordinary random independently of gameplay streams',()=>{
 const original=Math.random;let value=.1;
 try{Math.random=()=>value;const random=createVisualRandom('ignored');assert.equal(random(),.1);value=.9;assert.equal(random(),.9);assert.equal(visualSample('same',1),.9);}
 finally{Math.random=original;}
});
test('seeded URL repeats the seed and next run requests a fresh seed',()=>{
 const href='https://example.com/game/?seed=REPLAY&sound=off#play';
 assert.equal(seedFromURL(href),'REPLAY');const next=new URL(nextRunURL(href,123));
 assert.equal(next.searchParams.has('seed'),false);assert.equal(next.searchParams.get('sound'),'off');assert.equal(next.hash,'#play');
 assert.notEqual(seedFromURL(next.href),seedFromURL(next.href));
});
test('layout is repeatable, independent of cosmetic draws, and safe across 200 seeds',()=>{
 const baseline=buildFloorLayout(FLOOR_CONFIG,0,'layout-test');
 for(let i=0;i<300;i++)Math.random();
 assert.deepEqual(buildFloorLayout(FLOOR_CONFIG,0,'layout-test'),baseline);
 assert.deepEqual(buildFloorLayout(FLOOR_CONFIG,2,'layout-test').slice(0,baseline.length),baseline);
 let different=false;
 for(let i=0;i<200;i++){
  const floors=buildFloorLayout(FLOOR_CONFIG,0,'seed-'+i);
  different ||= JSON.stringify(floors)!==JSON.stringify(baseline);
  for(const floor of floors){
   assert.equal(floor.placements.windows.length,3);
   const positions=Object.values(floor.placements).flat().map(o=>o.offset);
   assert.equal(new Set(positions).size,positions.length);
   assert.ok(positions.every(p=>!floor.holes.includes(p)));
  }
 }
 assert.ok(different);
});
