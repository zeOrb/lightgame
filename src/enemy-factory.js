import {createShadowBeast,createShadowReaper,killShadowBeast} from './shadow-beast.js';
import {enemyStats} from './enemy-config.js';
import {bossReward} from './progression-balance.js';
export function createEnemy(id,{floorIndex=0,s=0}={}){
  const definition=enemyStats(id),stats=definition.stats;
  const enemy=definition.model==='reaper'?createShadowReaper():createShadowBeast(definition.model);
  const boss=definition.profile==='boss';
  const hp=boss?Math.min(stats.maxHP,stats.hp+Math.floor(floorIndex/stats.hpEveryFloors)):stats.hp;
  enemy.o.scale.set(...stats.scale);
  return Object.assign(enemy,{definition,stats,boss,s,lane:0,hp,maxHP:hp,rewardPoints:boss?bossReward(stats,floorIndex):0,stompTop:stats.stompTop*stats.scale[1],hurt:0,attack:0});
}
export function damageEnemy(enemy,palette=null){
  if(enemy.dead||enemy.hurt>0)return false;
  enemy.hp--;enemy.hurt=enemy.stats.hurtDuration??.3;
  if(enemy.hp<=0){killShadowBeast(enemy,palette);return true;}
  return false;
}
