import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VitralGlow} from '../src/vitral-glow.js';

test('gleam activation keeps the scene light count stable and reset extinguishes lights',()=>{
 const scene=new THREE.Scene(),glow=new VitralGlow(scene,new THREE.Texture());
 const count=()=>{let n=0;scene.traverseVisible(o=>{if(o.isLight)n++;});return n;};
 assert.equal(count(),2);assert.equal(glow.group.visible,false);
 glow.update(.016,{palette:[new THREE.Color('red'),new THREE.Color('blue')],lightStrength:1},1,0);
 assert.equal(count(),2);assert.ok(glow.lights.every(l=>l.intensity>0));
 glow.reset();assert.equal(count(),2);assert.ok(glow.lights.every(l=>l.intensity===0));
});
