import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SkillProgression,skillStats} from '../src/progression.js';
import {Abilities,AbilityType} from '../src/abilities.js';
import {RabbitState,traceVitralPath} from '../src/rabbit-state.js';

test('dash and Gleam are two ordered purchases; locked dash cannot use recovery cancel',()=>{
  const p=new SkillProgression();p.award(100);
  const locked=new Abilities(skillStats(p.state));
  assert.equal(locked.use(AbilityType.PHASING),null);
  assert.equal(locked.use(AbilityType.PHASING,{recoveryCancel:true}),null);
  assert.equal(p.buy('gleamDash'),false);p.buy('source');assert.equal(p.buy('unlockDash'),true);
  const normal=skillStats(p.state);assert.equal(normal.gleamDash,false);
  assert.ok(new Abilities(normal).use(AbilityType.PHASING));
  assert.equal(p.buy('gleamDash'),true);assert.equal(skillStats(p.state).gleamDash,true);
});

test('ordinary dash has no colored death; Gleam charges independently of healing, persists and expires',()=>{
  const zone={palette:['red','blue'],lightStrength:1},plain=new RabbitState({dashEnabled:true});
  plain.setVitral(zone,true);assert.equal(plain.dashPalette,null);
  const charged=new RabbitState({dashEnabled:true,gleamDash:true});
  charged.setVitral(zone,true);assert.equal(charged.pendingHeal,0);assert.equal(charged.dashPalette,zone.palette);
  charged.setVitral(null);charged.updateLight(100,1,false);assert.equal(charged.dashPalette,zone.palette);
  charged.updateLight(100,.51,false);assert.equal(charged.dashPalette,null);
  charged.setVitral(zone);charged.startFall({x:10,y:10,z:0},true);assert.equal(charged.dashPalette,null);
});

test('a fast dash captures Gleam even when both endpoints are outside the stained-glass ray',()=>{
  const state=new RabbitState({dashEnabled:true,gleamDash:true}),zone={palette:['gold']};let samples=0;
  traceVitralPath(state,0,1,0,.2,()=>++samples===4?zone:null);
  assert.equal(state.zone,null);assert.equal(state.dashPalette,zone.palette);
});
