import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RabbitShadowForm} from '../src/rabbit-shadow-form.js';

test('shadow transition finishes in half a second and remains black until healed',()=>{
  const form=new RabbitShadowForm(new THREE.Scene());
  assert.equal(form.transition(.25,true),.5);
  assert.equal(form.transition(.25,true),0);
  assert.equal(form.transition(3,true),0);
  assert.equal(form.transition(.25,false),1);
  form.transition(.1,true);form.reset();assert.equal(form.amount,0);assert.equal(form.mesh.visible,false);
});
test('shadow smoke only emits while shadowed, fades out, and has a bounded pool',()=>{
  const form=new RabbitShadowForm(new THREE.Scene()),point=new THREE.Vector3();
  form.transition(.5,true);form.update(.3,point,true,800);assert.ok(form.particles.length>0);
  form.update(.3,point,true,800);assert.ok(form.particles.length<=24);
  form.transition(.25,false);form.update(2,point,false,800);assert.equal(form.mesh.visible,false);
});
