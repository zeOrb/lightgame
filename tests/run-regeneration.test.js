import test from 'node:test';
import assert from 'node:assert/strict';
import {RandomManager,randomManager} from '../src/random-manager.js';
import {RUN_UPGRADES} from '../src/progression.js';
import {FLOORS,TOTAL_SECTIONS,rebuildFloorLayout} from '../src/floor-config.js';
import {END,FLOOR_COUNT,TOWER_TOP,gaps,route,refreshRunGeometry} from '../src/game.js';

test('reseed keeps manager identity, replaces streams and reproduces the new seed',()=>{
  const manager=new RandomManager('before');manager.stream('loot').float();manager.reseed('after');
  assert.equal(manager.seed,'after');assert.equal(manager.streams.size,0);
  assert.equal(manager.stream('loot').float(),new RandomManager('after').stream('loot').float());
  assert.throws(()=>manager.reseed(''),/seed/i);
});
test('fresh layout updates all live dimensions and applies an added stage without reload',()=>{
  const seed=randomManager.seed,extra=RUN_UPGRADES.extraFloors,original=FLOORS,originalTop=TOWER_TOP;
  try{
    RUN_UPGRADES.extraFloors=extra+10;randomManager.reseed('new-stage-check');rebuildFloorLayout();refreshRunGeometry();
    assert.notEqual(FLOORS,original);assert.equal(FLOOR_COUNT,original.length+10);
    assert.equal(END,TOTAL_SECTIONS-1);assert.ok(TOWER_TOP>originalTop);assert.equal(route(0).y,TOWER_TOP);
    assert.ok(FLOORS.slice(0,10).every(f=>f.stairTheme==='wood'));assert.ok(FLOORS.slice(10).every(f=>f.stairTheme==='stone'));
    assert.deepEqual(gaps,FLOORS.flatMap(f=>f.holes.map(offset=>f.start+offset)));
  }finally{RUN_UPGRADES.extraFloors=extra;randomManager.reseed(seed);rebuildFloorLayout();refreshRunGeometry();}
});
