import {FLOORS} from './floor-config.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROUTE_RADIUS,END,FLOOR_COUNT,SHELF_OUTER_RADIUS,shelfInnerRadius,route} from './game.js';
import {applyTowerDepth} from './tower-depth.js';
import {createVisualRandom} from './random-manager.js';
const random=createVisualRandom('floor-gates');
export function floorGateLayout(){return FLOORS.map(floor=>{const i=floor.index,plank=floor.end;return {plank,positionS:plank+.49,s:Math.min(plank+.49,END-.2),nextFloor:Math.max(1,FLOOR_COUNT-i-1),passed:false};});}
export function gateCrossed(gate,previous,s,previousLane,lane){
  if(gate.passed||s<=previous||previous>=gate.s||s<gate.s)return false;
  const t=(gate.s-previous)/(s-previous),radius=ROUTE_RADIUS+previousLane+(lane-previousLane)*t;
  return radius>shelfInnerRadius(gate.plank)+.12&&radius<SHELF_OUTER_RADIUS-.12;
}
function gothicLampGeometry(){
  const iron=[],bronze=[];
  function add(list,g,x=0,y=0,z=0){g.translate(x,y,z);list.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();}
  function turned(list,points,segments=8){add(list,new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),segments));}
  function curve(list,points,width){add(list,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,width,5,false));}
  turned(bronze,[[.35,0],[.35,.08],[.28,.12],[.25,.21],[.19,.25],[.19,.34],[.14,.41]]);
  turned(iron,[[.13,.29],[.15,.48],[.10,.66],[.075,1.15],[.09,1.55],[.075,1.93],[.11,2.30],[.13,2.46]]);
  for(const y of [.49,1.52,2.32,2.50])add(bronze,new THREE.CylinderGeometry(.14,.14,.075,8),0,y);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    add(bronze,new THREE.CylinderGeometry(.018,.025,1.57,4),Math.cos(a)*.09,1.37,Math.sin(a)*.09);
    const points=[[.11,2.18],[.31,2.33],[.40,2.62],[.32,2.79]].map(([r,y])=>new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));curve(iron,points,.038);
  }
  turned(bronze,[[.12,2.43],[.18,2.56],[.35,2.67],[.38,2.73],[.34,2.79]],6);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,radial=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),tangent=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
    const pt=(x,y,r=.31)=>radial.clone().multiplyScalar(r).addScaledVector(tangent,x).setY(y);
    // Pointed lancet frames replace the straight bars of a generic lantern.
    curve(iron,[pt(-.16,2.79),pt(-.16,3.15),pt(-.12,3.37),pt(0,3.56)],.026);
    curve(iron,[pt(.16,2.79),pt(.16,3.15),pt(.12,3.37),pt(0,3.56)],.026);
    const jewel=new THREE.OctahedronGeometry(.055);jewel.scale(.7,1.35,.55);add(bronze,jewel,...pt(0,3.18,.32).toArray());
    add(iron,new THREE.ConeGeometry(.045,.25,4),Math.cos(a)*.40,3.73,Math.sin(a)*.40);
  }
  turned(bronze,[[.33,3.43],[.43,3.49],[.43,3.55],[.35,3.59]],6);
  turned(iron,[[.46,3.53],[.43,3.60],[.30,3.69],[.18,3.95],[.10,4.04]],6);
  turned(bronze,[[.20,3.90],[.21,3.95],[.12,4.01],[.07,4.08]],6);
  add(iron,new THREE.ConeGeometry(.085,.38,6),0,4.22);
  const result=[iron,bronze].map(parts=>{const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());return g;});
  return result;
}
export class FloorGates {
  constructor(scene,texture,palette){
    this.gates=floorGateLayout();this.palette=palette;this.clock=0;
    this.player=new THREE.Vector3();this.source=new THREE.Vector3();this.shake=0;
    this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    const iron=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#51483b',metalness:.65,roughness:.7}));
    const bronze=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#96784d',metalness:.55,roughness:.65}));
    const model=gothicLampGeometry();
    for(const gate of this.gates){
      const inner=shelfInnerRadius(gate.plank)+.45;
      const p=route(gate.positionS,inner-ROUTE_RADIUS),group=new THREE.Group();group.position.set(p.x,route(gate.plank).y-.02,p.z);group.rotation.y=-p.theta;scene.add(group);gate.group=group;
      function part(geometry,material,x,y,z){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
      part(model[0],iron,0,0,0).name='Gothic lamp ironwork';part(model[1],bronze,0,0,0).name='Gothic lamp carved brass';
      gate.glass=part(new THREE.CylinderGeometry(.24,.21,.65,6),applyTowerDepth(new THREE.MeshStandardMaterial({color:'#48483d',emissive:'#ffd584',emissiveIntensity:0,roughness:.35})),0,3.10,0);
      gate.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#ffe0a0',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));gate.halo.position.set(0,3.10,0);gate.halo.scale.setScalar(1.65);group.add(gate.halo);
      gate.lit=0;
    }
    this.burst=new THREE.Group();scene.add(this.burst);this.burst.visible=false;this.age=1;
    const material=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    this.shards=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1),material,64);this.shards.frustumCulled=false;this.burst.add(this.shards);
    this.directions=Array.from({length:64},(_,i)=>{const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);this.shards.setColorAt(i,palette[i%palette.length]);return new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);});
    this.core=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#fff4ff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.burst.add(this.core);
    this.spark=new THREE.Sprite(this.core.material.clone());this.spark.scale.setScalar(.40);this.spark.visible=false;scene.add(this.spark);
    this.ring=new THREE.Mesh(new THREE.TorusGeometry(1,.055,6,64),material.clone());this.burst.add(this.ring);this.dummy=new THREE.Object3D();
  }
  check(previous,s,previousLane,lane){
    let crossed=null;
    for(const gate of this.gates)if(gateCrossed(gate,previous,s,previousLane,lane)){
      crossed=gate;this.ignite(gate);
    }
    return crossed;
  }
  arriveAt(s){
    const gate=this.gates.reduce((best,item)=>Math.abs(item.s-s)<Math.abs(best.s-s)?item:best,this.gates[0]);
    if(!gate||Math.abs(gate.s-s)>.02)return null;
    this.ignite(gate);
    return gate;
  }
  ignite(gate){
    gate.passed=true;this.age=0;this.burst.visible=true;
    gate.halo.getWorldPosition(this.burst.position);this.source.copy(this.player);this.source.y+=.65;
    if(this.source.distanceTo(this.burst.position)>12)this.source.copy(this.burst.position).add(new THREE.Vector3(0,-2.3,0));
    this.spark.visible=true;this.shake=this.reducedMotion?0:.055;
  }
  applyShake(camera){camera.translateX(Math.sin(this.clock*77)*this.shake);camera.translateY(Math.sin(this.clock*91)*this.shake*.65);}
  update(dt=0,player){
    if(player)this.player.copy(player);
    dt=Number.isFinite(dt)?Math.max(0,dt):0;
    if(!Number.isFinite(this.clock))this.clock=0;
    this.clock+=dt;this.shake*=Math.exp(-dt*13);
    for(const gate of this.gates){gate.lit=THREE.MathUtils.damp(gate.lit,gate.passed?1:0,7,dt);gate.glass.material.emissiveIntensity=gate.lit*1.8;gate.glass.material.color.set(gate.passed?'#ffe1a4':'#48483d');gate.halo.material.opacity=gate.lit*(.62+Math.sin(this.clock*3)*.035);}
    this.age=Math.min(1,this.age+dt);this.burst.visible=this.age<1;this.spark.visible=this.age<.28;if(!this.burst.visible)return;
    const t=this.age;this.spark.visible=t<.28;if(this.spark.visible){const u=Math.min(1,t/.28);this.spark.position.lerpVectors(this.source,this.burst.position,u);this.spark.position.y+=Math.sin(u*Math.PI)*.5;this.spark.material.opacity=1-u*.3;}
    const travel=1-Math.pow(1-t,3),fade=Math.pow(1-t,1.2);
    this.directions.forEach((direction,i)=>{const d=this.dummy;d.position.copy(direction).multiplyScalar(travel*(.65+i%4*.15));d.position.y-=t*t*.55;d.rotation.set(t*6+i,t*4,t*8);d.scale.set(.065*fade,(.2+i%3*.06)*fade,.065*fade);d.updateMatrix();this.shards.setMatrixAt(i,d.matrix);});this.shards.instanceMatrix.needsUpdate=true;this.shards.material.opacity=fade;
    this.core.scale.setScalar( .5+Math.sin(t*Math.PI)*1.8);this.core.material.opacity=Math.exp(-t*6)*.95;
    this.ring.scale.setScalar(.15+travel*1.05);this.ring.material.color.copy(this.palette[Math.floor(t*12)%this.palette.length]);this.ring.material.opacity=fade*.85;
  }
  reset(){for(const gate of this.gates){gate.passed=false;gate.lit=0;gate.halo.material.opacity=0;gate.glass.material.emissiveIntensity=0;gate.glass.material.color.set('#48483d');}this.shake=0;this.spark.visible=false;this.age=1;this.clock=0;this.burst.visible=false;}
}
