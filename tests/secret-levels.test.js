import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SecretLevels} from '../src/secret-levels.js';
const setup=()=>{const l=new SecretLevels(new THREE.Scene(),{carved:new THREE.MeshBasicMaterial()}),r=l.routes[0];l.reveal(r.s,1,0);return {l,r};};
test('landing only reports the top surface without activating an arena or moving the player',()=>{
 const {l,r}=setup(),p=r.points[0].clone().add(new THREE.Vector3(.25,0,.15)),before=p.clone();
 const hit=l.land(p.y+.2,p.y-.1,-3,p);assert.ok(hit);assert.equal(hit.y,r.points[0].y);assert.equal(l.active,null);assert.deepEqual(p,before);assert.equal(r.used,false);
});
test('platforms pass upward jumps through and accept repeated downward crossings',()=>{
 const {l,r}=setup(),p=r.points[0];assert.equal(l.land(p.y-.1,p.y+.2,4,p),null);
 for(let i=0;i<4;i++)assert.ok(l.land(p.y+.2,p.y-.1,-3,p));
});
test('walking off a platform loses support without changing position',()=>{
 const {l,r}=setup(),p=r.points[0].clone();assert.ok(l.support(p,p.y));
 p.x+=5;const before=p.clone();assert.equal(l.support(p,p.y),null);assert.deepEqual(p,before);assert.equal(l.active,null);
});
test('down+jump suppresses the platform briefly, then it can be landed on again',()=>{
 const {l,r}=setup(),p=r.points[0],hit=l.support(p,p.y);l.drop(hit);assert.equal(l.support(p,p.y),null);assert.equal(l.land(p.y+.1,p.y-.1,-2,p),null);
 l.reveal(r.s,.5,1);assert.ok(l.land(p.y+.1,p.y-.1,-2,p));
});
test('continuous road follows the spiral and its rising surface',()=>{
 const {l,r}=setup();for(let i=1;i<r.points.length;i++){const p=r.points[i];assert.ok(Math.abs(Math.hypot(p.x,p.z)-15)<1e-8);assert.ok(Math.abs(l.support(p,p.y-.5,.52).y-p.y)<.025);}
});
test('only the portal starts the separate secret room',()=>{
 const {l,r}=setup(),p=r.points[12];assert.equal(l.enterPortal(r.points[0],r.points[0].y,r.s),null);assert.ok(l.enterPortal(p,p.y,r.s+6));assert.equal(l.active.stage,'portal');
});
