import {test} from 'node:test';
import assert from 'node:assert/strict';
import {InputManager} from '../src/input/input-manager.js';
const frame=(held=[],pressed=[],uiPressed=[],uiHeld=[])=>({focused:true,held:new Set(held),pressed:new Set(pressed),uiPressed:new Set(uiPressed),uiHeld:new Set(uiHeld),activity:false,scheme:'keyboardMouse'});
test('global context runs before rebinding, modal screens and inactive application state',()=>{
 const input=new InputManager(),order=[];let modal=true;
 input.register({id:'global',map:'global',priority:2000,modal:false,enabled:()=>true,handle:s=>order.push(['global',s.focused])});
 input.register({id:'capture',map:'ui',priority:1000,enabled:()=>modal,handle:()=>order.push(['capture'])});
 input.register({id:'game',map:'gameplay',priority:0,enabled:()=>true,handle:()=>order.push(['game'])});
 input.update(frame());assert.deepEqual(order,[['global',true],['capture']]);order.length=0;
 input.update({...frame(),focused:false});assert.deepEqual(order,[['global',false]]);order.length=0;
 modal=false;input.update(frame());assert.deepEqual(order,[['global',true],['game']]);
});
test('modal contexts consume input independently from any gameplay state',()=>{
 const input=new InputManager(),calls=[];let screen='gameplay',rebinding=false;
 input.register({id:'gameplay',map:'gameplay',priority:0,enabled:()=>true,handle:s=>calls.push(s.context)});
 input.register({id:'upgrades',map:'ui',priority:800,enabled:()=>screen==='upgrades',handle:s=>calls.push(s.context)});
 input.register({id:'settings',map:'ui',priority:900,enabled:()=>screen==='settings',handle:s=>calls.push(s.context)});
 input.register({id:'rebinding',map:'ui',priority:1000,enabled:()=>rebinding,handle:s=>calls.push(s.context),handleRaw:c=>c.code==='KeyF'});
 for(const value of ['gameplay','upgrades','settings','upgrades','gameplay','upgrades']){screen=value;input.update(frame());assert.equal(calls.at(-1),value);}
 rebinding=true;input.update(frame());assert.equal(calls.at(-1),'rebinding');assert.equal(input.dispatchRaw({code:'KeyF'}),true);
 const count=calls.length;input.update({...frame(),focused:false});assert.equal(calls.length,count);
});
test('held confirmation cannot leak between screens; releasing rearms the new context',()=>{
 const input=new InputManager();let menu=false;const received=[];
 input.register({id:'game',map:'gameplay',priority:0,enabled:()=>!menu,handle:()=>{}});
 input.register({id:'menu',map:'ui',priority:10,enabled:()=>menu,handle:s=>received.push(s)});
 input.update(frame());input.update(frame(['jump'],['jump'],['submit'],['submit']));menu=true;
 input.update(frame(['jump'],[],[],['submit']));assert.equal(received.at(-1).held.size,0);assert.equal(received.at(-1).uiHeld.size,0);
 input.update(frame());input.update(frame(['jump'],['jump'],['submit'],['submit']));
 assert.ok(received.at(-1).uiPressed.has('submit'));assert.ok(received.at(-1).held.has('jump'));
 input.update(frame());assert.ok(received.at(-1).released.has('jump'));
});
test('control scheme changes repeatedly without disabling other sources',()=>{
 const input=new InputManager();let current;
 input.register({id:'game',priority:0,map:'gameplay',enabled:()=>true,handle:s=>{current=s;}});
 for(let i=0;i<50;i++)for(const scheme of ['keyboardMouse','xbox','playstation','touch']){
   input.update({...frame(),scheme,activity:true});input.update({...frame(['right'],['right']),scheme,activity:true});
   assert.equal(current.scheme,scheme);assert.equal(current.move.x,1);
   input.update(frame());
 }
});
