import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RabbitState,RabbitMode} from '../src/rabbit-state.js';
import {PASSIVE_LIGHT_DRAIN} from '../src/game.js';

test('rabbit states own vitral healing and leave it when the zone ends',()=>{
  const rabbit=new RabbitState();assert.equal(rabbit.mode,RabbitMode.NORMAL);
  assert.equal(rabbit.updateLight(50,1,false),50-PASSIVE_LIGHT_DRAIN);
  const zone={palette:[]};rabbit.setVitral(zone);assert.equal(rabbit.mode,RabbitMode.VITRAL);
  assert.equal(rabbit.updateLight(50,1,false),56.25);
  rabbit.setVitral(null);assert.equal(rabbit.mode,RabbitMode.NORMAL);
});
test('continuous vitral exposure restores zero to full in four seconds at different frame rates',()=>{
  for(const fps of [25,60,144]){
    const rabbit=new RabbitState();let light=0;const gains=[];
    for(let second=0;second<4;second++){
      const before=light;
      for(let frame=0;frame<fps;frame++){rabbit.setVitral({});light=rabbit.updateLight(light,1/fps,false);}
      gains.push(light-before);
    }
    assert.ok(Math.abs(light-100)<1e-8);assert.ok(gains.every((gain,i)=>!i||gain>gains[i-1]));
    rabbit.setVitral(null);assert.equal(rabbit.vitralTime,0);
    rabbit.setVitral({});assert.equal(rabbit.updateLight(0,1,false),6.25);
  }
});
test('falling cannot heal, lose HP or reenter a vitral before reaching the bottom',()=>{
  for(const outward of [false,true])for(const fps of [25,60,144]){
    const rabbit=new RabbitState();rabbit.setVitral({});rabbit.startFall({x:12,y:100,z:0},outward);
    assert.equal(rabbit.mode,RabbitMode.FALLING);let light=3;
    for(let frame=0;frame<fps*12&&!rabbit.fall.done;frame++){
      rabbit.setVitral({});light=rabbit.updateLight(light,1/fps,true);rabbit.updateFall(1/fps);
      assert.equal(light,3);assert.equal(rabbit.mode,RabbitMode.FALLING);
      assert.ok(rabbit.fall.radius>=5&&rabbit.fall.radius<=18);
    }
    assert.ok(rabbit.fall.done);assert.ok(rabbit.fall.landed);assert.equal(rabbit.fall.y,.35);assert.equal(rabbit.fall.dissolve,1);
    assert.equal(rabbit.fall.wallHit,outward);
    rabbit.reset();assert.equal(rabbit.mode,RabbitMode.NORMAL);assert.equal(rabbit.fall,null);
  }
});
