import { test } from 'node:test';
import assert from 'node:assert/strict';
import { END, shelfInnerRadius, SHELF_INNER_RADIUS, SHELF_OUTER_RADIUS, LANE_LIMIT } from '../src/game.js';

test('random shelf lengths stay within one eighth and preserve the playable strip',()=>{
  const base=SHELF_OUTER_RADIUS-SHELF_INNER_RADIUS,lengths=new Set();
  for(let section=0;section<=END+1;section++){
    const inner=shelfInnerRadius(section),length=SHELF_OUTER_RADIUS-inner;
    assert.ok(Math.abs(length-base)<=base/8);
    assert.equal(shelfInnerRadius(section),inner);
    assert.ok(inner<12-LANE_LIMIT-.15);
    lengths.add(length);
  }
  assert.ok(lengths.size>100);
});
