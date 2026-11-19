import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VineLeafParticles} from '../src/vine-leaf-particles.js';
const v=(x,y=0,z=0)=>new THREE.Vector3(x,y,z);
function setup(random=()=>.05){
 const scene=new THREE.Scene(),parent=new THREE.Group();scene.add(parent);
 const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.05,3,.05),new THREE.MeshBasicMaterial(),1);
 const instance=new THREE.Matrix4().makeTranslation(0,2,0);mesh.setMatrixAt(0,instance);mesh.userData.vineLength=3;parent.add(mesh);
 return {scene,parent,mesh,fx:new VineLeafParticles(scene,{random})};
}
test('chance is rolled once per crossing and not again while standing inside',()=>{
 let rolls=0,bursts=0;const {fx}=setup(()=>{rolls++;return .9;});fx.spawn=()=>bursts++;
 fx.update(v(-4),v(0),.1);fx.update(v(0),v(4),.1);
 for(let i=0;i<20;i++)fx.update(v(0),v(4),.1);
 assert.equal(rolls,1);assert.equal(bursts,0);
 fx.update(v(4),v(4),.1);fx.update(v(0),v(-4),.1);assert.equal(rolls,2);fx.dispose();
});
test('ten independent crossing rolls produce one burst for a controlled ten-value random sequence',()=>{
 let rolls=0,bursts=0;const {fx}=setup(()=>((rolls++%10)+.5)/10);fx.spawn=()=>bursts++;
 fx.update(v(-4),v(0),.1);
 for(let i=0;i<10;i++)fx.update(v(i%2?-4:4),v(i%2?-20:20),.2);
 assert.equal(rolls,10);assert.equal(bursts,1);fx.dispose();
});
test('swept dash produces leaves in its movement direction and particles fade and expire',()=>{
 const {fx}=setup();fx.update(v(-4),v(0),.1);fx.update(v(4),v(20),.2);
 const active=fx.particles.filter(p=>p.active);assert.ok(active.length>=3&&active.length<=6);
 assert.ok(active.every(p=>p.velocity.x>0));assert.equal(fx.mesh.count,active.length);
 const opacity=fx.alpha.getX(0),root=fx.particles.find(p=>p.active).position.clone();
 fx.update(v(4),v(0),.3);assert.ok(fx.alpha.getX(0)<opacity);assert.ok(fx.particles.find(p=>p.active).position.x>root.x);
 fx.update(v(4),v(0),2);assert.equal(fx.mesh.count,0);fx.dispose();
});
test('world transforms, hidden sources, unrevealed instances and teleports are respected',()=>{
 const {fx,mesh,parent}=setup();parent.position.set(4,5,-6);parent.rotation.y=.7;
 let bursts=0;fx.spawn=()=>bursts++;
 fx.update(v(0,5,-6),v(0),.1);fx.update(v(8,5,-6),v(20),.2);assert.equal(bursts,1);
 parent.visible=false;fx.update(v(0,5,-6),v(-20),.2);assert.equal(bursts,1);
 parent.visible=true;mesh.count=0;fx.update(v(8,5,-6),v(20),.2);assert.equal(bursts,1);
 mesh.count=1;fx.update(v(-20,5,-6),v(-20),.2);assert.equal(bursts,1);
 fx.update(v(20,5,-6),v(20),.2);assert.equal(bursts,1);fx.dispose();
});
test('warmup includes fog and opacity, pause freezes particles and reset removes all leaves',()=>{
 const {fx}=setup();assert.equal(fx.prepareWarmup(),fx.mesh);assert.equal(fx.mesh.count,1);
 assert.equal(fx.mesh.material.fog,true);assert.equal(fx.mesh.material.depthWrite,false);
 const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <alphatest_fragment>\n#include <fog_fragment>'};fx.mesh.material.onBeforeCompile(shader);
 assert.ok(shader.vertexShader.includes('leafAlpha'));assert.ok(shader.fragmentShader.includes('diffuseColor.a*=vLeafAlpha'));
 fx.clear();fx.update(v(-4),v(0),.1);fx.update(v(4),v(20),.2);
 const positions=fx.particles.filter(p=>p.active).map(p=>p.position.toArray());fx.update(v(4),v(0),0,false);
 assert.deepEqual(fx.particles.filter(p=>p.active).map(p=>p.position.toArray()),positions);
 fx.clear();assert.equal(fx.mesh.count,0);assert.equal(fx.previous,null);assert.ok(fx.sources.every(s=>s.inside.every(n=>n===0)));fx.dispose();
});

test('emission starts at the player contact rather than the distant undeformed vine axis',()=>{
 const {fx}=setup();let contact=null;fx.spawn=p=>{contact=p.clone();};
 fx.update(v(-4,0,2),v(0),.1);fx.update(v(-1,0,2),v(15),.2);
 assert.ok(contact);assert.ok(Math.hypot(contact.x+1,contact.z-2)<=.251);
 assert.ok(contact.y>=.15&&contact.y<=1.05);fx.dispose();
});
