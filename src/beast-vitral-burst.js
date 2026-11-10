import * as THREE from 'three';
import { createVisualRandom } from './visual-random.js';
const random=createVisualRandom('vitral-finisher');
export class BeastVitralBurst {
  constructor(parent,texture){
    this.group=new THREE.Group();this.group.visible=false;parent.add(this.group);
    const material=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    this.shards=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1),material,32);this.shards.frustumCulled=false;this.group.add(this.shards);
    this.rays=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,4,1,true),material.clone(),12);this.rays.frustumCulled=false;this.group.add(this.rays);
    this.core=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#fff7ef',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.group.add(this.core);
    this.rings=[0,1].map(i=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.025,4,48),material.clone());ring.rotation.set(Math.PI/2,i*.8,i*.65);this.group.add(ring);return ring;});
    this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);
  }
  start(center,palette){
    this.group.position.copy(center);this.group.visible=true;
    this.directions=Array.from({length:32},(_,i)=>{
      const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y),direction=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
      this.shards.setColorAt(i,palette[i%palette.length]);
      if(i<12)this.rays.setColorAt(i,palette[i%palette.length]);
      return {direction,speed:1.8+random()*2.5,size:.07+random()*.1,spin:random()*6};
    });
    this.shards.instanceColor.needsUpdate=true;this.rays.instanceColor.needsUpdate=true;
    this.rings.forEach((ring,i)=>ring.material.color.copy(palette[i%palette.length]));
  }
  update(t){
    const fade=Math.max(0,1-t/1.5),travel=1-Math.exp(-t*3);
    this.core.scale.setScalar(.7+Math.sin(Math.min(1,t/.45)*Math.PI)*3.5);
    this.core.material.opacity=Math.exp(-t*7);
    this.directions.forEach(({direction,speed,size,spin},i)=>{
      this.dummy.position.copy(direction).multiplyScalar(travel*speed);this.dummy.position.y-=t*t*.45;
      this.dummy.rotation.set(spin+t*3,spin-t*2,t*4);
      this.dummy.scale.set(size*fade,size*(1.8+t)*fade,size*fade);this.dummy.updateMatrix();this.shards.setMatrixAt(i,this.dummy.matrix);
      if(i<12){
        const length=(.4+travel*2.3)*fade;
        this.dummy.position.copy(direction).multiplyScalar(length*.55);
        this.dummy.quaternion.setFromUnitVectors(this.up,direction);
        this.dummy.scale.set(.14*fade,length,.14*fade);this.dummy.updateMatrix();this.rays.setMatrixAt(i,this.dummy.matrix);
      }
    });
    this.shards.instanceMatrix.needsUpdate=true;this.rays.instanceMatrix.needsUpdate=true;
    this.shards.material.opacity=fade;this.rays.material.opacity=fade*fade*.65;
    this.rings.forEach((ring,i)=>{ring.scale.setScalar(.15+travel*(2.3+i*.6));ring.material.opacity=Math.max(0,1-t/(.65+i*.2))*.8;});
    if(t>1.7)this.group.visible=false;
  }
  reset(){this.group.visible=false;}
}
