import {test} from 'node:test';
import assert from 'node:assert/strict';
import config from '../src/run-items.json' with {type:'json'};
import {RunItems} from '../src/run-items.js';
import {RandomManager} from '../src/random-manager.js';
import {BASE_STATS,RUN_UPGRADES,skillStats,progression,SKILLS,SkillProgression} from '../src/progression.js';
import {ChestRewardDispatcher,rollChestRewards} from '../src/chest-rewards.js';
const create=()=>{const model=new RunItems(config,new RandomManager('items-test'));model.reset({...BASE_STATS});return model;};
test('rarity sampling gives legendary offers in about one third of chests and Luck improves them',()=>{
  const model=create(),chances=[];
  for(const luck of [0,100]){let found=0;for(let i=0;i<4000;i++){model.reset({...BASE_STATS,dashEnabled:true,luck});model.request('balance:'+i);if(model.pending.options.some(id=>model.items.get(id).rarity==='legendary'))found++;assert.equal(new Set(model.pending.options).size,3);}chances.push(found/4000);}
  assert.ok(chances[0]>.30&&chances[0]<.37,JSON.stringify(chances));assert.ok(chances[1]>chances[0]+.20);
});
test('pool rarity and item weights exclude zero-weight rewards, invalid config fails early',()=>{
  const cfg=structuredClone(config);cfg.pools.starter.rarityWeights={common:1,uncommon:0,rare:0,legendary:0};cfg.pools.starter.itemWeights={'swift-thread':0};
  const model=new RunItems(cfg,new RandomManager('weights'));model.reset(BASE_STATS);model.request('weighted');assert.equal(model.pending.options.length,3);assert.ok(model.pending.options.every(id=>model.items.get(id).rarity==='common'&&id!=='swift-thread'));
  cfg.items[0].rarity='invalid';assert.throws(()=>new RunItems(cfg,new RandomManager('invalid')),/rarity/);
  cfg.items[0].rarity='common';cfg.pools.starter.rarityWeights.rare=-1;assert.throws(()=>new RunItems(cfg,new RandomManager('invalid')),/weight/);
});
test('five treasury Luck nodes require the previous node and accumulate to 100',()=>{
  const p=new SkillProgression();p.state.points=10000;assert.equal(p.buy('treasuryLuck1'),false);assert.ok(p.buy('treasurySource'));assert.equal(p.buy('treasuryLuck2'),false);
  for(let i=1;i<=5;i++){assert.ok(p.buy('treasuryLuck'+i));assert.equal(skillStats(p.state).luck,i*20);}
  assert.equal(SKILLS.filter(s=>s.branchId==='treasuryLuck').length,5);assert.equal(BASE_STATS.luck,0);
});
test('production runtime stats accept run modifiers while skill calculation remains immutable',()=>{
  const a=create(),base=skillStats(progression.state),before={...RUN_UPGRADES};a.reset(base);
  a.request('runtime');a.pending.options=['warm-core'];a.choose('warm-core');
  try{a.apply(RUN_UPGRADES);assert.equal(RUN_UPGRADES.maxHP,base.maxHP+20);assert.equal(skillStats(progression.state).maxHP,base.maxHP);}finally{Object.assign(RUN_UPGRADES,before);}
});
test('offers are deterministic, contain three unique items and spend only one run reroll',()=>{
  const a=create(),b=create();a.request('chest:12');b.request('chest:12');assert.deepEqual(a.pending,b.pending);assert.equal(new Set(a.pending.options).size,3);
  const old=[...a.pending.options];assert.ok(a.reroll());assert.equal(a.rerolls,0);assert.ok(a.pending.options.every(id=>!old.includes(id)));const next=[...a.pending.options];assert.equal(a.reroll(),false);assert.deepEqual(a.pending.options,next);
  assert.equal(a.request('chest:12'),false);assert.equal(a.choose('nonexistent'),null);assert.equal(a.stacks.size,0);
});
test('duplicate items stack over skill stats, reset restores the run and never mutates base progression',()=>{
  const a=create(),base={...BASE_STATS,speed:1.5},target={...base};a.reset(base);
  for(let i=0;i<2;i++){a.request('chest:'+i);a.pending.options=['swift-thread'];assert.ok(a.choose('swift-thread'));}
  a.apply(target);assert.ok(Math.abs(target.speed-1.5*1.1**2)<1e-10);assert.equal(base.speed,1.5);assert.equal(a.stacks.get('swift-thread'),2);
  assert.equal(a.choose('swift-thread'),null);a.reset(base);a.apply(target);assert.equal(target.speed,1.5);assert.equal(a.rerolls,1);assert.equal(a.pending,null);assert.equal(a.stacks.size,0);
});
test('locked pools and items are filtered, queued chests resolve once in order',()=>{
  const a=create();assert.deepEqual(a.eligible(['wayfarer']),[]);assert.throws(()=>a.request('locked',['wayfarer']),/unlocked/);
  a.reset(BASE_STATS,['pool.wayfarer']);a.request('first',['wayfarer']);a.request('second');assert.equal(a.pending.source,'first');assert.ok(a.pending.options.every(id=>config.pools.wayfarer.items.includes(id)));
  a.choose(a.pending.options[0]);assert.equal(a.pending.source,'second');a.choose(a.pending.options[0]);assert.equal(a.pending,null);
});
test('all item effects compose with existing upgrade stats',()=>{
  const a=create();a.reset({...BASE_STATS,dashEnabled:true});for(const item of config.items){a.request(item.id);a.pending.options=[item.id];a.choose(item.id);}
  const stats=a.stats();assert.equal(a.stacks.size,config.items.length);assert.equal(stats.maxHP,BASE_STATS.maxHP+20);assert.equal(stats.shardHeal,BASE_STATS.shardHeal+5);assert.ok(stats.damageScale<BASE_STATS.damageScale);assert.ok(Object.values(stats).every(v=>typeof v!=='number'||Number.isFinite(v)));
});

