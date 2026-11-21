import {randomManager} from './random-manager.js';
import {FLOORS} from './floor-config.js';
import {SecretRoad} from './secret-road.js';
import * as THREE from 'three';
import {route,FLOOR_COUNT,END} from './game.js';
import {ARENA_RADIUS,clampArena} from './arena-state.js';
import {SecretArenaGround} from './secret-arena-ground.js';

export const SECRET_ROAD_ASSIST=Object.freeze({height:1.25,duration:.2,exitVelocity:3.6,exitClearance:.06});
// A head bump should gently drop the rabbit instead of kicking it down hard.
export const SECRET_ROAD_REBOUND=1.8;
// Physical contact follows the stretched head; ears yield visually instead.
export const SECRET_ROAD_HEAD_CLEARANCE=Object.freeze({height:1.4,radius:.3});
const SECRET_LIFT=1.7; // First step is 2.6m above its shelf, below the base jump apex.

// Optional rising routes share the arena's free-movement space, without combat.
export class SecretLevels {
  constructor(scene,materials){
    this.routes=[];this.active=null;
    const wood=materials.carved;
    for(const floor of FLOORS){
      if(!floor.secret.enabled)continue;
      const layoutRng=randomManager.create('secret-layout',floor.id);
      const s=floor.start+(floor.secret.offset??Math.min(5,floor.count-3)),p=route(s),group=new THREE.Group();scene.add(group);
      const points=[];
      for(let i=0;i<=12;i++){
        const t=i/12,base=route(s+i*.5);
        points.push(new THREE.Vector3(base.x,p.y+.9+SECRET_LIFT+t*6,base.z));
      }
      const road=new SecretRoad(points,wood,layoutRng.float()*20);group.add(road.mesh);
      const portal=this.portal();portal.position.copy(points[12]).add(new THREE.Vector3(0,1.3,0));portal.rotation.y=-p.theta;portal.visible=false;group.add(portal);
      const room=new THREE.Group();room.position.y=p.y+9+SECRET_LIFT;room.visible=false;scene.add(room);
      const ground=new SecretArenaGround(room,ARENA_RADIUS,layoutRng.float()*20);
      const exit=this.portal();exit.position.set(0,1.3,9.2);exit.visible=false;room.add(exit);
      const stars=[];
      for(let i=0;i<5;i++){
        const angle=i*Math.PI*2/5+layoutRng.float()*.45,radius=4.7+layoutRng.float()*2.5;
        const material=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(i/5,.45,.75),toneMapped:false});
        const star=new THREE.Mesh(new THREE.OctahedronGeometry(.27),material);star.position.set(Math.cos(angle)*radius,.75,Math.sin(angle)*radius);room.add(star);stars.push(star);
      }
      this.routes.push({s,p,group,points,road,portal,room,exit,stars,ground,order:[],reveal:0,used:false});
    }
    this.reset();
  }
  portal(){
    const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xe9dbff,toneMapped:false});
    g.add(new THREE.Mesh(new THREE.TorusGeometry(1,.065,8,48),m));
    const inner=new THREE.Mesh(new THREE.CircleGeometry(.94,48),new THREE.MeshBasicMaterial({color:0x7061a8,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));g.add(inner);return g;
  }
  reset(){this.assist=null;this.active=null;for(const r of this.routes){r.used=false;r.completed=false;r.dropCooldown=0;r.reveal=0;r.room.visible=false;r.portal.visible=false;r.road.reveal(0);r.road.grass.windTime.value=0;r.ground.windTime.value=0;r.stars.forEach(m=>m.visible=true);}}
  reveal(s,dt,time){
    for(const r of this.routes){
      r.dropCooldown=Math.max(0,(r.dropCooldown??0)-dt);
      if(!r.used&&Math.abs(s-r.s)<3)r.reveal=Math.min(1,r.reveal+dt/.8);
      r.road.reveal(r.reveal);r.road.grass.update(dt);r.ground.update(dt);
      r.portal.visible=(!r.used||this.active===r&&r.stage==='ascent')&&r.reveal>.95;r.portal.rotation.z=Math.sin(time*.5)*.07;
    }
  }
  support(p,foot,stepUp=0){let hit=null;for(const r of this.routes){if(r.dropCooldown>0)continue;const y=r.road.heightAt(p);if(y!==null&&y<=foot+stepUp+.025&&y>=foot-.08&&(!hit||y>hit.y))hit={route:r,y};}return hit;}
  land(previousFoot,foot,velocity,p,before=p){
    if(velocity>0)return null;let hit=null;
    for(const r of this.routes){if(r.dropCooldown>0)continue;const y=r.road.landing(previousFoot,foot,p,before);if(y!==null&&(!hit||y>hit.y))hit={route:r,y};}return hit;
  }
  ceilingAbove(position){
    let ceiling=null;
    for(const route of this.routes){
      if(route.dropCooldown>0)continue;
      const y=route.road.undersideAt(position,SECRET_ROAD_HEAD_CLEARANCE.radius);
      if(y!==null&&y>position.y&&y-position.y<2.6&&(ceiling===null||y<ceiling))ceiling=y;
    }
    return ceiling;
  }
  enterFromBelow(position,previousFoot,foot,velocity,dt,canSlip=false){
    if(canSlip)return this.assistUp(position,previousFoot,foot,velocity,dt);
    this.assist=null;
    if(dt<=0)return null;
    let hit=null;
    for(const route of this.routes){
      if(route.dropCooldown>0)continue;
      const ceiling=route.road.undersideAt(position,SECRET_ROAD_HEAD_CLEARANCE.radius);
      if(ceiling===null||previousFoot>=ceiling-.025||foot+SECRET_ROAD_HEAD_CLEARANCE.height<ceiling)continue;
      if(!hit||ceiling<hit.ceiling)hit={route,ceiling,top:route.road.heightAt(position)??ceiling+.6,y:Math.min(foot,ceiling-SECRET_ROAD_HEAD_CLEARANCE.height),velocity:Math.min(velocity,-SECRET_ROAD_REBOUND),blocked:true};
    }
    return hit;
  }
  assistUp(position,previousFoot,foot,velocity,dt){
    if(dt<=0)return null;
    let assist=this.assist;
    if(!assist){
      // Approximate the visible upper body/ears by height, never by a mesh collider.
      if(velocity<-.5||foot<=previousFoot)return null;
      let candidate=null;
      for(const route of this.routes){
        if(route.dropCooldown>0)continue;
        const y=route.road.heightAt(position),gap=y===null?Infinity:y-foot;
        if(gap>.025&&gap<=SECRET_ROAD_ASSIST.height&&(!candidate||y<candidate.y))candidate={route,y};
      }
      if(!candidate)return null;
      assist=this.assist={route:candidate.route,age:0};
    }
    const y=assist.route.dropCooldown>0?null:assist.route.road.heightAt(position);
    // Walking out of the footprint cancels the lift without pulling sideways.
    if(y===null){this.assist=null;return null;}
    // Support tolerance can reach the top before the lift timer finishes.
    // Both completion paths release into the same small, real ballistic hop.
    if(foot>=y){
      this.assist=null;
      return {route:assist.route,y:Math.max(y,foot)+SECRET_ROAD_ASSIST.exitClearance,velocity:SECRET_ROAD_ASSIST.exitVelocity,landed:true};
    }
    const ease=t=>t*t*(3-2*t),old=ease(Math.min(1,assist.age/SECRET_ROAD_ASSIST.duration));
    assist.age+=dt;const next=ease(Math.min(1,assist.age/SECRET_ROAD_ASSIST.duration));
    const base=Math.min(y,Math.max(foot,previousFoot)),amount=(next-old)/Math.max(1e-8,1-old);
    const lifted=Math.min(y,base+(y-base)*amount),landed=y-lifted<.01||next>=1;
    if(landed)this.assist=null;
    return {route:assist.route,y:landed?y+SECRET_ROAD_ASSIST.exitClearance:lifted,velocity:landed?SECRET_ROAD_ASSIST.exitVelocity:Math.max(0,velocity),landed};
  }
  drop(surface){surface.route.dropCooldown=.4;if(this.assist?.route===surface.route)this.assist=null;}
  enterPortal(p,foot,s){
    const r=this.routes.find(r=>{if(r.completed||!r.portal.visible)return false;const endpoint=r.group.localToWorld(r.points[12].clone());return Math.hypot(p.x-endpoint.x,p.z-endpoint.z)<.75&&Math.abs(foot-endpoint.y)<.5;});if(!r)return null;
    r.used=true;r.returnS=s;r.age=0;r.stage='portal';r.secret=true;r.theta=route(r.s).theta;r.enemies=[];r.from=new THREE.Vector3(p.x,foot,p.z);r.y=r.room.getWorldPosition(new THREE.Vector3()).y;r.room.visible=true;
    r.order=randomManager.stream('secret-order',r.s).shuffle([0,1,2,3,4]);r.next=0;this.active=r;return r;
  }
  update(dt,time,player,movement,dash,speed=4.8){
    const r=this.active;if(!r)return {};
    r.age+=dt;
    if(r.stage==='portal'){
      const t=Math.min(1,r.age/.55),e=t*t*(3-2*t);player.copy(r.from).lerp(new THREE.Vector3(0,r.y,0),e);
      if(t===1){r.stage='fighting';r.age=0;}
    }else if(r.stage==='fighting'||r.stage==='cleared'){
      if(dash){player.x+=dash.x;player.z+=dash.z;}else{player.x+=movement.x*speed*dt;player.z+=movement.z*speed*dt;}
      clampArena(player,ARENA_RADIUS-.45);player.y=r.y;
      r.stars.forEach((star,i)=>{star.rotation.y=time*1.3;star.position.y=.75+Math.sin(time*2+i)*.12;star.scale.setScalar(i===r.order[r.next]?1.6+Math.sin(time*5)*.13:.6);star.material.color.setHSL(i/5,.45,i===r.order[r.next]?.8:.22);});
      const target=r.stars[r.order[r.next]];
      if(target&&Math.hypot(player.x-r.room.localToWorld(target.position.clone()).x,player.z-r.room.localToWorld(target.position.clone()).z)<.85){target.visible=false;r.next++;if(r.next===5){r.stage='cleared';r.exit.visible=true;return {secretReward:true};}return {note:true};}
      if(r.stage==='cleared'&&player.distanceTo(r.room.localToWorld(new THREE.Vector3(0,0,9.2)))<1){r.stage='return';r.age=0;r.from=player.clone();}
    }else if(r.stage==='return'){
      const t=Math.min(1,r.age/.45),e=t*t*(3-2*t),p=route(r.returnS);player.copy(r.from).lerp(new THREE.Vector3(p.x,p.y,p.z),e);r.y=player.y;
      if(t===1){r.room.visible=false;r.completed=true;this.active=null;return {returnedS:r.returnS};}
    }
    return {};
  }
}
