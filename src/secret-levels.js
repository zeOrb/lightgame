import * as THREE from 'three';
import {route,FLOOR_COUNT,END,ROUTE_ANGLE} from './game.js';
import {createVisualRandom} from './visual-random.js';

const SECRET_LIFT=1.7; // First step is 2.6m above its shelf, below the base jump apex.

// Optional rising routes share the arena's free-movement space, without combat.
export class SecretLevels {
  constructor(scene,materials){
    this.random=createVisualRandom('secret-constellations');this.routes=[];this.active=null;
    const wood=materials.carved;
    for(let floor=0;floor<FLOOR_COUNT-1;floor++){
      if(floor%3!==0)continue;
      const s=5+floor*14,p=route(s),group=new THREE.Group();scene.add(group);
      const points=[];
      for(let i=0;i<=12;i++){
        const t=i/12,base=route(s+i*.5);
        points.push(new THREE.Vector3(base.x,p.y+.9+SECRET_LIFT+t*6,base.z));
      }
      const steps=points.map((point,i)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(3,.18,1.85),wood);mesh.position.copy(point);mesh.position.y-=.09;mesh.rotation.y=-p.theta-i*.5*ROUTE_ANGLE;mesh.visible=false;group.add(mesh);return mesh;});
      const portal=this.portal();portal.position.copy(points[12]).add(new THREE.Vector3(0,1.3,0));portal.rotation.y=-p.theta;portal.visible=false;group.add(portal);
      const room=new THREE.Group();room.position.y=p.y+9+SECRET_LIFT;room.visible=false;scene.add(room);
      const floorMesh=new THREE.Mesh(new THREE.CylinderGeometry(8,8,.35,64),wood);floorMesh.position.y=-.19;room.add(floorMesh);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(7.8,.055,6,96),new THREE.MeshBasicMaterial({color:0xc5b997}));rim.rotation.x=Math.PI/2;room.add(rim);
      const exit=this.portal();exit.position.set(0,1.3,5.8);exit.visible=false;room.add(exit);
      const stars=[];
      for(let i=0;i<5;i++){
        const angle=i*Math.PI*2/5+this.random()*.45,radius=3+this.random()*2;
        const material=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(i/5,.45,.75),toneMapped:false});
        const star=new THREE.Mesh(new THREE.OctahedronGeometry(.27),material);star.position.set(Math.cos(angle)*radius,.75,Math.sin(angle)*radius);room.add(star);stars.push(star);
      }
      this.routes.push({s,p,group,points,steps,portal,room,exit,stars,order:[],reveal:0,used:false});
    }
    this.reset();
  }
  portal(){
    const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xe9dbff,toneMapped:false});
    g.add(new THREE.Mesh(new THREE.TorusGeometry(1,.065,8,48),m));
    const inner=new THREE.Mesh(new THREE.CircleGeometry(.94,48),new THREE.MeshBasicMaterial({color:0x7061a8,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));g.add(inner);return g;
  }
  reset(){this.active=null;for(const r of this.routes){r.used=false;r.completed=false;r.dropCooldown=0;r.reveal=0;r.room.visible=false;r.portal.visible=false;r.steps.forEach(m=>m.visible=false);r.stars.forEach(m=>m.visible=true);}}
  reveal(s,dt,time){
    for(const r of this.routes){
      r.dropCooldown=Math.max(0,(r.dropCooldown??0)-dt);
      if(!r.used&&Math.abs(s-r.s)<3)r.reveal=Math.min(1,r.reveal+dt/.8);
      r.steps.forEach((m,i)=>{m.visible=r.reveal>i/14;const t=THREE.MathUtils.smoothstep(r.reveal-i/14,0,.14);m.scale.set(t,Math.max(.01,t),t);});
      r.portal.visible=(!r.used||this.active===r&&r.stage==='ascent')&&r.reveal>.95;r.portal.rotation.z=Math.sin(time*.5)*.07;
    }
  }
  contains(r,i,p){const v=r.points[i],a=r.steps[i].rotation.y,c=Math.cos(a),sn=Math.sin(a),dx=p.x-v.x,dz=p.z-v.z;return Math.abs(c*dx-sn*dz)<=1.68&&Math.abs(sn*dx+c*dz)<=1.105;}
  support(p,foot,stepUp=0){let hit=null;for(const r of this.routes){if(r.dropCooldown>0)continue;for(let i=0;i<r.points.length;i++){const y=r.points[i].y;if(r.steps[i].visible&&this.contains(r,i,p)&&y<=foot+stepUp+.025&&y>=foot-.08&&(!hit||y>hit.y))hit={route:r,index:i,y};}}return hit;}
  land(previousFoot,foot,velocity,p,before=p){
    if(velocity>0)return null;let hit=null;
    for(const r of this.routes){if(r.dropCooldown>0)continue;for(let i=0;i<r.points.length;i++){
      const y=r.points[i].y;if(!r.steps[i].visible||previousFoot<y-.00001||foot>y+.00001)continue;
      const t=THREE.MathUtils.clamp((previousFoot-y)/Math.max(.00001,previousFoot-foot),0,1),cross={x:THREE.MathUtils.lerp(before.x,p.x,t),z:THREE.MathUtils.lerp(before.z,p.z,t)};
      if(this.contains(r,i,cross)&&(!hit||y>hit.y))hit={route:r,index:i,y};
    }}return hit;
  }
  drop(surface){surface.route.dropCooldown=.4;}
  enterPortal(p,foot,s){
    const r=this.routes.find(r=>!r.completed&&r.portal.visible&&Math.hypot(p.x-r.points[12].x,p.z-r.points[12].z)<.75&&Math.abs(foot-r.points[12].y)<.5);if(!r)return null;
    r.used=true;r.returnS=s;r.age=0;r.stage='portal';r.secret=true;r.theta=r.p.theta;r.enemies=[];r.from=new THREE.Vector3(p.x,foot,p.z);r.y=r.room.position.y;r.room.visible=true;
    r.order=[0,1,2,3,4];for(let i=4;i>0;i--){const j=Math.floor(this.random()*(i+1));[r.order[i],r.order[j]]=[r.order[j],r.order[i]];}r.next=0;this.active=r;return r;
  }
  update(dt,time,player,keys,forward,movement,dash){
    const r=this.active;if(!r)return {};
    r.age+=dt;
    if(r.stage==='portal'){
      const t=Math.min(1,r.age/.55),e=t*t*(3-2*t);player.copy(r.from).lerp(new THREE.Vector3(0,r.y,0),e);
      if(t===1){r.stage='fighting';r.age=0;}
    }else if(r.stage==='fighting'||r.stage==='cleared'){
      if(dash){player.x+=dash.x;player.z+=dash.z;}else{player.x+=movement.x*dt;player.z+=movement.z*dt;}
      const radius=Math.hypot(player.x,player.z);if(radius>7.3){player.x*=7.3/radius;player.z*=7.3/radius;}player.y=r.y;
      r.stars.forEach((star,i)=>{star.rotation.y=time*1.3;star.position.y=.75+Math.sin(time*2+i)*.12;star.scale.setScalar(i===r.order[r.next]?1.6+Math.sin(time*5)*.13:.6);star.material.color.setHSL(i/5,.45,i===r.order[r.next]?.8:.22);});
      const target=r.stars[r.order[r.next]];
      if(target&&Math.hypot(player.x-target.position.x,player.z-target.position.z)<.85){target.visible=false;r.next++;if(r.next===5){r.stage='cleared';r.exit.visible=true;return {secretReward:true};}return {note:true};}
      if(r.stage==='cleared'&&Math.hypot(player.x,player.z-5.8)<1){r.stage='return';r.age=0;r.from=player.clone();}
    }else if(r.stage==='return'){
      const t=Math.min(1,r.age/.45),e=t*t*(3-2*t),p=route(r.returnS);player.copy(r.from).lerp(new THREE.Vector3(p.x,p.y,p.z),e);r.y=player.y;
      if(t===1){r.room.visible=false;r.completed=true;this.active=null;return {returnedS:r.returnS};}
    }
    return {};
  }
}
