import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_CONFIG,ENEMY_TYPES,enemyStats,spiralEnemyAt} from '../src/enemy-config.js';
import {FLOORS} from '../src/floor-config.js';
test('all enemy and boss definitions resolve to supported profiles',()=>{
  for(const id of [...ENEMY_CONFIG.spiral.cycle,...ENEMY_CONFIG.arenas.bossCycle]){
    const enemy=enemyStats(id);assert.ok(enemy.stats.hp>0);assert.ok(enemy.stats.stompTop>0);
  }
  assert.equal(ENEMY_TYPES.size,5);
  assert.equal(ENEMY_TYPES.has('mirror'),false);
});
test('first spiral enemy is ordinary, with no special shield',()=>{
  const enemies=FLOORS.flatMap(floor=>floor.placements.enemies).sort((a,b)=>a.s-b.s);
  assert.ok(enemies.length>0);
  const first=enemies[0];
  assert.equal(spiralEnemyAt(first.s,0),first.id);
  assert.equal(enemyStats(first.id).profile,'animal');
  assert.equal(spiralEnemyAt(first.s-1,0),null);
  const later=enemies.at(-1);
  assert.equal(spiralEnemyAt(later.s,0),later.id);
});
test('boss progression, emergence and reward are configurable',()=>{
  const stats=enemyStats('reaper').stats;
  assert.equal(stats.spawnDuration,1);assert.equal(stats.rewardPoints,5);
  assert.equal(Math.min(stats.maxHP,stats.hp+Math.floor(8/stats.hpEveryFloors)),5);
  assert.throws(()=>enemyStats('mirror'));
});
