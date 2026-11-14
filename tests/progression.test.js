import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SKILLS,SKILL_BRANCH_COUNT,SkillProgression,skillStats,cleanProgress,isSkillVisible,isSkillPreview} from '../src/progression.js';
import {Abilities,AbilityType} from '../src/abilities.js';
import {RabbitState} from '../src/rabbit-state.js';

test('configured tree has unique nodes, valid dependencies and matching branch sizes',()=>{
  assert.ok(SKILLS.length>0);assert.equal(new Set(SKILLS.map(s=>s.id)).size,SKILLS.length);
  for(let ray=0;ray<SKILL_BRANCH_COUNT;ray++){
    const branch=SKILLS.filter(s=>s.ray===ray);assert.ok(branch.length>0);
    for(const skill of branch){assert.equal(skill.tiers,branch.length);assert.ok(!skill.requires||SKILLS.some(parent=>parent.id===skill.requires));}
  }
});
test('only the dormant source is visible until its one-point unlock',()=>{
  const p=new SkillProgression();
  assert.deepEqual(SKILLS.filter(s=>isSkillVisible(p.state,s.id)).map(s=>s.id),['source']);
  assert.equal(SKILLS.filter(s=>isSkillPreview(p.state,s.id)).length,0);
  p.award();assert.equal(p.canBuy('heart'),false);assert.equal(p.canBuy('source'),true);
  assert.equal(p.buy('source'),true);assert.equal(p.state.points,0);assert.equal(p.buy('source'),false);
  assert.equal(SKILLS.filter(s=>isSkillVisible(p.state,s.id)&&!s.isRoot).length,6);
  assert.equal(p.canBuy('heart'),false);p.award(4);assert.equal(p.buy('heart'),true);
  assert.equal(isSkillVisible(p.state,'heart2'),true);assert.equal(isSkillVisible(p.state,'lasting'),false);
});

test('neighbour previews stay hidden before the source and reveal one step afterwards',()=>{
  const p=new SkillProgression();assert.equal(isSkillPreview(p.state,'heart2'),false);
  p.award();p.buy('source');
  const nextTier=SKILLS.filter(s=>SKILLS.find(parent=>parent.id===s.requires)?.requires==='source');
  assert.equal(SKILLS.filter(s=>isSkillPreview(p.state,s.id)).length,nextTier.length);
  assert.equal(isSkillPreview(p.state,'heart2'),true);assert.equal(isSkillPreview(p.state,'lasting'),false);
  p.award(4);p.buy('heart');assert.equal(isSkillPreview(p.state,'heart2'),false);assert.equal(isSkillPreview(p.state,'lasting'),true);
});

test('each shard banks one point, purchases enforce prerequisites and survive reload',()=>{
  const saved=new Map(),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const p=new SkillProgression(storage);p.award();assert.equal(p.buy('source'),true);assert.equal(p.buy('heart'),false);p.award();assert.equal(p.state.points,1);
  assert.equal(p.buy('heart2'),false);p.award(3);assert.equal(p.buy('heart'),true);assert.equal(p.state.points,0);
  assert.equal(p.buy('heart'),false);p.award(9);assert.equal(p.buy('heart2'),true);
  const restored=new SkillProgression(storage);assert.deepEqual(restored.state,p.state);assert.equal(skillStats(restored.state).maxHP,150);
});
test('corrupt saves are contained and all nodes purchase once without negative points',()=>{
  assert.deepEqual(cleanProgress({points:-8,owned:['heart2','bogus']}),{points:0,owned:['source','heart2']});
  const p=new SkillProgression({getItem:()=>'{broken'});assert.equal(p.state.points,0);
  for(let i=0;i<SKILLS.reduce((sum,s)=>sum+s.cost,0);i++)p.award();
  while(p.state.owned.length<SKILLS.length){const next=SKILLS.find(s=>p.canBuy(s.id));assert.ok(next);assert.ok(p.buy(next.id));}
  assert.equal(p.state.points,0);for(const s of SKILLS)assert.equal(p.buy(s.id),false);
  const stats=skillStats(p.state);assert.equal(stats.extraFloors,4);assert.equal(stats.glintSpacing,4);assert.equal(stats.flare,true);assert.equal(stats.doubleJump,true);
});

test('debug reset clears banked points and all upgrades durably without touching other saves',()=>{
  const saved=new Map([['other-setting','keep']]),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const p=new SkillProgression(storage);p.award();p.buy('heart');p.award();p.reset();
  assert.deepEqual(p.state,{points:0,owned:[]});
  const restored=new SkillProgression(storage);
  assert.deepEqual(restored.state,p.state);assert.equal(skillStats(restored.state).maxHP,100);
  assert.equal(skillStats(restored.state).extraFloors,0);assert.equal(saved.get('other-setting'),'keep');
});
test('upgrades alter live abilities and light math, not only tree labels',()=>{
  const stats=skillStats({owned:SKILLS.map(s=>s.id)}),a=new Abilities(stats),rabbit=new RabbitState(stats);
  const jump=a.use(AbilityType.JUMP);assert.ok(jump.velocity>9);a.advance(.2);
  assert.ok(a.use(AbilityType.JUMP,{height:1}));a.advance(.2);assert.equal(a.use(AbilityType.JUMP,{height:1}),null);
  a.land();a.advance(.2);assert.ok(a.use(AbilityType.JUMP,{height:1}));
  assert.ok(a.use(AbilityType.FLARE));assert.equal(a.use(AbilityType.FLARE),null);
  a.use(AbilityType.PHASING);assert.equal(a.cooldowns.phasing,1.35);
  assert.ok(rabbit.updateLight(150,1,false)>138);
  rabbit.setVitral({},false,true);let light=rabbit.updateLight(100,0,false);assert.equal(light,150);
  light=rabbit.updateLight(light,1,false);assert.ok(light<150);assert.equal(stats.rayDashHeal,.25);
});

test('legacy learned trees migrate the source without spending points; fresh reset keeps it locked',()=>{
  const old=cleanProgress({points:4,owned:['heart']});assert.equal(old.points,4);assert.ok(old.owned.includes('source'));
  assert.deepEqual(cleanProgress({points:4,owned:[]}),{points:4,owned:[]});
});
