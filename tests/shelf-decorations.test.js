import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createShelfDecorations} from '../src/shelf-decorations.js';
import {SHELF_OUTER_RADIUS} from '../src/game.js';

test('random shelf props stay above the tread, clear the walking line and travel with their shelf',()=>{
  const previous=globalThis.document,context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,key)=>o[key]??(()=>{})});
  globalThis.document={createElement:()=>({getContext:()=>context})};
  try{
    const decorate=createShelfDecorations(),types=new Set();
    for(let s=0;s<120;s++){
      const shelf=new THREE.Group(),prop=decorate(shelf,s);if(!prop)continue;
      types.add(prop.name);const before=new THREE.Box3().setFromObject(prop);
      assert.ok(before.min.y>=-.014);assert.ok(before.min.x>12.6);
      for(const x of [before.min.x,before.max.x])for(const z of [before.min.z,before.max.z])assert.ok(Math.hypot(x,z)<SHELF_OUTER_RADIUS);
      shelf.position.set(-2,8,0);shelf.updateWorldMatrix(true,true);const after=new THREE.Box3().setFromObject(prop);
      assert.ok(Math.abs(after.min.x-before.min.x+2)<1e-5);assert.ok(Math.abs(after.min.y-before.min.y-8)<1e-5);
    }
    assert.equal(types.size,3);
  }finally{globalThis.document=previous;}
});
