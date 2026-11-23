import {stepAt} from './floor-config.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SHELF_HALF_ANGLE,SHELF_OUTER_RADIUS,shelfInnerRadius} from './game.js';
import {applyTowerDepth} from './tower-depth.js';
import {createOldWoodAtlas,mapWoodPanel} from './old-wood.js';
import {applyWoodPOM} from './wood-pom.js';
import {createVisualRandom} from './random-manager.js';

function weatherStairWood(material){
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,...args){
    previous.call(this,shader,...args);
    shader.vertexShader='attribute float woodInnerEdge;varying vec3 weatheredWoodPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nweatheredWoodPosition=vec3(position.x,position.z,woodInnerEdge);');
    shader.fragmentShader='varying vec3 weatheredWoodPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float wear=1.-smoothstep(.05,2.8,length(weatheredWoodPosition.xy)-weatheredWoodPosition.z);
      float woodGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(woodGrey)*vec3(1.05,1.025,.98),wear*.78);`);
  };
  material.customProgramCacheKey=()=>key+'-weathered-inner-edge-v1';return material;
}
function woodEdge(geometry,inner){geometry.setAttribute('woodInnerEdge',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(inner),1));}

export function createStairMaterials(){
  const texture=createOldWoodAtlas();
  const materials={
    wood:applyWoodPOM(applyTowerDepth(new THREE.MeshStandardMaterial({color:'#d7c8b4',map:texture,bumpMap:texture.userData.heightMap,bumpScale:.055,roughness:.9,vertexColors:true}))),
    carved:applyWoodPOM(applyTowerDepth(new THREE.MeshStandardMaterial({color:'#a48d75',map:texture,bumpMap:texture.userData.heightMap,bumpScale:.055,roughness:.88}))),
    bronze:applyTowerDepth(new THREE.MeshStandardMaterial({color:'#756047',metalness:.55,roughness:.72})),
  };
  weatherStairWood(materials.wood);weatherStairWood(materials.carved);return materials;
}
function wedge(inner,outer,angle,depth,bevel=0){
  const shape=new THREE.Shape();shape.absarc(0,0,outer,-angle,angle,false);shape.absarc(0,0,inner,angle,-angle,true);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:12});geometry.rotateX(-Math.PI/2);return geometry;
}
function gothicTread(inner,outer,a,profile){
  // Shield-shaped nose and clipped shoulders belong to the tread itself.
  const point=(r,t)=>[Math.cos(t)*r,Math.sin(t)*r],shape=new THREE.Shape();
  shape.moveTo(...point(outer-.18,-a));shape.lineTo(...point(outer,-a+.014));
  shape.absarc(0,0,outer,-a+.014,a-.014,false);
  const peak=a*profile.offset,left=-a*profile.left,right=a*profile.right;
  shape.lineTo(...point(outer-.18,a));shape.lineTo(...point(inner+profile.shoulder,a));
  shape.lineTo(...point(inner+.18,right));
  shape.quadraticCurveTo(...point(inner+.18,(right+peak)*.5),...point(inner-profile.projection,peak));
  shape.quadraticCurveTo(...point(inner+.18,(left+peak)*.5),...point(inner+.18,left));
  shape.lineTo(...point(inner+profile.shoulder,-a));shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,curveSegments:12});g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++)if(p.getY(i)<.10){const r=Math.hypot(p.getX(i),p.getZ(i)),front=1-THREE.MathUtils.smoothstep(r,inner+.15,inner+1.1),tip=Math.max(0,1-Math.abs(p.getZ(i)-Math.sin(peak)*inner)/(inner*Math.sin(a)*profile.width));p.setY(i,p.getY(i)-front*(.10+profile.drop*tip));}
  g.computeVertexNormals();return g;
}
export function createEnchantedStep(parent,section,materials,random=createVisualRandom()){
  const inner=shelfInnerRadius(section),outer=SHELF_OUTER_RADIUS,a=SHELF_HALF_ANGLE;
  const profile={offset:(random()<.5?-1:1)*(.14+random()*.34),left:.62+random()*.26,right:.62+random()*.26,shoulder:.30+random()*.36,projection:.12+random()*.32,drop:.25+random()*.34,width:.55+random()*.55};
  const collision=wedge(inner,outer,a,.3,.035),tread=gothicTread(inner,outer,a,profile);mapWoodPanel(tread,section,inner,outer,a);
  const floor=new THREE.Mesh(tread,materials.wood);floor.position.y=-.355;parent.add(floor);
  woodEdge(tread,inner);
  // All landing and support rays retain the exact original wedge, including its bevel.
  const collider=new THREE.Mesh(collision,materials.wood);floor.userData.collisionGeometry=collision;
  floor.raycast=function(raycaster,hits){collider.matrixWorld.copy(this.matrixWorld);const contacts=[];collider.raycast(raycaster,contacts);for(const hit of contacts){hit.object=this;hits.push(hit);}};
  if(stepAt(section).style==='plain')return floor;
  // Three different sections form a projecting lip, recessed waist and lower bead.
  const carved=[];
  for(const [inset,height,y] of [[-.07,.20,-.15],[.20,.35,-.40],[.035,.20,-.53]]){
    const g=gothicTread(inner+inset,outer-inset,a-Math.max(0,inset)*.025,profile);g.scale(1,height,1);g.translate(0,y,0);carved.push(g);
  }
  // Faceted corner bosses grow out of the block, rather than hanging beneath it.
  for(const sign of [-1,1]){
    const w=.22+random()*.10,h=.40+random()*.12,shield=new THREE.Shape();
    shield.moveTo(0,h*.5);shield.lineTo(w*.75,h*.18);shield.lineTo(w,h*-.10);shield.lineTo(0,-h*.5);shield.lineTo(-w,-h*.10);shield.lineTo(-w*.75,h*.18);shield.closePath();
    const g=new THREE.ExtrudeGeometry(shield,{depth:.14,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1});
    const t=sign*a*.82;g.rotateY(Math.PI/2-t);g.translate(Math.cos(t)*(inner+.12),-.30,Math.sin(t)*(inner+.12));carved.push(g);
    // A short carved rib wraps the side face and terminates in a tapered shoulder.
    const side=new THREE.Shape();side.moveTo(inner+.50,-.12);side.lineTo(outer-.35,-.12);side.lineTo(outer-.60,-.33);side.quadraticCurveTo((inner+outer)*.5,-.62,inner+.72,-.40);side.closePath();
    const rib=new THREE.ExtrudeGeometry(side,{depth:.12,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:8});
    rib.translate(0,0,-.06);rib.rotateY(-sign*a);carved.push(rib);
  }
  const molding=new THREE.Mesh(mergeGeometries(carved,false),materials.carved);molding.name='Sculpted stair lip, waist and corner bosses';parent.add(molding);carved.forEach(g=>g.dispose());
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
  woodEdge(molding.geometry,inner);woodEdge(corbels.geometry,inner);
  return floor;
}
