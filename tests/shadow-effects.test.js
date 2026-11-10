import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ShadowEffects } from '../src/shadow-effects.js';

function setup(reduced=false){
  const overlay={style:{opacity:'0',setProperty(){}}};
  return new ShadowEffects(new THREE.Scene(),new THREE.Texture(),overlay,reduced);
}
test('shadow damage starts a burst, sustains subtle shake, then fades after escape',()=>{
  const fx=setup(),position=new THREE.Vector3();
  fx.setDamage(true);fx.update(1/60,position);
  assert.ok(fx.intensity>.7);assert.ok(fx.shake>0&&fx.shake<.09);
  for(let i=0;i<60;i++){fx.setDamage(true);fx.update(1/60,position);}
  assert.ok(fx.pulse<.02,'continuous damage does not repeatedly restart the impact');
  assert.ok(fx.shake<.025);
  fx.setDamage(false);
  for(let i=0;i<120;i++)fx.update(1/60,position);
  assert.ok(fx.intensity<.001);assert.ok(fx.shake<.001);
  fx.hit();fx.clear();assert.equal(fx.intensity,0);assert.equal(fx.active,false);
});
test('reduced motion retains damage feedback without camera shake',()=>{
  const fx=setup(true);fx.setDamage(true);fx.update(1/60,new THREE.Vector3());
  assert.ok(fx.intensity>0);assert.equal(fx.shake,0);
});
