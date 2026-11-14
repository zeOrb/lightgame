import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LightBarRecovery} from '../src/light-bar-recovery.js';
import {RabbitState} from '../src/rabbit-state.js';

test('absorbed glass triggers the same fill, hold and pulse as a shard',()=>{
  const rabbit=new RabbitState({maxHP:100,rayEntryHeal:.25});
  const bar=new LightBarRecovery(40);
  rabbit.setVitral({palette:[]});
  assert.ok(rabbit.pendingHeal>0);
  const hp=rabbit.updateLight(40,0,false);bar.receive(hp);
  assert.equal(bar.update(hp,100,.25),46.25);
  assert.equal(bar.update(hp,100,.25),65);
  assert.equal(bar.holding,true);bar.tick(.1);assert.ok(bar.scale>1);
  bar.tick(.1);assert.equal(bar.holding,false);
  bar.tick(.133);assert.equal(bar.scale,1);
});

test('another pickup continues from displayed light; reset clears the effect',()=>{
  const bar=new LightBarRecovery(30);bar.receive(50);bar.update(50,100,.2);
  const before=bar.displayed;bar.receive(70);assert.equal(bar.update(70,100,0),before);
  assert.equal(bar.update(70,100,.5),70);
  bar.reset(100);assert.equal(bar.scale,1);assert.equal(bar.holding,false);assert.equal(bar.displayed,100);
});
