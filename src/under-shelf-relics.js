import * as THREE from 'three';
import {createVisualRandom} from './visual-random.js';
import {shelfInnerRadius,SHELF_OUTER_RADIUS} from './game.js';
import {applyTowerDepth} from './tower-depth.js';

export class UnderShelfRelics {
  constructor(scene){this.scene=scene;this.parts=[[],[],[]];this.dynamic=[];this.matrix=new THREE.Matrix4();}
  addShelf(group,section,moving=false){
    const random=createVisualRandom('shelf-relics:'+section),inner=shelfInnerRadius(section);
    const add=(kind,position,quaternion,scale,color)=>this.parts[kind].push({group,moving,local:new THREE.Matrix4().compose(position,quaternion,scale),color});
    for(let i=0,n=6+Math.floor(random()*9);i<n;i++){
      const outside=random()<.2,anchor=new THREE.Vector3(outside?SHELF_OUTER_RADIUS-.18:inner+.15+random()*.3,-.52,(random()-.5)*1.9);
      const length=.55+Math.pow(random(),1.6)*3.3;
      const end=anchor.clone().add(new THREE.Vector3((outside?1:-1)*(.12+random()*.75),-length,(random()-.5)*.6));
      const direction=end.clone().sub(anchor),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
      const metal=random()<.24;
      add(metal?1:0,anchor.clone().add(end).multiplyScalar(.5),q,new THREE.Vector3(metal?.035:.07+random()*.17,direction.length(),metal?.035:.04+random()*.11),new THREE.Color().setHSL(metal?.07:.07+random()*.035,.15+random()*.22,.12+random()*.14));
      if(random()<.32)add(2,end,new THREE.Quaternion().setFromEuler(new THREE.Euler(random()*.5,random()*Math.PI,random()*.3)),new THREE.Vector3(.15+random()*.2,.2+random()*.18,.15),new THREE.Color('#66513b'));
    }
    // Broader torn panels break up the thin supporting timbers into small ruins.
    for(let i=0,n=2+Math.floor(random()*4);i<n;i++){
      const anchor=new THREE.Vector3(inner+.08,-.55,(random()-.5)*1.8);
      const end=anchor.clone().add(new THREE.Vector3(-.2-random()*.6,-.6-random()*1.5,(random()-.5)*.3));
      const direction=end.clone().sub(anchor),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
      add(0,anchor.add(end).multiplyScalar(.5),q,new THREE.Vector3(.08,direction.length(),.28+random()*.38),new THREE.Color().setHSL(.075+random()*.025,.22+random()*.12,.18+random()*.12));
    }
  }
  build(){
    const plank=new THREE.BoxGeometry(1,1,1),p=plank.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,-.5+.16*(p.getX(i)+.5)+.08*(p.getZ(i)+.5));
    plank.computeVertexNormals();
    const geometries=[plank,new THREE.CylinderGeometry(.5,.5,1,5),new THREE.TorusGeometry(1,.12,4,12)];
    this.parts.forEach((parts,kind)=>{
      if(!parts.length)return;
      const material=applyTowerDepth(new THREE.MeshStandardMaterial({color:kind===0?'#735039':'#665343',roughness:kind===0?.98:.86,metalness:kind===0?0:.5}));
      const batch=new THREE.InstancedMesh(geometries[kind],material,parts.length);batch.name='under-shelf-relics-'+kind;batch.frustumCulled=false;
      parts.forEach((part,index)=>{part.group.updateWorldMatrix(true,false);this.matrix.multiplyMatrices(part.group.matrixWorld,part.local);batch.setMatrixAt(index,this.matrix);batch.setColorAt(index,part.color);this.dynamic.push({...part,batch,index,visible:true});});
      batch.instanceMatrix.needsUpdate=true;this.scene.add(batch);
    });
    this.parts=null;
  }
  updateDynamic(){
    const batches=new Set();
    for(const part of this.dynamic){
      const visible=part.group.visible;
      if(visible===part.visible&&(!part.moving||!visible))continue;
      part.visible=visible;
      if(visible){part.group.updateWorldMatrix(true,false);this.matrix.multiplyMatrices(part.group.matrixWorld,part.local);}
      else this.matrix.makeScale(0,0,0);
      part.batch.setMatrixAt(part.index,this.matrix);batches.add(part.batch);
    }
    for(const batch of batches)batch.instanceMatrix.needsUpdate=true;
  }
}
