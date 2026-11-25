import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RunHistory,RUN_HISTORY_KEY} from '../src/run-history.js';
import {RunTelemetry} from '../src/run-telemetry.js';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
function run(id){const t=new RunTelemetry();t.reset({runId:id,seed:'same-seed'});t.clock(0,true);t.clock(10000,true);t.emit('gem.collected');t.emit('points.earned',{amount:5});t.emit('enemy.killed',{count:2});t.emit('item.acquired',{id:'moon-clover'});t.floorCompleted('floor-1',10);t.floorCompleted('floor-1',10);return t.finish('won');}
test('only five detailed runs survive, lifetime totals retain all runs and reload from the save',()=>{
 const save=storage(),history=new RunHistory(save);for(let i=0;i<7;i++)assert.equal(history.record(run('run-'+i),{date:'2026-11-25T12:00:00Z'}),true);
 const snapshot=history.snapshot();assert.deepEqual(snapshot.recent.map(r=>r.id),['run-6','run-5','run-4','run-3','run-2']);assert.equal(snapshot.lifetime.runs,7);assert.equal(snapshot.lifetime.wins,7);assert.equal(snapshot.lifetime.duration,70);assert.equal(snapshot.lifetime.floors,7);assert.deepEqual(snapshot.lifetime.totals,{gems:7,points:35,kills:14});assert.equal(snapshot.lifetime.items['moon-clover'],7);
 assert.deepEqual(new RunHistory(save).snapshot(),snapshot);assert.equal(history.record(run('run-6')),false);assert.deepEqual(history.snapshot(),snapshot);snapshot.recent[0].events.length=0;assert.notEqual(history.snapshot().recent[0].events.length,0);
});
test('corrupt saves and unavailable browser storage do not block gameplay',()=>{
 const save=storage();save.setItem(RUN_HISTORY_KEY,'{broken');const h=new RunHistory(save);assert.equal(h.snapshot().lifetime.runs,0);save.setItem(RUN_HISTORY_KEY,JSON.stringify({version:1,recent:[],lifetime:{runs:-2}}));assert.equal(new RunHistory(save).snapshot().lifetime.runs,0);
 const unavailable=new RunHistory({getItem(){throw Error('blocked')},setItem(){throw Error('full')}});assert.equal(unavailable.record(run('offline')),true);assert.equal(unavailable.saved,false);assert.equal(unavailable.snapshot().lifetime.runs,1);
});
test('partial runs cannot enter history and newly registered numeric metrics aggregate automatically',()=>{
 const h=new RunHistory();assert.throws(()=>h.record({meta:{runId:'unfinished'},duration:1,totals:{},events:[]}),/Invalid/);
 const t=new RunTelemetry();t.register('chests',0,(value,event)=>value+(event.type==='chest.opened'?1:0));t.reset({runId:'extended'});t.emit('chest.opened');h.record(t.finish('lost'));assert.equal(h.snapshot().lifetime.totals.chests,1);
});
