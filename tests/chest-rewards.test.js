import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RandomManager} from '../src/random-manager.js';
import {rollChestRewards,registerChestReward,chooseChestTier} from '../src/chest-rewards.js';
import config from '../src/interactables.json' with {type:'json'};
test('tiers roll reproducible rewards within their configured ranges',()=>{
  const rng=new RandomManager('test');
  for(const tier of Object.values(config.chest.tiers)){
    const a=rollChestRewards(rng,'floor',5,tier.rewards,{poolSize:3});
    assert.deepEqual(a,rollChestRewards(rng,'floor',5,tier.rewards,{poolSize:3}));
    assert.deepEqual(a,[{type:'item-choice',pools:['starter']}]);
  }
  const gems=rollChestRewards(rng,'floor',5,[{type:'gems',count:[3,6]}],{poolSize:3});assert.ok(gems.length>=3&&gems.length<=6);assert.ok(gems.every(r=>r.variant>=0&&r.variant<3));
  const found=new Set(Array.from({length:100},(_,s)=>chooseChestTier(rng,'floor',s,config.chest)));assert.equal(found.size,3);
});
test('non-gem rewards can be registered without modifying the container roller',()=>{
  registerChestReward('test-item',definition=>[{type:'item',id:definition.id}]);
  assert.deepEqual(rollChestRewards(new RandomManager('test'),'floor',2,[{type:'test-item',id:'key'}],{}),[{type:'item',id:'key'}]);
});
