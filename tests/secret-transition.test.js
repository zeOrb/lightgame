import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RabbitAnimation} from '../src/rabbit-animation.js';
import {createRabbitTraveler} from '../src/rabbit-model.js';
import {secretTransition,applySecretTransition} from '../src/secret-transition.js';

test('terrain slip stretches only the visual, releases smoothly and resets at several frame rates',()=>{
  for(const fps of [30,60,144]){
    const root=new THREE.Group(),visual=new THREE.Group();root.add(visual);root.position.set(4,5,6);
    const material=new THREE.MeshStandardMaterial(),t=createRabbitTraveler(visual,material,material,material);
    const a=new RabbitAnimation(visual,t.ears,t.paws,t.coat,t.arms,t.head);
    a.slipThrough();
    for(let i=0;i<Math.ceil(fps*.12);i++)a.update(1/fps,{speed:0,height:1,velocity:0});
    assert.ok(visual.scale.y>1.15&&visual.scale.y<1.21);
    assert.ok(t.ears[0].rotation.x<-.3);assert.ok(t.paws[0].position.y<0);
    assert.deepEqual(root.position.toArray(),[4,5,6]);assert.equal(visual.rotation.z,0);
    for(let i=0;i<fps;i++)a.update(1/fps,{speed:0,height:1,velocity:0});
    assert.equal(a.slipWeight,0);assert.equal(visual.scale.y,1);
    a.slipThrough();a.update(.1,{speed:5,height:1,velocity:0,dashing:true});
    assert.equal(a.slipWeight,0,'dash has priority');
    a.reset();assert.equal(a.slipAge,1);assert.equal(a.slipWeight,0);assert.equal(visual.scale.y,1);
    a.slipThrough();a.updateFall(.1);assert.equal(a.slipAge,1);
  }
});

test('turf glow shares uniforms, follows the contact point and expires/reset without new materials',()=>{
  const shader={uniforms:{},vertexShader:'#include <defaultnormal_vertex>\n#include <project_vertex>',fragmentShader:'#include <emissivemap_fragment>'};
  applySecretTransition(shader);
  secretTransition.start(new THREE.Vector3(2,3,4));secretTransition.update(.1);
  assert.equal(shader.uniforms.secretPassAge.value,.1);
  secretTransition.follow(new THREE.Vector3(3,4,5));assert.deepEqual(shader.uniforms.secretPassCentre.value.toArray(),[3,4,5]);
  secretTransition.update(2);assert.equal(shader.uniforms.secretPassAge.value,1);
  secretTransition.start(new THREE.Vector3());secretTransition.reset();assert.equal(shader.uniforms.secretPassAge.value,1);
});