test('locked dash bonuses never appear in initial offers or rerolls and cannot be granted from stale options',()=>{
  const a=create();for(let i=0;i<50;i++){
    a.reset(BASE_STATS);a.request('locked-dash:'+i);assert.ok(a.pending.options.every(id=>!['long-ray','quick-prism'].includes(id)));
    a.reroll();assert.ok(a.pending.options.every(id=>!['long-ray','quick-prism'].includes(id)));
    a.pending.options=['long-ray'];assert.equal(a.choose('long-ray'),null);
  }
  a.reset({...BASE_STATS,dashEnabled:true});assert.ok(a.eligible().includes('long-ray'));assert.ok(a.eligible().includes('quick-prism'));
  a.reset({...BASE_STATS,speed:0,jump:0,magnet:0,shardHeal:0});for(const id of ['swift-thread','spring-leaf','amber-magnet','honey-shard'])assert.ok(!a.eligible().includes(id));
});
test('typed chest consumers support mixed gems and item choices without losing rewards',()=>{
  const seen=[],dispatcher=new ChestRewardDispatcher({gem:(r,c)=>seen.push([r.type,c.index,c.count]),'item-choice':r=>seen.push([r.type,r.pools])});
  const rewards=rollChestRewards(new RandomManager('mix'),'floor',4,[{type:'gems',count:[3,3]},{type:'item-choice',pools:['starter']}],{poolSize:2});
  dispatcher.consume(rewards,{});assert.equal(seen.length,4);assert.deepEqual(seen[2],['gem',2,3]);assert.deepEqual(seen[3],['item-choice',['starter']]);
  assert.throws(()=>new ChestRewardDispatcher({}).consume(rewards,{}),/consumer/);
});

test('new rare items are available without dash and appear in ordinary chest offers',()=>{
  const model=create(),found=new Set();for(const id of ['azure-feather','moon-clover'])assert.ok(model.eligible().includes(id));
  for(let i=0;i<250;i++){model.reset(BASE_STATS);model.request('new-rares:'+i);for(const id of model.pending.options)found.add(id);}
  for(const id of ['azure-feather','moon-clover'])assert.ok(found.has(id));
  model.reset(BASE_STATS);model.request('clover');model.pending.options=['moon-clover'];model.choose('moon-clover');assert.equal(model.stats().luck,25);
});
