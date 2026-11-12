import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../src/skill-tree.json' with {type:'json'};
import {compileSkillTree,evaluateSkillEffects} from '../src/skill-tree-config.js';
import {cleanProgress,skillStats} from '../src/progression.js';

test('JSON supports new priced nodes and existing game effects without JavaScript changes',()=>{
  const edited=structuredClone(config);
  edited.branches[0].nodes.push({id:'debugHeart',name:'Ещё света',description:'+10 HP',cost:3,effects:{maxHP:{add:10},speed:{multiply:1.1}}});
  const tree=compileSkillTree(edited),node=tree.skills.find(s=>s.id==='debugHeart');
  assert.equal(node.requires,'shade');assert.equal(node.cost,3);assert.equal(node.tier,4);
  const stats=evaluateSkillEffects(tree.baseStats,tree.skills,['heart','debugHeart']);
  assert.equal(stats.maxHP,135);assert.equal(stats.speed,1.1);
});

test('moving nodes and whole branches preserves explicit dependencies, effects and learned IDs',()=>{
  const edited=structuredClone(config);edited.branches.reverse();edited.branches.forEach(branch=>branch.nodes.reverse());
  const a=compileSkillTree(config),b=compileSkillTree(edited),owned=a.skills.map(s=>s.id);
  assert.deepEqual(evaluateSkillEffects(a.baseStats,a.skills,owned),evaluateSkillEffects(b.baseStats,b.skills,owned));
  assert.equal(b.skills.find(s=>s.id==='heart2').requires,'heart');
  assert.deepEqual(cleanProgress({points:7,owned:['heart2','unknown','heart2']}),{points:7,owned:['source','heart2']});
  assert.equal(skillStats({owned:['heart','heart2']}).maxHP,150);
  assert.ok(Math.abs(skillStats({owned:['regen','rayRegen']}).regen-1.95)<1e-10);
});

test('invalid JSON tree definitions produce useful errors instead of broken connections or silent effects',()=>{
  const invalid=change=>{const edited=structuredClone(config);change(edited);return ()=>compileSkillTree(edited);};
  assert.throws(invalid(c=>c.branches[0].nodes[1].id='heart'),/повторяющийся.*heart/);
  assert.throws(invalid(c=>c.branches[0].nodes[0].requires='missing'),/не найден requires missing/);
  assert.throws(invalid(c=>c.branches[0].nodes[0].requires='heart2'),/цикл/);
  assert.throws(invalid(c=>c.branches[0].nodes[0].cost=-1),/cost/);
  assert.throws(invalid(c=>c.branches[0].nodes[0].effects={typo:{add:1}}),/неизвестный параметр typo/);
  assert.throws(invalid(c=>c.branches[0].nodes[0].effects={maxHP:{multiply:'fast'}}),/неверное значение эффекта/);
});
