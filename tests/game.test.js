import { test } from 'node:test';
import assert from 'node:assert/strict';
import { END, route, gaps, isGap, lightStep, cameraAnchor, turnTowards, LANE_LIMIT, PASSIVE_LIGHT_DRAIN, VITRAL_LIGHT_REGEN } from '../src/game.js';
test('gaze turns smoothly along the shortest arc, including the angle wrap',()=>{
  const start=Math.PI-.1,target=-Math.PI+.1;
  const next=turnTowards(start,target,1/60);
  assert.ok(next>start&&next<Math.PI+.1);
  assert.equal(turnTowards(.7,.7,1/60),.7);
  let angle=0;for(let i=0;i<60;i++)angle=turnTowards(angle,Math.PI/2,1/60);
  assert.ok(Math.abs(angle-Math.PI/2)<.001);
  assert.ok(turnTowards(0,Math.PI/2,1/60)<Math.PI/4);
});
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraPose, smoothCameraAnchor } from '../src/camera.js';
test('camera holds a tower section and does not chatter when direction reverses',()=>{
  for(const s of [0,.5,1,1.7])assert.equal(cameraAnchor(s,0),0);
  assert.equal(cameraAnchor(1.8,0),2.2);
  assert.equal(cameraAnchor(1.7,2.2),2.2);
  assert.equal(cameraAnchor(.4,2.2),0);
  assert.ok(Math.abs(cameraAnchor(0,165))<1e-9);
});
test('rabbit stays within the screen through the full route, reversal and camera transitions',()=>{
  for(const aspect of [16/9,1,.5625]){
    const camera=new PerspectiveCamera(58,aspect,.1,240),target=new Vector3();let anchor=0,value=0,velocity=0;
    const initial=cameraPose(0,aspect);camera.position.copy(initial.position);target.copy(initial.target);
    const dt=1/60;
    for(const direction of [1,-1])for(let i=0;i<=Math.ceil(END/1.45/dt);i++){
      const distance=Math.min(END,i*1.45*dt),s=direction===1?distance:END-distance;
      anchor=cameraAnchor(s,anchor,aspect);
      const motion=smoothCameraAnchor(value,velocity,anchor,dt);value=motion.value;velocity=motion.velocity;
      const pose=cameraPose(value,aspect);
      camera.position.copy(pose.position);target.copy(pose.target);
      camera.lookAt(target);camera.updateMatrixWorld();
      for(const lane of [-LANE_LIMIT,LANE_LIMIT])for(const jump of [0,2.53]){
        const p=route(s,lane),screen=new Vector3(p.x,p.y+.7+jump,p.z).project(camera);
        assert.ok(Math.abs(screen.x)<.85&&Math.abs(screen.y)<.85&&screen.z<1,`offscreen: aspect=${aspect} s=${s} x=${screen.x} y=${screen.y}`);
      }
    }
  }
});
test('route descends continuously into the tower and reaches a distinct destination',()=>{
  for(let s=1;s<=END;s++)assert.equal(route(s).y,route(s-1).y-.5);
  assert.ok(route(END).y>0);assert.ok(route(END).y<20);
  assert.ok(Math.hypot(route(0).x-route(END).x,route(0).z-route(END).z)>1);
});
test('gaps have a safe approach and landing, and do not block the start or crystal',()=>{
  for(const s of gaps){assert.ok(isGap(s));assert.ok(!isGap(s-1));assert.ok(!isGap(s+1));}
  assert.ok(!isGap(0));assert.ok(!isGap(END));
});
test('vitral heals at twice the passive drain rate while all damage remains active',()=>{
  assert.equal(lightStep(100,1,{shadow:true}),52);
  assert.equal(VITRAL_LIGHT_REGEN,PASSIVE_LIGHT_DRAIN*2);
  assert.equal(lightStep(50,1,{vitral:true}),Math.min(100,50+PASSIVE_LIGHT_DRAIN));
  assert.equal(lightStep(100,1,{shadow:true,vitral:true}),Math.min(100,52+VITRAL_LIGHT_REGEN));
  assert.equal(lightStep(5,1,{shadow:true}),0);
  assert.equal(lightStep(100,1),100-PASSIVE_LIGHT_DRAIN);
});
