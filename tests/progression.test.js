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
test('tree reveals only the next node, even when it cannot yet be afforded',()=>{
  const p=new SkillProgression();assert.equal(SKILLS.filter(s=>isSkillVisible(p.state,s.id)).length,6);
  assert.equal(isSkillVisible(p.state,'heart2'),false);assert.equal(isSkillVisible(p.state,'heart'),true);assert.equal(p.canBuy('heart'),false);
  p.award();p.buy('heart');assert.equal(p.state.points,0);
  assert.equal(isSkillVisible(p.state,'heart2'),true);assert.equal(p.canBuy('heart2'),false);assert.equal(isSkillVisible(p.state,'lasting'),false);
  assert.equal(SKILLS.filter(s=>isSkillVisible(p.state,s.id)).length,7);
});
test('one locked neighbour per branch is previewed without revealing the entire chain',()=>{
  const p=new SkillProgression();assert.equal(SKILLS.filter(s=>isSkillPreview(p.state,s.id)).length,6);
  assert.equal(isSkillPreview(p.state,'heart2'),true);assert.equal(isSkillPreview(p.state,'lasting'),false);
  p.award();p.buy('heart');assert.equal(isSkillPreview(p.state,'heart2'),false);assert.equal(isSkillPreview(p.state,'lasting'),true);assert.equal(isSkillPreview(p.state,'shade'),false);
  assert.equal(p.canBuy('lasting'),false);
});
test('each shard banks one point, purchases enforce prerequisites and survive reload',()=>{
  const saved=new Map(),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const p=new SkillProgression(storage);assert.equal(p.buy('heart'),false);p.award();assert.equal(p.state.points,1);
  assert.equal(p.buy('heart2'),false);assert.equal(p.buy('heart'),true);assert.equal(p.state.points,0);
  assert.equal(p.buy('heart'),false);p.award();assert.equal(p.buy('heart2'),true);
  const restored=new SkillProgression(storage);assert.deepEqual(restored.state,p.state);assert.equal(skillStats(restored.state).maxHP,150);
});
test('corrupt saves are contained and all nodes purchase once without negative points',()=>{
  assert.deepEqual(cleanProgress({points:-8,owned:['heart2','bogus']}),{points:0,owned:['heart2']});
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
  rabbit.setVitral({});let light=rabbit.updateLight(100,0,false);assert.equal(light,125);
  light=rabbit.updateLight(light,1,false);assert.ok(light<125);assert.equal(stats.rayDashHeal,25);
});
