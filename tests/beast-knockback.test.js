import test from 'node:test';
import assert from 'node:assert/strict';
import {BeastKnockback,canDamageDashCancel} from '../src/beast-knockback.js';
import {Abilities,AbilityType} from '../src/abilities.js';
import {RabbitAnimation} from '../src/rabbit-animation.js';
import * as THREE from 'three';

test('200ms escape window is usable during hit animation even after spending the air dash',()=>{
  for(const fps of [30,60,144]){
    const stats={damageDashCancel:true,damageDashCancelWindow:.2},a=new Abilities(stats);
    a.use(AbilityType.PHASING);a.advance(.25);
    assert.equal(a.use(AbilityType.PHASING),null);
    const k=new BeastKnockback();k.start(15.3,16);
    const animation=new RabbitAnimation(new THREE.Group(),[],[],new THREE.Group());animation.hit();
    let escaped=false;
    for(let i=0;i<fps;i++){
      if(k.motion&&canDamageDashCancel(k.motion.age,stats)){
        assert.equal(animation.recoiling,true);
        assert.ok(a.use(AbilityType.PHASING,{recoveryCancel:true}));escaped=true;break;
      }
      a.advance(1/fps);k.advance(1/fps);animation.update(1/fps,{speed:0,height:.3,velocity:0});
    }
    assert.equal(escaped,true);assert.equal(a.cooldowns.phasing,1);
    const disabled=new Abilities({damageDashCancel:false});disabled.use(AbilityType.PHASING);disabled.advance(.25);
    assert.equal(disabled.use(AbilityType.PHASING,{recoveryCancel:true}),null);
  }
});

test('damage cancel only permits the last 100ms, can be disabled or upgraded',()=>{
  const stats={damageDashCancel:true,damageDashCancelWindow:.1};
  assert.equal(canDamageDashCancel(.35,stats),false);
  assert.equal(canDamageDashCancel(.37,stats),true);
  assert.equal(canDamageDashCancel(.459,stats),true);
  assert.equal(canDamageDashCancel(.46,stats),false);
  assert.equal(canDamageDashCancel(.4,{...stats,damageDashCancel:false}),false);
  assert.equal(canDamageDashCancel(.3,{...stats,damageDashCancelWindow:.2}),true);
});

test('beast contact throws the rabbit away onto the adjacent shelf with a short hop at any frame rate',()=>{
  for(const fps of [25,60,144])for(const side of [-1,1]){
    const k=new BeastKnockback();assert.ok(k.start(16+side*.7,16));
    let last=null,maxHeight=0;
    for(let i=0;i<fps;i++){const p=k.advance(1/fps);if(p){last=p;maxHeight=Math.max(maxHeight,p.height);assert.ok((p.s-16)*side>=.7-1e-8);}}
    assert.ok(Math.abs(last.s-(16+side))<1e-8);assert.ok(Math.abs(last.height)<1e-8);assert.ok(maxHeight>.4);
  }
});

test('contact cannot chain knockbacks immediately and reset clears movement and cooldown',()=>{
  const k=new BeastKnockback();assert.ok(k.start(15.3,16));assert.equal(k.start(15.3,16),false);
  k.advance(.3);assert.equal(k.start(15.3,16),false);k.advance(.6);assert.ok(k.start(16.7,16));
  k.reset();assert.equal(k.advance(.016),null);assert.ok(k.start(15.3,16));
});
