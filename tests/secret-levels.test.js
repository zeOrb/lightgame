import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SecretLevels,SECRET_ROAD_ASSIST} from '../src/secret-levels.js';
import {PlatformerMotion} from '../src/platformer-motion.js';
import {route} from '../src/game.js';
const setup=()=>{const l=new SecretLevels(new THREE.Scene(),{carved:new THREE.MeshBasicMaterial()}),r=l.routes[0];l.reveal(r.s,1,0);return {l,r};};

test('jump landing followed by running uphill never leaves feet below the road at low or high FPS',()=>{
 const {l,r}=setup();let landings=0;
 for(const fps of [20,30,60,144])for(const direction of [-1,1])for(const lane of [-.8,0,.8])for(const offset of [1,2,3,4]){
  let s=r.s+offset,p=route(s,lane),top=r.road.heightAt(p);if(top===null)continue;
  let height=top-p.y,velocity=13,landed=false;const motion=new PlatformerMotion();
  for(let frame=0;frame<fps*2;frame++){
   const dt=1/fps,before=route(s,lane),previousFoot=before.y+height,old=l.support(before,previousFoot);
   s+=direction*1.6*dt;const after=route(s,lane);top=r.road.heightAt(after);if(top===null)break;
   const surface=l.support(after,previousFoot,old&&velocity<=0?.52:0);
   if(surface&&old&&velocity<=0){height=surface.y-after.y;velocity=0;}else if(old||height>.001)height=Math.max(0,previousFoot-after.y);
   const ground=surface?surface.y-after.y:0,grounded=!!surface&&Math.abs(height-ground)<.03&&velocity<=0;
   const step=motion.jumpStep(height-ground,velocity,dt,true);height=step.height+ground;velocity=step.velocity;
   if(grounded&&velocity<=0){height=ground;velocity=0;}
   const hit=grounded?null:l.land(previousFoot,after.y+height,velocity,after,before);
   if(hit){height=hit.y-after.y;velocity=0;landed=true;landings++;}
   if(grounded)landed=true;
   if(landed)assert.ok(after.y+height>=top-1e-6,`fps=${fps}, direction=${direction}, lane=${lane}, frame=${frame}`);
  }
 }
 assert.ok(landings>20,'exercise actual swept jump landings, not only standing support');
});
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

test('near-miss upward jumps are lifted smoothly onto the road at multiple frame rates',()=>{
 for(const fps of [30,60,144]){
  const {l,r}=setup(),p=r.points[3].clone(),top=r.road.heightAt(p),original=p.clone();
  let foot=top-1.1,velocity=1,landed=false,previous=foot-.02;
  for(let i=0;i<fps&&!landed;i++){
   const before=foot;foot+=velocity/fps;velocity-=20/fps;
   const lift=l.assistUp(p,i?before:previous,foot,velocity,1/fps);
   assert.ok(lift);assert.ok(lift.y>=before-1e-8);assert.ok(lift.y<=top+SECRET_ROAD_ASSIST.exitClearance+.001);assert.ok(lift.y-before<.4);
   foot=lift.y;velocity=lift.velocity;landed=lift.landed;
  }
  assert.ok(landed);assert.ok(Math.abs(foot-top-SECRET_ROAD_ASSIST.exitClearance)<1e-8);assert.equal(velocity,SECRET_ROAD_ASSIST.exitVelocity);assert.equal(l.assist,null);assert.equal(l.active,null);assert.deepEqual(p,original);
 }
});
test('assist does not grab a descending, distant, stationary or unrevealed player',()=>{
 const {l,r}=setup(),p=r.points[3],top=r.road.heightAt(p);
 assert.equal(l.assistUp(p,top-.9,top-1,-2,.016),null);
 assert.equal(l.assistUp(p,top-2.1,top-2,4,.016),null);
 assert.equal(l.assistUp(p,top-1,top-1,0,.016),null);
 const outside=p.clone().add(new THREE.Vector3(20,0,20));assert.equal(l.assistUp(outside,top-1.1,top-1,4,.016),null);
 r.road.reveal(0);assert.equal(l.assistUp(p,top-1.1,top-1,4,.016),null);
});
test('drop-through cancels assistance and moving off the road cancels without changing XZ',()=>{
 const {l,r}=setup(),p=r.points[3].clone(),top=r.road.heightAt(p);
 assert.ok(l.assistUp(p,top-1.1,top-1,3,.016));l.drop({route:r});assert.equal(l.assist,null);
 assert.equal(l.assistUp(p,top-1.1,top-1,3,.016),null);l.reveal(r.s,.5,1);
 assert.ok(l.assistUp(p,top-1.1,top-1,3,.016));p.x+=10;const before=p.clone();
 assert.equal(l.assistUp(p,top-1,top-.9,3,.016),null);assert.equal(l.assist,null);assert.deepEqual(p,before);
});
test('assistance preserves caller movement coordinates on a rotated road and resets with the run',()=>{
 const {l,r}=setup();r.group.rotation.y=.6;r.group.updateMatrixWorld(true);
 const p=r.group.localToWorld(r.points[3].clone()),top=r.road.heightAt(p),before=p.clone();
 assert.ok(l.assistUp(p,top-1.1,top-1,3,.016));assert.deepEqual(p,before);
 l.reset();assert.equal(l.assist,null);
});

test('a head crossing just before the apex still receives assistance',()=>{
 const {l,r}=setup(),p=r.points[3],top=r.road.heightAt(p);
 assert.ok(l.assistUp(p,top-1.002,top-1,-.1,1/30));
});

test('early support completion releases into a micro hop and naturally lands at different frame rates',()=>{
 for(const fps of [30,60,144]){
  const {l,r}=setup(),p=r.points[3].clone(),top=r.road.heightAt(p),original=p.clone();
  l.assistUp(p,top-1.1,top-1,2,1/fps);
  const exit=l.assistUp(p,top-.02,top,0,1/fps);
  assert.ok(exit.landed);assert.ok(exit.velocity>0);assert.equal(l.assist,null);
  const motion=new PlatformerMotion();let foot=exit.y,velocity=exit.velocity,peak=foot;
  for(let i=0;i<fps;i++){
   const previous=foot,step=motion.jumpStep(foot-top,velocity,1/fps,false);
   foot=top+step.height;velocity=step.velocity;peak=Math.max(peak,foot);
   if(velocity<=0&&foot<=top+.0001)break;
   assert.equal(l.assistUp(p,previous,foot,velocity,1/fps),null,'hop never starts another assist');
  }
  assert.ok(peak-top>.35&&peak-top<.4);assert.equal(foot,top);assert.equal(velocity,0);
  assert.deepEqual(p,original);assert.ok(l.support(p,foot));
 }
});
