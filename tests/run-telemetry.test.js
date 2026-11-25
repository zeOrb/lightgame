import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RunTelemetry} from '../src/run-telemetry.js';
test('run clock excludes menus and retains elapsed time through slow gameplay frames',()=>{
 const t=new RunTelemetry();t.clock(0,false);t.clock(1500,true);t.clock(2500,false);t.clock(3500,false);t.clock(4000,true);assert.equal(t.elapsed,2);t.finish('lost');t.clock(8000,true);assert.equal(t.elapsed,2);
});
test('events build coherent totals, preserve timing, deduplicate floor completions and freeze on finish',()=>{
 const t=new RunTelemetry();t.reset({seed:'test'});t.clock(0,true);t.clock(1000,true);t.emit('gem.collected');t.emit('points.earned',{amount:4});t.emit('enemy.killed',{count:2});t.emit('item.acquired',{id:'moon-clover'});t.floorCompleted('first',10);t.floorCompleted('first',10);
 const result=t.finish('won');assert.deepEqual(result.totals,{gems:1,points:4,kills:2});assert.equal(result.duration,1);assert.equal(result.events.filter(e=>e.type==='floor.completed').length,1);assert.equal(t.emit('gem.collected'),null);assert.deepEqual(t.finish('lost'),result);
 result.events[0].data.count=900;assert.equal(t.snapshot().events[0].data.count,undefined);t.reset();assert.equal(t.snapshot().totals.gems,0);assert.equal(t.snapshot().events.length,0);
});
test('new gameplay data extends the same pipeline without changing the collector',()=>{
 const t=new RunTelemetry();t.register('chests',{opened:0},(value,e)=>{if(e.type==='chest.opened')value.opened++;return value;});const data={tier:'rare'};t.emit('chest.opened',data);data.tier='changed';assert.equal(t.snapshot().totals.chests.opened,1);assert.equal(t.snapshot().events[0].data.tier,'rare');t.reset();assert.equal(t.snapshot().totals.chests.opened,0);assert.throws(()=>t.register('gems',0,()=>0),/Duplicate/);
});
