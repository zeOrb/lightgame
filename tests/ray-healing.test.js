import test from 'node:test';
import assert from 'node:assert/strict';
import {RabbitState,traceVitralPath,RabbitMode} from '../src/rabbit-state.js';
import {skillStats,SkillProgression} from '../src/progression.js';
import {TOWER_TOP,PASSIVE_LIGHT_DRAIN} from '../src/game.js';

const upgrades=tier=>skillStats({owned:['rayRegen','rayEntry','rayDash'].slice(0,tier)});

test('the new healing branch unlocks sequentially and its first tier accelerates ray recovery',()=>{
  const p=new SkillProgression();for(let i=0;i<4;i++)p.award();p.buy('source');
  assert.equal(p.buy('rayEntry'),false);assert.ok(p.buy('rayRegen'));assert.ok(p.buy('rayEntry'));assert.ok(p.buy('rayDash'));
  const base=new RabbitState(),fast=new RabbitState(upgrades(1)),zone={};
  base.setVitral(zone,false,true);fast.setVitral(zone,false,true);
  assert.ok(fast.updateLight(20,1,false)>base.updateLight(20,1,false));
});

test('entry healing is exactly 25 per ray per run, caps at max HP and replaces ongoing recovery at all frame rates',()=>{
  for(const fps of [25,60,144]){
    const r=new RabbitState(upgrades(2)),zone={};r.setVitral(zone,false,true);
    let light=r.updateLight(50,0,false);assert.equal(light,75);
    for(let i=0;i<fps;i++){r.setVitral(zone,false,true);light=r.updateLight(light,1/fps,false);}
    assert.ok(Math.abs(light-(75-PASSIVE_LIGHT_DRAIN))<1e-8);
    r.setVitral(null);r.setVitral(zone,false,true);assert.equal(r.updateLight(light,0,false),light);
    r.setVitral(null);r.setVitral({},false,true);assert.equal(r.updateLight(95,0,false),100);
    r.reset();r.setVitral(zone,false,true);assert.equal(r.updateLight(50,0,false),75);
  }
});

test('dashing through a ray awards entry plus dash once, including when both frame endpoints miss the light',()=>{
  const r=new RabbitState(upgrades(3)),zone={};
  traceVitralPath(r,0,3,0,0,p=>{const s=(TOWER_TOP-p.y)*2;return s>1&&s<1.5?zone:null;});
  assert.equal(r.mode,RabbitMode.NORMAL);assert.equal(r.updateLight(20,0,false),70);
  traceVitralPath(r,3,0,0,0,p=>{const s=(TOWER_TOP-p.y)*2;return s>1&&s<1.5?zone:null;});
  assert.equal(r.updateLight(10,0,false),10);
  const secondZone={};r.setVitral(secondZone,false,true);let light=r.updateLight(10,0,false);assert.equal(light,35);
  r.setVitral(secondZone,true);light=r.updateLight(light,0,false);assert.equal(light,60);
  for(let i=0;i<20;i++){r.setVitral(null);r.setVitral(secondZone,true);light=r.updateLight(light,0,false);}
  assert.equal(light,60);
  r.reset();r.setVitral(zone,true);assert.equal(r.updateLight(10,0,false),60);
  r.startFall({x:12,y:100,z:0},false);r.setVitral(zone,true);assert.equal(r.updateLight(10,1,false),10);
});

test('walking through a ray preserves its one-time jump and dash bonuses without healing',()=>{
  const r=new RabbitState(upgrades(3)),zone={};
  r.setVitral(zone);assert.equal(r.updateLight(20,0,false),20);assert.equal(r.entryHealedZones.size,0);
  r.setVitral(null);r.setVitral(zone);assert.equal(r.updateLight(20,1,false),20-PASSIVE_LIGHT_DRAIN);
  r.setVitral(zone,false,true);assert.equal(r.updateLight(20,0,false),45);
  r.setVitral(zone,true);assert.equal(r.updateLight(20,0,false),45);
});

test('instant healing retains its own vitral palette for 1.5 seconds after exit and cannot be refreshed by a spent ray',()=>{
  const r=new RabbitState(upgrades(3)),palette=['gold','pink'],zone={palette};
  r.setVitral(zone,false,true);r.updateLight(20,0,false);r.setVitral(null);
  assert.equal(r.lightCharge,1.5);assert.equal(r.chargeZone.palette,palette);
  r.updateLight(50,1,false);assert.equal(r.lightCharge,.5);
  r.setVitral(zone,false,true);assert.equal(r.lightCharge,.5);
  r.updateLight(50,.5,false);assert.equal(r.lightCharge,0);
  r.reset();assert.equal(r.lightCharge,0);assert.equal(r.chargeZone,null);
});
