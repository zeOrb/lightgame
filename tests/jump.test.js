import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gaps, isGap, GAP_HALF_WIDTH, SHELF_HALF_ANGLE, ROUTE_ANGLE, JUMP_SPEED, advanceJump, fellIntoGap } from '../src/game.js';

test('gap collision matches the physical space between neighboring shelves',()=>{
  const rightEdgeOfLeftShelf=-1+SHELF_HALF_ANGLE/ROUTE_ANGLE;
  assert.ok(Math.abs(rightEdgeOfLeftShelf+GAP_HALF_WIDTH)<1e-12);
  assert.ok(!isGap(gaps[0]-.55),'visible shelf edge must remain solid');
});
test('manual and rescue jumps clear every gap in both directions at 25–144 FPS without damage',()=>{
  for(const fps of [25,30,60,120,144])for(const gap of gaps)for(const direction of [-1,1])for(const mode of ['edge','early','rescue']){
    let s=gap-direction*(mode==='early'?.85:GAP_HALF_WIDTH+.025);
    let height=mode==='rescue'?.2:0,velocity=JUMP_SPEED;
    const dt=1/fps;
    for(let frame=0;frame<fps*2;frame++){
      s+=direction*1.45*dt;
      ({height,velocity}=advanceJump(height,velocity,dt));
      assert.ok(!fellIntoGap(s,height,velocity),`${mode}, ${fps} FPS, gap ${gap}, direction ${direction}`);
    }
    assert.ok(!isGap(s));assert.equal(height,0);
  }
});
test('low ascending jump frames are safe; walking or landing into a hole still falls',()=>{
  const jump=advanceJump(0,JUMP_SPEED,1/144);
  assert.ok(jump.height<.15);
  assert.ok(!fellIntoGap(gaps[0]-.46,jump.height,jump.velocity));
  assert.ok(fellIntoGap(gaps[0],0,0));
  const landing=advanceJump(.01,-4,1/30);
  assert.ok(fellIntoGap(gaps[0],landing.height,landing.velocity));
});
