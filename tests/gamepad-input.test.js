import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GamepadInput,PAD_DEFAULTS,normalizePadBindings,padTokens,padFamily,gamepadWindowActive} from '../src/gamepad-input.js';
import {normalizeSettings,assignBinding} from '../src/settings-store.js';
const makePad=()=>({id:'Xbox Wireless Controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
test('repeated keyboard/mouse to controller transitions use native window focus and any active pad',()=>{
 const xbox=makePad(),ps=makePad();ps.id='DualSense Wireless Controller';ps.index=1;
 const input=new GamepadInput(),profiles=normalizeSettings().gamepads;
 input.poll([xbox,ps],profiles);
 for(let i=0;i<50;i++){
   // Keyboard/mouse leaves a DOM focus mismatch while the desktop window is active.
   const focused=gamepadWindowActive({hidden:false,documentFocused:false,desktopFocused:true});assert.equal(focused,true);
   const active=i%2?xbox:ps;active.buttons[0]={pressed:true,value:1};
   const result=input.poll([xbox,ps],profiles);
   assert.ok(result.pressed.has('jump'),'the first press takes over immediately, every time');
   assert.equal(result.family,i%2?'xbox':'playstation');
   active.buttons[0]={pressed:false,value:0};input.poll([xbox,ps],profiles);
 }
 assert.equal(gamepadWindowActive({hidden:false,documentFocused:true,desktopFocused:false}),false,'inactive native windows ignore input');
 assert.equal(gamepadWindowActive({hidden:true,documentFocused:true,desktopFocused:true}),false);
 assert.equal(gamepadWindowActive({hidden:false,documentFocused:false}),false,'web fallback keeps focus protection');
});
test('gamepad edges, deadzone, triggers, rebinding and disconnect do not stick',()=>{
 const pad=makePad(),input=new GamepadInput(),profiles=normalizeSettings().gamepads;
 input.poll([pad],profiles);pad.buttons[0]={pressed:true,value:1};
 let result=input.poll([pad],profiles);assert.ok(result.pressed.has('jump'));assert.ok(result.held.has('jump'));
 assert.equal(input.poll([pad],profiles).pressed.size,0);
 pad.buttons[0]={pressed:false,value:0};pad.axes[0]=.6;
 assert.ok(input.poll([pad],profiles).held.has('right'));
 pad.axes[0]=.4;assert.ok(input.poll([pad],profiles).held.has('right'));
 pad.axes[0]=.1;assert.equal(input.poll([pad],profiles).held.size,0);
 assignBinding(profiles.xbox,'jump',0,'b6');pad.buttons[6]={pressed:false,value:.8};
 assert.ok(input.poll([pad],profiles).pressed.has('jump'));
 assert.equal(input.poll([],profiles).held.size,0);
 assert.equal(input.poll([pad],profiles).pressed.size,0);
 assert.equal(profiles.playstation.jump[0],'b0');
});
test('profile migration, family detection and simultaneous raw inputs',()=>{
 assert.deepEqual(normalizePadBindings(null),PAD_DEFAULTS);
 assert.equal(padFamily('DualSense Wireless Controller (054c)'),'playstation');
 const p=makePad();p.axes[1]=-.8;p.buttons[5].pressed=true;
 assert.deepEqual([...padTokens(p)],['b5','a1-']);
 const bindings=normalizePadBindings({jump:['bogus','b100']});assert.deepEqual(bindings.jump,[]);
});
