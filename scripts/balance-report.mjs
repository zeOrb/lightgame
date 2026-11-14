import {SKILLS,ROOT_SKILL} from '../src/progression.js';
import {isGap,FLOOR_COUNT,END} from '../src/game.js';
import {enemyStats} from '../src/enemy-config.js';
import {bossReward,VICTORY_BONUS} from '../src/progression-balance.js';
export function runIncome(floors,{collection=1,victory=false}={}){
  const end=Math.min(END,floors*14-.51);let shards=0,bosses=0;
  for(let s=5;s<=end;s+=5)if(!isGap(s))shards++;
  for(let i=0;i<floors;i++)bosses+=bossReward(enemyStats('reaper').stats,i);
  const collected=Math.round(shards*collection);
  return {floors,shards:collected,bosses,victory:victory?VICTORY_BONUS:0,total:collected+bosses+(victory?VICTORY_BONUS:0)};
}
export function skillPathCost(id){const node=SKILLS.find(s=>s.id===id);if(!node)throw new Error(id);return node.cost+(node.requires?skillPathCost(node.requires):0);}
export const totalTreeCost=SKILLS.reduce((sum,node)=>sum+node.cost,0);
const rows=[1,3,6,FLOOR_COUNT].map(floors=>runIncome(floors,{collection:.7,victory:floors===FLOOR_COUNT}));
console.log(JSON.stringify({totalTreeCost,sourceCost:ROOT_SKILL.cost,runs:rows,perfectClear:runIncome(FLOOR_COUNT,{victory:true}),paths:Object.fromEntries(['heart','double','flare','lastLight','rayDash'].map(id=>[id,skillPathCost(id)]))},null,2));
