import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GrassExitParticles} from '../src/grass-exit-particles.js';
import {SECRET_PASS_HEIGHT} from '../src/secret-transition.js';

test('each exit emits one grass burst at the world contact and fades completely',()=>{
  const particles=new GrassExitParticles(new THREE.Scene(),{random:()=>.5});
  const point=new THREE.Vector3(4,20,6);
  particles.updatePass(point,.04,.04,true);assert.equal(particles.mesh.count,0);
  particles.updatePass(point,.17,.01,true);const count=particles.mesh.count;
  assert.equal(count,15);assert.equal(particles.sources.length,0);
  for(const p of particles.particles.filter(p=>p.active)){
    assert.ok(Math.abs(p.position.x-point.x)<.3);assert.ok(Math.abs(p.position.z-point.z)<.3);
    assert.ok(p.position.y>point.y+SECRET_PASS_HEIGHT);assert.ok(p.velocity.y>0);
  }
  particles.updatePass(point,.25,.01,true);assert.equal(particles.mesh.count,count);
  for(let i=0;i<90;i++)particles.updatePass(new THREE.Vector3(40,20,60),1,1/60,true);
  assert.equal(particles.mesh.count,0);
  particles.updatePass(point,.02,.02,true);particles.updatePass(point,.18,.02,true);
  assert.equal(particles.mesh.count,count);particles.clear();assert.equal(particles.mesh.count,0);
  particles.updatePass(point,.8,.02,true);assert.equal(particles.mesh.count,0);
  particles.dispose();
});
