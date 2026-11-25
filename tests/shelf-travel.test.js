import {hasShelfSupport} from '../src/threats.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ShelfTravel,sweepShelfLanding} from '../src/shelf-travel.js';
import {FLOORS,floorForSection} from '../src/floor-config.js';
import {route,setRouteYawResolver,ROUTE_ANGLE,SHELF_HALF_ANGLE} from '../src/game.js';
import {RabbitState} from '../src/rabbit-state.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6, a+' != '+b);

test('rotated floor boundary retains the departing arc until its physical edge',()=>{
  try{
    setRouteYawResolver(s=>floorForSection(s).index===1?1.1:0);
    const travel=new ShelfTravel(),edge=FLOORS[0].end;
    assert.equal(travel.leavesFloor(edge+.45,edge+.51,0),false);
    const a=travel.position(edge+.51),b=route(edge+.51);
    near(a.x,b.x);near(a.z,b.z);
    assert.equal(travel.leavesFloor(edge+SHELF_HALF_ANGLE/ROUTE_ANGLE-.01,edge+SHELF_HALF_ANGLE/ROUTE_ANGLE+.01,0),true);
    // A full step into another floor still follows the original world arc.
    const actual=travel.position(edge+1.01);
    near(actual.theta,route(edge).theta+1.01*ROUTE_ANGLE);
    assert.ok(Math.hypot(actual.x-route(edge+1.01).x,actual.z-route(edge+1.01).z)>1);
  }finally{setRouteYawResolver(()=>0);}
});
test('aligned floors remain a continuous walking route',()=>{
  const travel=new ShelfTravel(),edge=FLOORS[0].end;
  assert.equal(travel.leavesFloor(edge+.95,edge+1.01,0),false);
  assert.equal(travel.floor,null);
});
test('landing on either end of a rotated floor preserves exact world XZ',()=>{
  try{
    setRouteYawResolver(s=>floorForSection(s).index===1?.87:0);
    for(const section of [FLOORS[1].start,FLOORS[1].end])for(const offset of [-.55,.55]){
      const angle=route(section).theta+offset*Math.PI/14;
      const point={x:Math.cos(angle)*15.4,z:Math.sin(angle)*15.4};
      const travel=new ShelfTravel(),land=travel.land(section,point),actual=travel.position(land.s,land.lane);
      near(actual.x,point.x);near(actual.z,point.z);
      travel.leavesFloor(land.s,land.s,land.lane);
      near(travel.position(land.s,land.lane).x,point.x);
    }
  }finally{setRouteYawResolver(()=>0);}
});
test('world-space sweep lands on highest crossed top, skips undersides and hidden floors',()=>{
  const root=new THREE.Group();root.position.set(4,7,-2);root.rotation.y=.7;
  const upper=new THREE.Mesh(new THREE.BoxGeometry(3,.4,3),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));root.add(upper);
  const lower=upper.clone();lower.position.y=-3;root.add(lower);root.updateMatrixWorld(true);
  const from={x:4,y:10,z:-2},to={x:4,y:2,z:-2};
  let hit=sweepShelfLanding(from,to,[lower,upper]);assert.equal(hit.object,upper);near(hit.point.y,7.2);
  assert.equal(sweepShelfLanding(to,from,[upper]),null);
  assert.equal(sweepShelfLanding({x:4,y:6.9,z:-2},{x:4,y:6,z:-2},[upper]),null);
  upper.visible=false;hit=sweepShelfLanding(from,to,[upper,lower]);assert.equal(hit.object,lower);
  root.visible=false;assert.equal(sweepShelfLanding(from,to,[lower]),null);
});
test('normal fall preserves world inertia, remains visible, and can land on a lower floor',()=>{
  const r=new RabbitState();r.startFall({x:15,y:10,z:0},false,false);
  Object.assign(r.fall,{recoverable:true,vx:0,vz:2,vy:0});
  const platform=new THREE.Mesh(new THREE.BoxGeometry(5,.3,5));platform.position.set(15,7,0);
  let hit;
  for(let i=0;i<60&&!hit;i++){
    const before={...r.fall},after=r.updateFall(1/60);
    near(after.dissolve,0);near(after.x,15);
    hit=sweepShelfLanding(before,after,[platform]);
  }
  assert.ok(hit);near(hit.point.y,7.15);
  assert.ok(hit.point.z>0);
});

test('falling from a tread does not immediately land on the same zero-distance contact',()=>{
  const upper=new THREE.Mesh(new THREE.BoxGeometry(3,.4,3)),lower=upper.clone();
  upper.position.y=7;lower.position.y=4;
  const start={x:0,y:7.2,z:0};
  assert.equal(sweepShelfLanding(start,{x:.05,y:7.19,z:0},[upper,lower]),null);
  const landing=sweepShelfLanding(start,{x:.5,y:3,z:0},[upper,lower]);
  assert.equal(landing.object,lower);near(landing.point.y,4.2);
});
test('support uses the actual retained floor frame instead of an unrelated nearby rail',()=>{
  try{
    setRouteYawResolver(s=>floorForSection(s).index===1?.87:0);
    const travel=new ShelfTravel(),section=FLOORS[1].start;
    travel.land(section,route(section));const outside=section-1,p=travel.position(outside);
    assert.equal(hasShelfSupport([],outside,0),true);
    assert.equal(hasShelfSupport([],outside,0,p),false);
    assert.equal(travel.leavesFloor(section-SHELF_HALF_ANGLE/ROUTE_ANGLE+.01,section-SHELF_HALF_ANGLE/ROUTE_ANGLE-.01,0),true);
  }finally{setRouteYawResolver(()=>0);}
});
