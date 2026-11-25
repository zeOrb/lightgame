// Typed reward records keep container contents independent of their world visuals.
const generators=new Map();
export function registerChestReward(type,generate){if(generators.has(type)||typeof generate!=='function')throw new Error('Invalid or duplicate chest reward: '+type);generators.set(type,generate);}
registerChestReward('gems',(definition,rng,{poolSize})=>Array.from({length:rng.int(...definition.count)},()=>({type:'gem',variant:rng.int(0,poolSize-1)})));
registerChestReward('item-choice',definition=>[{type:'item-choice',pools:definition.pools}]);
export class ChestRewardDispatcher {
  constructor(handlers){this.handlers=new Map(Object.entries(handlers));}
  consume(rewards,context){
    for(const reward of rewards)if(!this.handlers.has(reward.type))throw Error('Missing chest reward consumer: '+reward.type);
    const counts=new Map(),indices=new Map();for(const r of rewards)counts.set(r.type,(counts.get(r.type)??0)+1);
    for(const reward of rewards){const index=indices.get(reward.type)??0;indices.set(reward.type,index+1);this.handlers.get(reward.type)(reward,{...context,index,count:counts.get(reward.type)});}
  }
}
export function rollChestRewards(manager,floorId,section,definitions,context){
  return definitions.flatMap((definition,index)=>{
    const generate=generators.get(definition.type);if(!generate)throw new Error('Unregistered chest reward: '+definition.type);
    return generate(definition,manager.create('chests',floorId,section,'reward',index),context);
  });
}
export function chestTier(config,id=config.defaultTier){const tier=config.tiers[id];if(!tier)throw new Error('Unknown chest tier: '+id);return tier;}
export function chooseChestTier(manager,floorId,section,config){
  const entries=Object.entries(config.tierWeights??{[config.defaultTier]:1}),sum=entries.reduce((n,[,weight])=>n+weight,0);
  let roll=manager.create('chests',floorId,section,'tier').float()*sum;
  for(const [id,weight] of entries){roll-=weight;if(roll<0)return id;}return config.defaultTier;
}
