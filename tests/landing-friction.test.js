import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlatformerMotion,heightAboveSurface} from '../src/platformer-motion.js';

test('standing on a tread after a secret-road drop uses ground braking regardless of route offset',()=>{
 for(const fps of [30,60,144])for(const offset of [-.24,.04,.15,.25,.49]){
  const routeY=80,surface={y:routeY+offset},height=offset,motion=new PlatformerMotion();motion.rail=1.6;
  const relative=heightAboveSurface(height,routeY,surface);
  assert.equal(relative,0,'ground animation must not retain an airborne pose');
  for(let i=0;i<Math.ceil(fps*.12);i++)motion.railStep(0,1.6,relative>.025,1/fps);
  assert.equal(motion.rail,0,'stop with normal ground friction instead of sliding in air');
 }
});

test('real jumps retain air control above a tread and outside any supporting surface',()=>{
 const relative=heightAboveSurface(.8,80,{y:80.2});assert.ok(relative>.59);
 const motion=new PlatformerMotion();motion.rail=1.6;motion.railStep(0,1.6,relative>.025,.1);
 assert.ok(motion.rail>1.4,'air momentum is preserved during an actual jump');
 assert.equal(heightAboveSurface(1.2,80,null),1.2);
});
