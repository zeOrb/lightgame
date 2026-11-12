import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { paneBeam, createWindowLight } from '../src/window-light.js';
import { SHELF_INNER_RADIUS, SHELF_OUTER_RADIUS, SHELF_HALF_ANGLE, shelfInnerRadius } from '../src/game.js';

test('beams originate exactly on the inner glass face and inherit its color',()=>{
  const group=new THREE.Group(),angle=Math.PI;
  group.position.set(18.2*Math.cos(angle),106,18.2*Math.sin(angle));group.rotation.y=-angle+Math.PI/2;
  const pane=new THREE.Mesh(new THREE.BoxGeometry(1.02,1.63,.28),new THREE.MeshBasicMaterial({color:'#8cc4b6'}));pane.position.set(.5,2,-.05);group.add(pane);
  const beam=paneBeam(pane);assert.ok(beam);assert.ok(beam.color.equals(pane.material.color));
  assert.ok(beam.direction.x*beam.origin.x+beam.direction.z*beam.origin.z<0);assert.ok(beam.direction.y<0);
  const local=pane.worldToLocal(beam.origin.clone());assert.ok(Math.abs(local.z-(-.14-.025))<1e-10);
  for(const corner of beam.corners){const p=pane.worldToLocal(corner.clone());assert.ok(Math.abs(Math.abs(p.x)-.51)<1e-10);assert.ok(Math.abs(Math.abs(p.y)-.815)<1e-10);}
});
test('every side casts inward, and magical beams switch off at night',()=>{
  const pane=new THREE.Mesh(new THREE.BoxGeometry(1,2,.2),new THREE.MeshBasicMaterial({color:'red'}));
  pane.position.set(0,100,18);assert.ok(paneBeam(pane).direction.z<0);
  pane.position.z=-18;pane.rotation.y=Math.PI;
  assert.ok(paneBeam(pane).direction.z>0);
  const beams=createWindowLight([pane],[]);
  beams.update(0);assert.equal(beams.group.children.find(o=>o.isMesh).material.uniforms.strength.value,0);
});
test('window mosaic creates a persistent walkable projection on a real shelf',()=>{
  const window=new THREE.Group();window.position.set(18*Math.cos(.1),106,18*Math.sin(.1));window.rotation.y=Math.PI/2-.1;
  const pane=new THREE.Mesh(new THREE.BoxGeometry(1,2,.2),new THREE.MeshBasicMaterial({color:'#8cc4b6'}));pane.position.set(.4,1,0);window.add(pane);
  const floor=new THREE.Object3D();floor.userData={s:0,theta:0,y:100};
  const light=createWindowLight([pane],[floor]);
  assert.equal(light.zones.length,1);assert.equal(light.zones[0].s,0);
  assert.equal(light.sampleLight(new THREE.Vector3(12.55,100,0)),light.zones[0]);
  assert.equal(light.sampleLight(new THREE.Vector3(12.55,100,3)),null);
  assert.equal(light.sampleLight(new THREE.Vector3(12.55,100,0),4),null);
  const pattern=light.zones[0].o.children[0];assert.ok(pattern.material.uniforms.beamColor.value.equals(pane.material.color));
  const bounds=pattern.material.uniforms.floorBounds.value;
  assert.equal(bounds.x,shelfInnerRadius(0)+.012);
  assert.equal(bounds.y,SHELF_OUTER_RADIUS-.012);
  assert.equal(bounds.z,SHELF_HALF_ANGLE-.001);
  const depth=new THREE.DepthTexture(800,600),resolution=new THREE.Vector2(800,600),range=new THREE.Vector2(.1,240);
  light.setDepthSource(depth,resolution,range);
  assert.equal(pattern.material.uniforms.projectionDepth.value,depth);
  assert.equal(pattern.material.uniforms.depthResolution.value,resolution);
  assert.equal(pattern.material.uniforms.depthEnabled.value,true);
  assert.equal(pattern.material.blending,THREE.NormalBlending);
  assert.equal(pattern.material.depthWrite,false);
  const positions=pattern.geometry.attributes.position;for(let i=0;i<positions.count;i++){
    assert.ok(Math.abs(positions.getY(i)-100.035)<.00001);
    const x=positions.getX(i),z=positions.getZ(i);
    assert.ok(Math.abs(Math.atan2(z,x))<SHELF_HALF_ANGLE-.001,'whole mosaic fits inside shelf even when window is offset');
    assert.ok(Math.hypot(x,z)>SHELF_INNER_RADIUS+.04&&Math.hypot(x,z)<SHELF_OUTER_RADIUS-.04);
  }
});
test('stained-glass projections never occupy a shelf reserved for shadows',()=>{
  const window=new THREE.Group();window.position.set(18,106,0);window.rotation.y=Math.PI/2;
  const pane=new THREE.Mesh(new THREE.BoxGeometry(1,2,.2),new THREE.MeshBasicMaterial());window.add(pane);
  const floors=[0,28].map((s,i)=>{const floor=new THREE.Object3D();floor.userData={s,theta:0,y:100-i*14};return floor;});
  const light=createWindowLight([pane],floors,new Set([0]));
  assert.deepEqual(light.zones.map(z=>z.s),[28]);
  assert.equal(createWindowLight([pane],floors,new Set([0,28])).zones.length,0);
});

test('consumed windows extinguish their own glass, projection and beams, then reset for the next run',()=>{
  const original=new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#ffcc88',emissiveIntensity:.65});
  const windows=[106,122].map(y=>{const g=new THREE.Group();g.position.set(18,y,0);g.rotation.y=Math.PI/2;const pane=new THREE.Mesh(new THREE.BoxGeometry(2,4,.2),original);g.add(pane);return {g,pane};});
  const floor=new THREE.Object3D();floor.userData={s:0,theta:0,y:100};
  const light=createWindowLight(windows.map(w=>w.pane),[floor]),zone=light.zones[0];
  light.update(1,0);light.extinguish(zone);light.update(1,.25);
  assert.ok(zone.lightStrength>0&&zone.lightStrength<1);assert.equal(zone.o.visible,true);
  light.update(1,.5);
  assert.equal(zone.extinguished,true);assert.equal(zone.o.visible,false);
  assert.equal(windows[0].pane.material.emissiveIntensity,0);assert.equal(windows[1].pane.material,original);
  assert.equal(light.group.children.filter(o=>o.isMesh&&!o.visible).length,1);
  light.extinguish(zone);light.reset();
  assert.equal(zone.extinguished,false);assert.equal(zone.o.visible,true);assert.equal(windows[0].pane.material,original);
  assert.ok(light.group.children.filter(o=>o.isMesh).every(o=>o.visible));
});
