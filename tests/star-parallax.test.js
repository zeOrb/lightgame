import test from 'node:test';
import assert from 'node:assert/strict';
import {ParallaxMotion} from '../src/star-parallax.js';

test('star motion eases continuously toward drag position with the same timing at different refresh rates',()=>{
  const results=[];
  for(const fps of [30,60,144]){
    const m=new ParallaxMotion();m.drag(200,-100);
    assert.equal(m.x,0);assert.equal(m.vx,0);
    let previous=0;
    for(let i=0;i<fps/2;i++){m.update(1/fps);assert.ok(m.x>=previous&&m.x<=200);previous=m.x;}
    assert.ok(Math.abs(m.x-200)<.001);assert.ok(Math.abs(m.y+100)<.001);results.push(m.x);
  }
  assert.ok(Math.max(...results)-Math.min(...results)<1e-8);
});

test('new pointer events preserve current motion and stopping settles without drift or invalid time',()=>{
  const m=new ParallaxMotion();m.drag(40,0);m.update(.016);
  const x=m.x,v=m.vx;m.drag(10,0);assert.equal(m.x,x);assert.equal(m.vx,v);
  m.update(0);m.update(-1);assert.equal(m.x,x);
  for(let i=0;i<90;i++)m.update(1/60);
  assert.ok(Math.abs(m.x-50)<1e-8);assert.ok(Math.abs(m.vx)<1e-8);
});
