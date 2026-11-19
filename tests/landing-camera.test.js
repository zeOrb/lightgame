import test from 'node:test';
import assert from 'node:assert/strict';
import {LandingCameraBlend} from '../src/camera.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const pose=(t)=>({position:{x:Math.cos(t)*15,y:80,z:Math.sin(t)*15},target:{x:Math.cos(t)*12,y:74,z:Math.sin(t)*12}});
test('landing starts at the exact falling view even when the floor camera is on the opposite side',()=>{
  const blend=new LandingCameraBlend(),from={position:{x:-3,y:90,z:-12},target:{x:-14,y:82,z:2}};
  blend.begin(from.position,from.target);
  const desired=pose(1.7);blend.apply(desired.position,desired.target,1/30);
  assert.ok(distance(desired.position,from.position)<1e-10);
  assert.ok(distance(desired.target,from.target)<1e-10);
});
test('blend finishes continuously while the landed floor keeps rotating at different frame rates',()=>{
  for(const fps of [30,60,144]){
    const blend=new LandingCameraBlend(),initial={position:{x:-3,y:90,z:-12},target:{x:-14,y:82,z:2}};
    blend.begin(initial.position,initial.target);
    let last=initial,maxStep=0;
    for(let i=0;i<=fps*1.1;i++){
      const t=i/fps,current=pose(t*.52);
      blend.apply(current.position,current.target,1/fps);
      maxStep=Math.max(maxStep,distance(current.position,last.position));last=current;
      if(t>1){assert.ok(distance(current.position,pose(t*.52).position)<1e-10);}
    }
    assert.equal(blend.from,null);assert.ok(maxStep<2.5);
  }
});
test('a second landing restarts from the current view and reset leaves normal camera untouched',()=>{
 const blend=new LandingCameraBlend(),a=pose(0),b=pose(2);
 blend.begin(a.position,a.target);blend.apply(b.position,b.target,.1);
 blend.begin(b.position,b.target);const c=pose(3);blend.apply(c.position,c.target,.1);
 assert.ok(distance(c.position,b.position)<1e-10);
 blend.reset();const d=pose(4),expected=structuredClone(d);blend.apply(d.position,d.target,.1);assert.deepEqual(d,expected);
});
