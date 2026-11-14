import balance from './progression-balance.json' with {type:'json'};
export const VICTORY_BONUS=balance.victoryBonus;
export function bossReward(stats,floorIndex){
  return Math.min(stats.maxRewardPoints??stats.rewardPoints,stats.rewardPoints+Math.floor(floorIndex/(stats.rewardEveryFloors??1))*(stats.rewardStep??0));
}
