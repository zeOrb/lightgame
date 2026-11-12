import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_CONFIG,ENEMY_TYPES,enemyStats,spiralEnemyAt} from '../src/enemy-config.js';
test('all enemy and boss definitions resolve to supported profiles',()=>{
  for(const id of [...ENEMY_CONFIG.spiral.cycle,...ENEMY_CONFIG.arenas.bossCycle]){
    const enemy=enemyStats(id);assert.ok(enemy.stats.hp>0);assert.ok(enemy.stats.stompTop>0);
  }
  assert.equal(ENEMY_TYPES.size,5);
  assert.equal(ENEMY_TYPES.has('mirror'),false);
});
test('first spiral enemy is ordinary, with no special shield',()=>{
  assert.equal(spiralEnemyAt(16,0),'cat');
  assert.equal(enemyStats(spiralEnemyAt(16,0)).profile,'animal');
  assert.equal(spiralEnemyAt(15,0),null);
  assert.equal(spiralEnemyAt(44,1),'wolf');
});
test('boss progression, emergence and reward are configurable',()=>{
  const stats=enemyStats('reaper').stats;
  assert.equal(stats.spawnDuration,1);assert.equal(stats.rewardPoints,5);
  assert.equal(Math.min(stats.maxHP,stats.hp+Math.floor(8/stats.hpEveryFloors)),5);
  assert.throws(()=>enemyStats('mirror'));
});
