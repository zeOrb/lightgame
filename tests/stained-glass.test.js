import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glassLayout } from '../src/stained-glass.js';
import * as THREE from 'three';
import { createWindowLight } from '../src/window-light.js';

test('tall and wide panes keep equal texel density and approximately square mosaic cells',()=>{
  for(const [width,height] of [[1.02,1.63],[1.95,1.25]]){
    const layout=glassLayout(width,height);
    assert.ok(Math.abs(layout.width/width-layout.height/height)<1);
    const cellAspect=(width/layout.columns)/(height/layout.rows);
    assert.ok(cellAspect>.8&&cellAspect<1.3);
  }
});
test('each glass pane projects its complete texture once, preserving mosaic count',()=>{
  const window=new THREE.Group();window.position.set(18,106,0);window.rotation.y=Math.PI/2;
  const panes=[];
  for(let y=0;y<6;y++)for(let x=0;x<3;x++){
    const pane=new THREE.Mesh(new THREE.BoxGeometry(1,1.6,.2),new THREE.MeshBasicMaterial({map:new THREE.Texture()}));
    pane.position.set((x-1)*1.1,(y-2.5)*1.7,0);window.add(pane);panes.push(pane);
  }
  const floor=new THREE.Object3D();floor.userData={s:0,theta:0,y:100};
  const light=createWindowLight(panes,[floor]),patches=light.zones[0].o.children;
  assert.equal(patches.length,panes.length);
  patches.forEach((patch,i)=>{
    assert.equal(patch.material.uniforms.glassMap.value,panes[i].material.map);
    assert.deepEqual([...patch.geometry.attributes.uv.array],[1,0,0,0,0,1,1,1]);
    assert.ok(!patch.material.fragmentShader.includes('fract('));
    const p=patch.geometry.attributes.position;
    const a=new THREE.Vector3().fromBufferAttribute(p,0),b=new THREE.Vector3().fromBufferAttribute(p,1),d=new THREE.Vector3().fromBufferAttribute(p,3);
    assert.ok(Math.abs(a.distanceTo(b)/a.distanceTo(d)-1/1.6)<1e-5,'vertical glass must remain vertical, with identical physical proportions');
    assert.ok(Math.abs(a.distanceTo(b)-1)<1e-5,'projection keeps the original glass width, regardless of shelf size');
    assert.ok(Math.abs(a.distanceTo(d)-1.6)<1e-5,'projection keeps the original glass height');
  });
});
