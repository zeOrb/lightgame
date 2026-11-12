import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaRun,arenaLayout,arenaInput,ARENA_RADIUS} from '../src/arena-state.js';
import {FLOOR_COUNT,END,route} from '../src/game.js';
import {RabbitState} from '../src/rabbit-state.js';
import {Abilities,AbilityType} from '../src/abilities.js';
import * as THREE from 'three';
import {FloorArenas} from '../src/floor-arenas.js';

test('every floor has a central arena and a swept trigger before its exit, including the final crystal',()=>{
  const layout=arenaLayout();assert.equal(layout.length,FLOOR_COUNT);
  for(const a of layout){assert.equal(a.plank%14,13);assert.equal(a.y,route(a.plank).y);assert.ok(a.s<a.exitS);assert.ok(a.exitS<=END);}
  const run=new ArenaRun(),a=run.enter(10,15,route(10));assert.equal(a.index,0);
  assert.equal(run.enter(12,14,route(12)),null);
  for(let i=0;i<120;i++)run.transition(1/60);
  assert.equal(a.stage,'fighting');assert.ok(Math.hypot(run.player.x,run.player.z)<ARENA_RADIUS);
});
test('walking, diagonal input and a full world-space dash stay inside the locked arena at every frame rate',()=>{
  for(const fps of [30,60,144]){
    const run=new ArenaRun();run.enter(12,13,route(12));run.transition(2);
    const input=arenaInput(new Set(['KeyW','KeyD']),{x:0,z:-1});assert.ok(input.x>0&&input.z<0);assert.ok(Math.abs(Math.hypot(input.x,input.z)-1)<1e-9);
    for(let i=0;i<fps*5;i++)run.move(input.x*5/fps,input.z*5/fps);
    const abilities=new Abilities();abilities.use(AbilityType.PHASING,{direction:input,distance:20});
    for(let i=0;i<fps;i++){const d=abilities.advance(1/fps);if(d)run.move(d.x,d.z);assert.ok(Math.hypot(run.player.x,run.player.z)<=ARENA_RADIUS-.45+1e-9);}
    assert.equal(run.tryExit(),false);assert.equal(run.active.stage,'fighting');
  }
});
test('victory unlocks the return bridge, completed arenas never retrigger, reset locks them again',()=>{
  const run=new ArenaRun(),a=run.enter(12,13,route(12));run.transition(2);
  const p=route(a.exitS),r=Math.hypot(p.x,p.z);run.player.x=p.x/r*(ARENA_RADIUS-1);run.player.z=p.z/r*(ARENA_RADIUS-1);
  assert.equal(run.tryExit(),false);assert.equal(run.clear(),true);assert.equal(run.tryExit(),true);
  assert.equal(run.transition(2),a.exitS);assert.equal(run.active,null);assert.equal(run.enter(12,14,route(12)),null);
  run.reset();assert.ok(run.enter(12,14,route(12)));
});
test('arena suspends passive light drain without suppressing enemy damage or consuming a heal',()=>{
  const state=new RabbitState();assert.equal(state.updateLight(70,5,false,{passive:false}),70);
  assert.equal(state.updateLight(70,1,true,{passive:false}),22);
  assert.equal(state.updateLight(70,1,false),58);
});
test('boss takes multiple hits, two random beasts must also die, and falling hides every arena',()=>{
  const previous=globalThis.document;
  const gradient={addColorStop(){}};
  const ctx=new Proxy({createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
  globalThis.document={createElement:()=>({width:64,height:64,getContext:()=>ctx})};
  try{
    const system=new FloorArenas(new THREE.Scene(),{carved:new THREE.MeshStandardMaterial(),bronze:new THREE.MeshStandardMaterial()},[new THREE.Color('#ffe799')]);
    const a=system.enter(12,13,route(12));system.update(2,0);assert.equal(a.stage,'fighting');
    assert.equal(a.enemies.length,3);const boss=a.enemies[0];assert.equal(boss.boss,true);assert.equal(boss.hp,3);
    assert.equal(system.hit(boss,null),true);assert.equal(boss.dead,false);assert.equal(system.hit(boss,null),false);
    for(let i=0;i<2;i++){boss.hurt=0;system.hit(boss,null);}assert.equal(boss.dead,true);
    system.update(.016,0,{height:3});assert.equal(a.stage,'fighting');
    for(const beast of a.enemies.slice(1))system.hit(beast,null);
    system.update(.016,0,{height:3});assert.equal(a.stage,'cleared');assert.equal(a.living,0);
    system.setFallHidden(true);assert.ok(system.arenas.every(arena=>!arena.group.visible));assert.ok(a.enemies.every(b=>!b.o.visible));
    system.setFallHidden(false);assert.equal(a.group.visible,true);
    system.reset();assert.equal(system.active,null);assert.ok(system.arenas.every(arena=>!arena.cleared));
    const replay=system.enter(12,13,route(12));assert.equal(replay.enemies[0].hp,3);assert.equal(replay.enemies[0].dead,false);
  }finally{globalThis.document=previous;}
});
