import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SkillTree} from '../src/skill-tree.js';
import {directionalTarget} from '../src/menu-gamepad-navigation.js';
import {InputManager} from '../src/input/input-manager.js';
import {padUIActions} from '../src/input/browser-input.js';
test('visible upgrade screen receives gamepad input after every run, regardless of won/lost state',()=>{
  const previousDocument=globalThis.document;
  const doc={activeElement:null};globalThis.document=doc;
  try{
    let bought=0,nextRuns=0;
    const node={hidden:false,disabled:false,closest:()=>null,click:()=>bought++,getBoundingClientRect:()=>({left:0,top:200,width:80,height:80})};
    const next={hidden:false,disabled:false,closest:()=>true,click:()=>nextRuns++,getBoundingClientRect:()=>({left:0,top:0,width:80,height:40})};
    const tree=Object.create(SkillTree.prototype);
    tree.element={hidden:false,querySelectorAll:()=>[next,node],querySelector:()=>next};
    tree.buttons=new Map([['source',node]]);tree.focusPadButton=b=>{doc.activeElement=b;};tree.renderDetail=()=>{};
    const input=new InputManager();let capturing=false;
    input.register({id:'tree',map:'ui',priority:800,enabled:()=>!tree.element.hidden,handle:sample=>tree.handleInput(sample)});
    input.register({id:'capture',map:'ui',priority:1000,enabled:()=>capturing,handle:()=>{}});
    const send=tokens=>input.update({tokens,focused:true,pressed:new Set(),held:new Set(),uiHeld:new Set(),uiPressed:padUIActions(tokens)});
    for(const state of ['lost','won','lost','won']){
      doc.activeElement=next;
      assert.equal(send(['b13']),true,state);assert.equal(doc.activeElement,node);
      send(['b0']);send(['b9']);assert.equal(doc.activeElement,next);send(['b0']);
    }
    assert.equal(bought,4);assert.equal(nextRuns,4);
    tree.element.hidden=true;assert.equal(send(['b0']),false);
    capturing=true;tree.element.hidden=false;
    send(['b0']);assert.equal(nextRuns,4,'settings capture wins over the tree');
  }finally{globalThis.document=previousDocument;}
});
test('spatial navigation respects direction rather than DOM insertion order',()=>{
 const current={id:'center',x:0,y:0},points=[current,{id:'up',x:0,y:-170},{id:'right',x:150,y:0},{id:'diagonal',x:100,y:250}];
 assert.equal(directionalTarget(current,points,1,0),'right');
 assert.equal(directionalTarget(current,points,0,-1),'up');
 assert.equal(directionalTarget(current,points,-1,0),null);
});
test('header navigation cycles explicitly and does not depend on graph coordinates',()=>{
 const old=globalThis.document;const doc={activeElement:null};globalThis.document=doc;
 try{
  const center={hidden:false,disabled:false,closest:selector=>selector==='.tree-header'},next={hidden:false,disabled:false,closest:selector=>selector==='.tree-header'};
  const node={hidden:false,disabled:false,closest:()=>null};
  const tree=Object.create(SkillTree.prototype);tree.element={hidden:false,querySelectorAll:()=>[center,next,node]};tree.buttons=new Map([['source',node]]);
  tree.focusPadButton=button=>{doc.activeElement=button;};doc.activeElement=center;
  const input=ui=>tree.handleInput({uiPressed:new Set([ui])});
  for(let i=0;i<5;i++){input('right');assert.equal(doc.activeElement,next);input('left');assert.equal(doc.activeElement,center);}
  input('left');assert.equal(doc.activeElement,next,'left wraps instead of getting stuck');
 }finally{globalThis.document=old;}
});
