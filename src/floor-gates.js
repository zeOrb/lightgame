import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {END,FLOOR_COUNT,SHELF_OUTER_RADIUS,shelfInnerRadius,route} from './game.js';
import {applyTowerDepth} from './tower-depth.js';
import {createVisualRandom} from './visual-random.js';
const random=createVisualRandom('floor-gates');
export function floorGateLayout(){return Array.from({length:FLOOR_COUNT},(_,i)=>{const plank=13+i*14;return {plank,positionS:plank+.49,s:Math.min(plank+.49,END-.2),nextFloor:Math.max(1,FLOOR_COUNT-i-1),passed:false};});}
export function gateCrossed(gate,previous,s,previousLane,lane){
  if(gate.passed||s<=previous||previous>=gate.s||s<gate.s)return false;
  const t=(gate.s-previous)/(s-previous),radius=12+previousLane+(lane-previousLane)*t;
  return radius>shelfInnerRadius(gate.plank)+.12&&radius<SHELF_OUTER_RADIUS-.12;
}
function archPoint(t,width){
  if(t<.25)return new THREE.Vector3(-width/2,t*9.2,0);
  if(t>.75)return new THREE.Vector3(width/2,(1-t)*9.2,0);
  const angle=Math.PI*(1-(t-.25)*2);return new THREE.Vector3(Math.cos(angle)*width/2,2.3+Math.sin(angle)*1.3,0);
}
function starGeometry(){const shape=new THREE.Shape();for(let i=0;i<10;i++){const angle=Math.PI/2+i*Math.PI/5,r=i%2?.14:.35,x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i)shape.lineTo(x,y);else shape.moveTo(x,y);}shape.closePath();return new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1});}
export class FloorGates {
  constructor(scene,texture,palette){
    this.gates=floorGateLayout();this.palette=palette;this.clock=0;
    const wood=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#795239',roughness:.78}));
    const carving=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#ba8b58',roughness:.8}));
    const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.18,.16,-.12,.35,0,.48);leafShape.bezierCurveTo(.14,.34,.16,.13,0,0);
    const leaf=new THREE.ExtrudeGeometry(leafShape,{depth:.07,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:1});
    for(const gate of this.gates){
      const inner=shelfInnerRadius(gate.plank)+.22,outer=SHELF_OUTER_RADIUS-.22,width=outer-inner;
      const p=route(gate.positionS,(inner+outer)/2-12),group=new THREE.Group();group.position.set(p.x,route(gate.plank).y-.02,p.z);group.rotation.y=-p.theta;scene.add(group);gate.group=group;
      const timber=[],ornaments=[];
      const path=Array.from({length:65},(_,i)=>archPoint(i/64,width));
      timber.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),80,.18,8,false));
      for(const sign of [-1,1]){
        const vine=path.map((point,i)=>point.clone().add(new THREE.Vector3(Math.sin(i*.55)*.075*sign,Math.cos(i*.55)*.045,.09*sign)));
        ornaments.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(vine),90,.065,6,false));
      }
      for(let i=0;i<23;i++){
        const t=.035+i*.042,point=archPoint(t,width),tangent=archPoint(Math.min(1,t+.006),width).sub(point);
        const geometry=leaf.clone();geometry.rotateZ(Math.atan2(-tangent.x,tangent.y)+(i%2?-.9:.9));geometry.translate(point.x,point.y,.045);ornaments.push(geometry);
      }
      // Three carved suns replace the hearts from the reference.
      for(const t of [.19,.5,.81]){
        const p=archPoint(t,width),sun=new THREE.SphereGeometry(.19,16,10);
        sun.scale(1,1,.28);sun.rotateY(Math.PI/2);sun.translate(p.x-.21,p.y,0);ornaments.push(sun);
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4,ray=new THREE.ConeGeometry(.04,.18,4);
          ray.rotateZ(a-Math.PI/2);ray.translate(Math.cos(a)*.27,Math.sin(a)*.27,0);
          ray.rotateY(Math.PI/2);ray.translate(p.x-.21,p.y,0);ornaments.push(ray);
        }
      }
      for(const [list,material] of [[timber,wood],[ornaments,carving]]){const geometries=list.map(g=>g.index?g.toNonIndexed():g);group.add(new THREE.Mesh(mergeGeometries(geometries,false),material));for(const g of new Set([...list,...geometries]))g.dispose();}
      const geometry=starGeometry(),colors=[];for(let i=0;i<geometry.attributes.position.count;i++){const a=Math.atan2(geometry.attributes.position.getY(i),geometry.attributes.position.getX(i));const c=new THREE.Color().setHSL((a/Math.PI/2+1)%1,.85,.65);colors.push(c.r,c.g,c.b);}geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      gate.star=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}));gate.star.position.set(0,4.05,0);group.add(gate.star);
      gate.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#cbb8ff',transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));gate.halo.position.set(0,4.05,.04);gate.halo.scale.setScalar(1.15);group.add(gate.halo);
    }
    leaf.dispose();
    this.burst=new THREE.Group();scene.add(this.burst);this.burst.visible=false;this.age=1;
    const material=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    this.shards=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1),material,64);this.shards.frustumCulled=false;this.burst.add(this.shards);
    this.directions=Array.from({length:64},(_,i)=>{const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);this.shards.setColorAt(i,palette[i%palette.length]);return new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);});
    this.core=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#fff4ff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.burst.add(this.core);
    this.ring=new THREE.Mesh(new THREE.TorusGeometry(1,.055,6,64),material.clone());this.burst.add(this.ring);this.dummy=new THREE.Object3D();
  }
  check(previous,s,previousLane,lane){
    let crossed=null;
    for(const gate of this.gates)if(gateCrossed(gate,previous,s,previousLane,lane)){
      gate.passed=true;crossed=gate;this.age=0;this.burst.visible=true;this.burst.position.copy(gate.group.position);this.burst.position.y+=1.65;this.burst.rotation.y=gate.group.rotation.y;
    }
    return crossed;
  }
  update(dt=0){
    dt=Number.isFinite(dt)?Math.max(0,dt):0;
    if(!Number.isFinite(this.clock))this.clock=0;
    this.clock+=dt;for(const gate of this.gates){gate.star.rotation.y=Math.sin(this.clock*.8)*.28;gate.halo.material.color.copy(this.palette[Math.floor(this.clock*2)%this.palette.length]);gate.halo.material.opacity=.4+Math.sin(this.clock*2.5)*.12;}
    this.age=Math.min(1,this.age+dt);this.burst.visible=this.age<1;if(!this.burst.visible)return;
    const t=this.age,travel=1-Math.pow(1-t,3),fade=Math.pow(1-t,1.2);
    this.directions.forEach((direction,i)=>{const d=this.dummy;d.position.copy(direction).multiplyScalar(travel*(2.3+i%4*.4));d.position.y-=t*t*.55;d.rotation.set(t*6+i,t*4,t*8);d.scale.set(.065*fade,(.2+i%3*.06)*fade,.065*fade);d.updateMatrix();this.shards.setMatrixAt(i,d.matrix);});this.shards.instanceMatrix.needsUpdate=true;this.shards.material.opacity=fade;
    this.core.scale.setScalar(1.2+Math.sin(t*Math.PI)*5);this.core.material.opacity=Math.exp(-t*6)*.95;
    this.ring.scale.setScalar(.2+travel*2.8);this.ring.material.color.copy(this.palette[Math.floor(t*12)%this.palette.length]);this.ring.material.opacity=fade*.85;
  }
  reset(){for(const gate of this.gates)gate.passed=false;this.age=1;this.clock=0;this.burst.visible=false;}
}
