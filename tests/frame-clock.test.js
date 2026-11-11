import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FrameClock} from '../src/frame-clock.js';
import {Abilities} from '../src/abilities.js';
import {VitralGlow} from '../src/vitral-glow.js';
import {RabbitAnimation} from '../src/rabbit-animation.js';

test('fresh and restarted runs begin at zero elapsed time; slow and regressing frames stay bounded',()=>{
  const clock=new FrameClock();
  assert.equal(clock.step(100),0);assert.equal(clock.step(116),.016);
  assert.equal(clock.step(90),0);assert.equal(clock.step(120),.004);
  assert.equal(clock.step(5000),.04);assert.equal(clock.step(NaN),0);
  clock.reset();assert.equal(clock.step(9000),0);assert.equal(clock.step(9016),.016);
});

test('automatic startup cannot manufacture inversion timers, cooldowns, glow or unstable poses',()=>{
  const clock=new FrameClock(),abilities=new Abilities();
  const glow=new VitralGlow(new THREE.Group(),new THREE.Texture());
  const visual=new THREE.Group(),animation=new RabbitAnimation(visual,[],[],new THREE.Group());
  let invert=0,slow=0,time=0;
  // The first RAF may be earlier than setup performance.now(); later stamps may regress too.
  for(const stamp of [500,490,516,532]){
    const dt=clock.step(stamp);time+=dt;
    invert=Math.max(0,invert-dt);slow=Math.max(0,slow-dt);
    abilities.advance(dt);glow.update(dt,null,1,time);
    animation.update(dt,{speed:0,height:0,velocity:0});
    assert.equal(invert,0);assert.equal(slow,0);
    assert.deepEqual(abilities.cooldowns,{jump:0,phasing:0,flare:0});
    assert.equal(glow.strength,0);assert.equal(glow.group.visible,false);
    assert.ok([...visual.position.toArray(),visual.rotation.x,visual.rotation.y,visual.rotation.z].every(Number.isFinite));
  }
});
