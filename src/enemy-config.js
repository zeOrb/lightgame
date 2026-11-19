import {FLOORS,placementAt} from './floor-config.js';
import config from './enemies.json' with {type:'json'};
const models=new Set(['cat','wolf','fox','hare','reaper']),definitions=new Map();
for(const enemy of config.enemies){
  if(!enemy.id||definitions.has(enemy.id)||!models.has(enemy.model)||!config.profiles[enemy.profile])throw new Error('enemies.json: неверный тип '+enemy.id);
  const stats={...config.profiles[enemy.profile],...enemy.stats};
  if(!Number.isFinite(stats.hp)||stats.hp<1||!Number.isFinite(stats.stompTop)||stats.stompTop<=0||!Array.isArray(stats.scale)||stats.scale.length!==3||stats.scale.some(n=>!Number.isFinite(n)||n<=0))throw new Error('enemies.json: неверные характеристики '+enemy.id);
  if(enemy.profile==='boss'&&(!(stats.spawnDuration>0)||!(stats.attackCycle>stats.chargeStart)||!(stats.chargeStart>stats.windupStart)||!(stats.hpEveryFloors>0)))throw new Error('enemies.json: неверная логика босса '+enemy.id);
  definitions.set(enemy.id,Object.freeze({...enemy,stats:Object.freeze(stats)}));
}
for(const id of [...config.spiral.cycle,...config.arenas.bossCycle])if(!definitions.has(id))throw new Error('enemies.json: неизвестный враг '+id);
for(const floor of FLOORS){for(const item of floor.placements.enemies)if(!definitions.has(item.id))throw new Error('floors.json: unknown enemy '+item.id);if(floor.arena.enabled&&!definitions.has(floor.arena.boss))throw new Error('floors.json: unknown boss '+floor.arena.boss);}
export const ENEMY_CONFIG=config;
export const ENEMY_TYPES=definitions;
export function spiralEnemyAt(section,index){return placementAt('enemies',section)?.id??null;}
export function enemyStats(id){const enemy=definitions.get(id);if(!enemy)throw new Error('Неизвестный враг: '+id);return enemy;}
