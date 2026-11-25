import {test} from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../src/game.js';
import {FLOORS} from '../src/floor-config.js';
import {wallBayCenter,windowSteps,STEPS_PER_WALL_BAY} from '../src/wall-layout.js';
test('window targets stay on solid steps at wall bay centres',()=>{
  for(const floor of FLOORS)for(const {section} of windowSteps(floor)){
    assert.equal(section%STEPS_PER_WALL_BAY,0);assert.ok(!floor.holes.includes(section-floor.start));
    assert.ok(section>=floor.start&&section<=floor.end);
    assert.ok(Math.abs(route(section).theta-wallBayCenter(route(section).theta))<1e-8);
  }
});
