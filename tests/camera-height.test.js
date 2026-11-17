import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothCameraAnchor,railCameraHeight} from '../src/camera.js';

test('raised terrain is followed fully, and jumping does not discard its height',()=>{
 const grounded=railCameraHeight(7,7,0);assert.equal(grounded.target,7);
 const jump=railCameraHeight(8,null,grounded.groundLift);assert.equal(jump.target,7);
 const drop=railCameraHeight(4,null,grounded.groundLift);assert.equal(drop.target,4);
 assert.equal(railCameraHeight(0,null,4).target,0);
});
test('vertical camera lift converges smoothly without overshoot at different frame rates',()=>{
 for(const fps of [30,60,144]){let value=0,velocity=0,last=0;for(let i=0;i<fps;i++){({value,velocity}=smoothCameraAnchor(value,velocity,7,1/fps,9));assert.ok(value>=last-1e-8&&value<7);last=value;}assert.ok(Math.abs(value-7)<.02);}
});
