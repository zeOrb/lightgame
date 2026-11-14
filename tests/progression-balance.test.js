import test from 'node:test';
import assert from 'node:assert/strict';
import {bossReward,VICTORY_BONUS} from '../src/progression-balance.js';
import {enemyStats} from '../src/enemy-config.js';
import {SKILLS,SkillProgression} from '../src/progression.js';
test('deeper bosses pay more, with a fixed cap',()=>{
  const stats=enemyStats('reaper').stats;
  assert.deepEqual([0,2,3,6,9,15].map(index=>bossReward(stats,index)),[5,5,6,7,8,8]);
  assert.equal(VICTORY_BONUS,12);
});
test('one early floor buys the source and one opening upgrade, not the whole tree',()=>{
  const p=new SkillProgression();p.award(7);
  assert.ok(p.buy('source'));assert.ok(p.buy('heart'));assert.equal(p.state.points,2);
  assert.equal(p.buy('heart2'),false);
  assert.ok(SKILLS.reduce((sum,s)=>sum+s.cost,0)>400);
});
test('new prices preserve existing skills and unspent currency',()=>{
  const data=JSON.stringify({points:17,owned:['source','heart','double']});
  const p=new SkillProgression({getItem:()=>data});
  assert.equal(p.state.points,17);assert.ok(p.state.owned.includes('double'));
});
