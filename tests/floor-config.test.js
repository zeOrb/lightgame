import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FLOOR_CONFIG,FLOORS,buildFloorLayout,floorForSection} from '../src/floor-config.js';
import {TowerHierarchy} from '../src/tower-hierarchy.js';
import {route,setRouteYawResolver} from '../src/game.js';
import {SecretRoad} from '../src/secret-road.js';

const empty=()=>{const c=structuredClone(FLOOR_CONFIG);c.baseFloors=2;c.floors=[{id:'a'},{id:'b'}];for(const k of ['windows','loot','enemies','shadows','chests','bottles','books','springboards','threats'])c.defaults[k]={mode:'generated',count:0};c.defaults.steps.holes.count=0;return c;};
test('layout supports mixed authored/generated floors and variable section counts',()=>{
 const c=empty();c.floors[0]={id:'a',steps:{count:6,mode:'explicit',items:[0,1,3,4,5]},loot:{mode:'explicit',items:[{offset:3,id:'ruby',count:2}]}};c.floors[1]={id:'b',steps:{count:20},windows:{count:4},enemies:{count:2,pool:['cat']}};
 const f=buildFloorLayout(c);assert.deepEqual(f[0].holes,[2]);assert.equal(f[1].start,6);assert.equal(f[1].end,25);assert.deepEqual(f[0].placements.loot,[{offset:3,id:'ruby',count:2,s:3}]);assert.equal(f[1].placements.windows.length,4);assert.ok(f[1].placements.enemies.every(e=>e.id==='cat'));
 assert.deepEqual(buildFloorLayout(c),f);
});
test('generation respects authored reservations and reports impossible layouts',()=>{
 const c=empty();c.floors[0]={loot:{mode:'explicit',items:[{offset:3} ]},chests:{count:4}};const f=buildFloorLayout(c)[0];assert.ok(f.placements.chests.every(p=>p.offset!==3));
 c.floors[0].chests.count=100;assert.throws(()=>buildFloorLayout(c),/no space/);
 c.floors[0]={steps:{mode:'explicit',items:[0,1]}};assert.throws(()=>buildFloorLayout(c),/final step/);
});
test('roots rotate geometry and live routes together; world-driven actors retain world coordinates',()=>{
 const scene=new THREE.Scene(),tower=new TowerHierarchy(scene),section=FLOORS[1].start+2,p=route(section),group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1));group.position.set(p.x,p.y,p.z);group.add(mesh);mesh.userData.s=section;scene.add(group);
 const actor=new THREE.Group();actor.position.set(p.x,p.y,p.z);scene.add(actor);
 tower.organize({walkableFloors:[mesh],beasts:[{o:actor,s:section}],glints:[],chests:[],bottles:[],books:[],hazards:[],arenas:{arenas:[]},secretLevels:{routes:[]},floorGates:{gates:[]},windowPanes:[],architecture:[],springboards:{items:[]},threatVisuals:{items:[]}});
 tower.rotateFloor(1,37);tower.rotateTower(-19);const world=mesh.getWorldPosition(new THREE.Vector3()),expected=route(section);assert.ok(world.distanceTo(new THREE.Vector3(expected.x,expected.y,expected.z))<1e-5);
 actor.position.set(expected.x,expected.y+.7,expected.z);assert.ok(actor.getWorldPosition(new THREE.Vector3()).distanceTo(actor.position)<1e-5);assert.equal(actor.parent,tower.floors[1]);setRouteYawResolver(()=>0);
});
test('secret road collision follows the transformed parent without snapping to the unrotated road',()=>{
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);const points=Array.from({length:13},(_,i)=>new THREE.Vector3(15*Math.cos(i*.1),10+i*.5,15*Math.sin(i*.1)));const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3);root.add(road.mesh);road.reveal(1);root.rotation.y=.7;root.updateMatrixWorld(true);const point=points[6].clone().applyMatrix4(root.matrixWorld);assert.ok(Math.abs(road.heightAt(point)-points[6].y)<.025);
});

test('extra-floor compilation does not mutate defaults or previous floors',()=>{const c=empty(),before=structuredClone(c);buildFloorLayout(c,12);assert.deepEqual(c,before);});
test('authored loot remains safe when holes are generated',()=>{const c=empty();c.floors[0]={steps:{holes:{count:4,safeStart:0,safeEnd:1}},loot:{mode:'explicit',items:[{offset:3},{offset:5}]}};const f=buildFloorLayout(c)[0];assert.ok(!f.holes.includes(3)&&!f.holes.includes(5));});
