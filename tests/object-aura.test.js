import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {setObjectAura} from '../src/object-aura.js';
import {createChestModel} from '../src/chest-model.js';
import config from '../src/interactables.json' with {type:'json'};

test('any object can opt in, update and disable its aura without changing its materials',()=>{
  const material=new THREE.MeshStandardMaterial(),owner=new THREE.Mesh(new THREE.BoxGeometry(),material);
  assert.equal(setObjectAura(owner),null);assert.equal(owner.children.length,0);
  const aura=setObjectAura(owner,{aura:{enabled:true,color:'#ff0000'}}),other=new THREE.Group();
  const second=setObjectAura(other,{aura:{enabled:true}});
  assert.equal(aura.material.map,second.material.map);assert.notEqual(aura.material,second.material);
  assert.equal(setObjectAura(owner,{aura:{enabled:true,color:'#00ff00',opacity:.2}}),aura);
  assert.equal(owner.children.length,1);assert.equal(aura.material.opacity,.2);assert.equal(second.material.opacity,.75);assert.equal(owner.material,material);
  let disposed=false;aura.material.addEventListener('dispose',()=>disposed=true);setObjectAura(owner,{aura:{enabled:false}});
  assert.ok(disposed);assert.equal(owner.children.length,0);assert.equal(other.children.length,1);
});

test('chest explicit configuration preserves the former white aura rendering',()=>{
  const {model}=createChestModel(new THREE.Group(),config.chest.model,config.chest.visuals);
  const aura=model.getObjectByName('Object aura');assert.ok(aura);
  assert.deepEqual(aura.position.toArray(),[0,.48,0]);assert.deepEqual(aura.scale.toArray(),[2.1,2.3,1]);
  assert.equal(aura.material.color.getHexString(),'ffffff');assert.equal(aura.material.opacity,.75);
  assert.equal(aura.material.blending,THREE.AdditiveBlending);assert.equal(aura.material.depthWrite,false);assert.equal(aura.material.depthTest,true);assert.equal(aura.material.toneMapped,false);
  const pixels=aura.material.map.image.data;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const r=Math.hypot((x+.5-32)/32,(y+.5-32)/32),i=(y*64+x)*4;
    assert.equal(pixels[i+3],Math.round(220*Math.exp(-r*r*2)*Math.max(0,1-r)));
  }
  const unconfigured=createChestModel(new THREE.Group(),config.chest.model);assert.equal(unconfigured.model.getObjectByName('Object aura'),undefined);
});
