import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PickupEffects } from '../src/pickup-effects.js';

test('pickup contracts with cubic ease-in, bursts and releases transient scene objects',()=>{
  const scene=new THREE.Scene(),texture=new THREE.Texture();
  const effects=new PickupEffects(scene,texture);
  const shard=new THREE.Object3D();
  effects.collect(shard);
  effects.update(.29);
  assert.equal(shard.visible,true);
  assert.ok(Math.abs(shard.scale.x-.875)<1e-9,'halfway through ease-in most of the shard remains');
  effects.update(.29);
  assert.equal(shard.visible,false);
  assert.equal(shard.scale.x,0);
  assert.equal(scene.children.length,1,'burst continues after the shard collapses');
  effects.update(1);
  assert.equal(scene.children.length,0);
  assert.equal(effects.active.length,0);
  effects.collect(new THREE.Object3D());
  effects.clear();
  assert.equal(scene.children.length,0,'restart removes unfinished effects');
  texture.dispose();
});
