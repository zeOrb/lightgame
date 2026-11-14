import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ArenaCameraCutaway} from '../src/arena-camera-cutaway.js';
import {ARENA_RADIUS} from '../src/arena-state.js';

test('arena cutaway removes near tower walls at wide and portrait framing without changing camera',()=>{
  const renderer={clippingPlanes:[]},cutaway=new ArenaCameraCutaway(renderer);
  for(const aspect of [16/9,985/837,.8,.5])for(const theta of [0,1.2,3.5]){
    const camera=new THREE.PerspectiveCamera(58,aspect,.1,240),zoom=Math.max(1,1.4/aspect);
    camera.position.set(Math.cos(theta)*14*zoom,93.5+12*zoom,Math.sin(theta)*14*zoom);
    camera.lookAt(0,94,0);
    const position=camera.position.clone(),rotation=camera.quaternion.clone(),projection=camera.projectionMatrix.clone();
    cutaway.update({y:93.5},camera,ARENA_RADIUS);
    const point=(r,y=100)=>new THREE.Vector3(Math.cos(theta)*r,y,Math.sin(theta)*r);
    assert.ok(cutaway.plane.distanceToPoint(point(19))<0,'near tower wall is clipped');
    assert.ok(cutaway.plane.distanceToPoint(point(-19))>0,'far library wall remains visible');
    for(let i=0;i<32;i++)assert.ok(cutaway.plane.distanceToPoint(new THREE.Vector3(Math.cos(i)*ARENA_RADIUS,93.5,Math.sin(i)*ARENA_RADIUS))>0,'entire arena remains visible');
    assert.deepEqual(camera.position.toArray(),position.toArray());assert.deepEqual(camera.quaternion.toArray(),rotation.toArray());assert.deepEqual(camera.projectionMatrix.elements,projection.elements);assert.equal(camera.fov,58);
  }
});

test('cutaway preserves other clipping planes and restores them on exit',()=>{
  const original=[new THREE.Plane(new THREE.Vector3(0,1,0),10)],renderer={clippingPlanes:original};
  const cutaway=new ArenaCameraCutaway(renderer),camera=new THREE.PerspectiveCamera();camera.position.set(0,20,24);
  cutaway.update({y:10},camera,ARENA_RADIUS);cutaway.update({y:3},camera,ARENA_RADIUS);
  assert.equal(renderer.clippingPlanes.length,2);assert.equal(renderer.clippingPlanes[0],original[0]);
  cutaway.update(null,camera,ARENA_RADIUS);assert.equal(renderer.clippingPlanes,original);
});
