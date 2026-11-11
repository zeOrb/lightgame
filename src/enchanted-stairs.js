import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SHELF_HALF_ANGLE,SHELF_OUTER_RADIUS,shelfInnerRadius} from './game.js';
import {applyTowerDepth} from './tower-depth.js';
import {createOldWoodAtlas,mapWoodPanel} from './old-wood.js';

export function createStairMaterials(){
  const texture=createOldWoodAtlas();
  return {
    wood:applyTowerDepth(new THREE.MeshStandardMaterial({color:'#e0c5a4',map:texture,bumpMap:texture,bumpScale:.012,roughness:.9,vertexColors:true})),
    carved:applyTowerDepth(new THREE.MeshStandardMaterial({color:'#af8863',map:texture,bumpMap:texture,bumpScale:.015,roughness:.88})),
    bronze:applyTowerDepth(new THREE.MeshStandardMaterial({color:'#756047',metalness:.55,roughness:.72})),
  };
}
function wedge(inner,outer,angle,depth,bevel=0){
  const shape=new THREE.Shape();shape.absarc(0,0,outer,-angle,angle,false);shape.absarc(0,0,inner,angle,-angle,true);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:12});geometry.rotateX(-Math.PI/2);return geometry;
}
export function createEnchantedStep(parent,section,materials){
  const inner=shelfInnerRadius(section),outer=SHELF_OUTER_RADIUS,a=SHELF_HALF_ANGLE;
  const tread=wedge(inner,outer,a,.3,.035);mapWoodPanel(tread,section,inner,outer,a);
  const floor=new THREE.Mesh(tread,materials.wood);floor.position.y=-.355;parent.add(floor);
  const molding=new THREE.Mesh(wedge(inner+.07,outer-.07,a-.004,.15,.025),materials.carved);molding.position.y=-.51;parent.add(molding);
  const metal=[],ribs=[];
  function line(points,radius=.013){metal.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length*3),radius,4,false));}
  // Recessed twin borders follow the curved tread rather than forming railings.
  for(const r of [inner+.16,inner+.23,outer-.16,outer-.23]){
    const points=Array.from({length:17},(_,i)=>{const t=-a+.012+(a*2-.024)*i/16;return new THREE.Vector3(Math.cos(t)*r,-.01,Math.sin(t)*r);});line(points);
  }
  for(const sign of [-1,1]){
    const t=sign*(a-.018),points=[inner+.25,outer-.25].map(r=>new THREE.Vector3(Math.cos(t)*r,-.01,Math.sin(t)*r));line(points,.01);
    // Acanthus-like scrolls at the inward nose, clear of the walking centre.
    const scroll=Array.from({length:25},(_,i)=>{const t=i/24*Math.PI*2.2,r=.24*(1-i/30);return new THREE.Vector3(inner+.48+Math.cos(t)*r,-.005,sign*.55+Math.sin(t)*r);});line(scroll,.018);
    const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(inner+.3,-.39,sign*.67),new THREE.Vector3(inner+.65,-1.25,sign*.67),new THREE.Vector3(outer-1,-.95,sign*.67),new THREE.Vector3(outer-.35,-.4,sign*.67));
    ribs.push(new THREE.TubeGeometry(curve,18,.075,6,false));
  }
  const inlay=new THREE.Mesh(mergeGeometries(metal,false),materials.bronze);parent.add(inlay);metal.forEach(g=>g.dispose());
  const corbels=new THREE.Mesh(mergeGeometries(ribs,false),materials.carved);parent.add(corbels);ribs.forEach(g=>g.dispose());
  return floor;
}
