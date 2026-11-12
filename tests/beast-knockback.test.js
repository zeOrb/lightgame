import test from 'node:test';
import assert from 'node:assert/strict';
import {BeastKnockback} from '../src/beast-knockback.js';

test('beast contact throws the rabbit away onto the adjacent shelf with a short hop at any frame rate',()=>{
  for(const fps of [25,60,144])for(const side of [-1,1]){
    const k=new BeastKnockback();assert.ok(k.start(16+side*.7,16));
    let last=null,maxHeight=0;
    for(let i=0;i<fps;i++){const p=k.advance(1/fps);if(p){last=p;maxHeight=Math.max(maxHeight,p.height);assert.ok((p.s-16)*side>=.7-1e-8);}}
    assert.ok(Math.abs(last.s-(16+side))<1e-8);assert.ok(Math.abs(last.height)<1e-8);assert.ok(maxHeight>.4);
  }
});

test('contact cannot chain knockbacks immediately and reset clears movement and cooldown',()=>{
  const k=new BeastKnockback();assert.ok(k.start(15.3,16));assert.equal(k.start(15.3,16),false);
  k.advance(.3);assert.equal(k.start(15.3,16),false);k.advance(.6);assert.ok(k.start(16.7,16));
  k.reset();assert.equal(k.advance(.016),null);assert.ok(k.start(15.3,16));
});
