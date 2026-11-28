import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PickupEffects} from '../src/pickup-effects.js';
import {VitralEntryEffects} from '../src/vitral-entry-effects.js';
test('pickup warmup keeps GPU resources for repeated groups and awards once',()=>{
 const scene=new THREE.Scene(),effects=new PickupEffects(scene,new THREE.Texture());effects.prepareWarmup();const resources=effects.active.map(e=>e.resources);let disposals=0;for(const r of resources){r.orb.material.addEventListener('dispose',()=>disposals++);r.trail.geometry.addEventListener('dispose',()=>disposals++);r.impact.material.addEventListener('dispose',()=>disposals++);assert.ok(r.trail.geometry.drawRange.count>0);}effects.clear();assert.equal(effects.pool.length,8);
 let awards=0;for(let i=0;i<6;i++)effects.collect(new THREE.Object3D(),()=>awards++);assert.ok(effects.active.every(e=>resources.includes(e.resources)));effects.update(10);effects.update(1);assert.equal(awards,6);assert.equal(effects.pool.length,8);assert.equal(disposals,0);assert.equal(scene.children.length,0);
 effects.collect(new THREE.Object3D());assert.equal(effects.active[0].impact.mesh.visible,false);assert.equal(effects.active[0].trail.points.length,0);effects.clear();
});
test('vitral entry allocates its instance-color shader variant before first activation',()=>{
 const scene=new THREE.Scene(),fx=new VitralEntryEffects(scene);const colors=fx.pool.map(e=>e.mesh.instanceColor);assert.ok(colors.every(Boolean));fx.sample(new THREE.Vector3(),{});assert.equal(fx.pool[0].mesh.instanceColor,colors[0]);
});
