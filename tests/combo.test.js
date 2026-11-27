import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Combo} from '../src/combo.js';
import {SkillProgression,skillStats,SKILLS} from '../src/progression.js';
test('combos require a purchased Treasury skill and activate for the next run',()=>{
  const progression=new SkillProgression();
  const locked=new Combo(undefined,{enabled:skillStats(progression.state).comboEnabled});
  assert.equal(locked.add('stomp',1),false);assert.equal(locked.count,0);assert.equal(locked.reward(5),5);
  const skill=SKILLS.find(skill=>skill.id==='unlockCombo');assert.equal(skill.treeId,'treasury');
  progression.award(100);assert.equal(progression.buy(skill.id),false);
  assert.equal(progression.buy('treasurySource'),true);assert.equal(progression.buy(skill.id),true);
  const unlocked=new Combo(undefined,{enabled:skillStats(progression.state).comboEnabled});
  assert.equal(unlocked.add('stomp',1),true);unlocked.add('chest',2);assert.equal(unlocked.reward(5),10);
  assert.equal(locked.multiplier,1,'current run keeps its original upgrade snapshot');
  locked.reset(skillStats(progression.state).comboEnabled);
  assert.equal(locked.add('gem',1),true);
});
test('varied actions raise gem rewards up to x3 and fresh gems refresh the chain',()=>{
  const c=new Combo();c.add('stomp',1);c.add('gem',2);c.add('chest',3);assert.equal(c.multiplier,2);assert.equal(c.reward(5),10);
  c.add('vitral',4);c.add('dashKill',5);assert.equal(c.multiplier,3);
  c.add('gem',6);c.add('gem',7);c.update(1);assert.equal(c.add('gem',8),true);assert.equal(c.remaining,5);
  assert.equal(c.add('vitral',4),false,'same window cannot be farmed');
});
test('a group of distinct gems continues the combo without repeating the same gem',()=>{
  const c=new Combo(),gems=Array.from({length:5},()=>({}));
  for(const gem of gems)assert.equal(c.add('gem',gem),true);
  assert.equal(c.count,5);assert.equal(c.remaining,c.config.timeout);
  assert.equal(c.add('gem',gems[0]),false);
});
test('grounded window crossings and gem groups share the same combo window',()=>{
  const c=new Combo(),first={},second={},third={};
  assert.equal(c.crossVitral(null,first),true);
  assert.equal(c.crossVitral(first,first),false);
  assert.equal(c.crossVitral(first,second),true);
  assert.equal(c.crossVitral(second,third),true);
  assert.equal(c.crossVitral(third,{extinguished:true}),false);
  assert.equal(c.crossVitral(null,first),false);
  c.update(2,true);
  assert.equal(c.count,3);
  for(const gem of [{},{},{}])assert.equal(c.add('gem',gem),true);
  assert.equal(c.reward(5),10);
  c.update(2,true);
  assert.equal(c.count,6);
  c.update(3,true);
  assert.equal(c.count,0);
});
test('ground grace, timeout, damage/reset and delayed reward snapshots keep clear boundaries',()=>{
  const c=new Combo();c.add('stomp',1);c.add('chest',2);const pendingReward=c.reward(3);
  c.update(1,true);assert.equal(c.count,2);c.update(.3,true);assert.equal(c.count,0);assert.equal(pendingReward,6);
  assert.equal(c.add('stomp',1),false);c.reset();assert.equal(c.add('stomp',1),true);
  c.update(5);assert.equal(c.count,0);assert.equal(c.reward(3),3);
});
