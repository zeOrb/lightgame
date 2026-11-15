import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BASE_STATS,SKILLS,skillStats,SkillProgression} from '../src/progression.js';

test('shard branch grants five absolute multipliers with a separate healing stat',()=>{
  assert.equal(BASE_STATS.shardPointsMultiplier,1);
  const owned=['treasurySource'];
  const baseline=skillStats({owned});
  for(const value of [2,4,8,16,32]){
    const node=SKILLS.find(s=>s.id==='shardMultiplier'+value);
    assert.equal(node.requires,owned.at(-1));owned.push(node.id);
    const stats=skillStats({owned});assert.equal(stats.shardPointsMultiplier,value);assert.equal(stats.shardHeal,baseline.shardHeal);
    const progress=new SkillProgression();
    progress.award(3*stats.shardPointsMultiplier);assert.equal(progress.state.points,3*value);
    progress.award(5*stats.shardPointsMultiplier);assert.equal(progress.state.points,8*value);
  }
});
