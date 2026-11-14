import * as THREE from 'three';
import {createVisualRandom} from './visual-random.js';

export class VitralEntryEffects {
  constructor(scene){
    this.random=createVisualRandom('vitral-entry');this.dummy=new THREE.Object3D();this.lastZone=null;
    const geometry=new THREE.OctahedronGeometry(.055);
    this.pool=Array.from({length:3},()=>{
      const material=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,toneMapped:false});
      const mesh=new THREE.InstancedMesh(geometry,material,14);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      return {mesh,age:1,rays:[]};
    });
  }
  sample(point,zone){
    const entered=zone&&zone!==this.lastZone&&!zone.extinguished;
    this.lastZone=zone;
    if(!entered)return;
    const effect=this.pool.find(e=>e.age>=.75)??this.pool.reduce((a,b)=>a.age>b.age?a:b);
    effect.age=0;effect.mesh.position.set(point.x,point.y+.48,point.z);effect.mesh.visible=true;
    effect.rays=Array.from({length:14},(_,i)=>{
      const a=this.random()*Math.PI*2;
      const color=new THREE.Color().setHSL(i/14,.65,.7);
      effect.mesh.setColorAt(i,color);
      return {x:Math.cos(a),z:Math.sin(a),rise:.2+this.random()*.6,speed:.45+this.random()*.55,spin:this.random()*6};
    });
    effect.mesh.instanceColor.needsUpdate=true;
    this.draw(effect);
  }
  draw(effect){
    const t=Math.min(1,effect.age/.75),spread=1-(1-t)**2;
    effect.mesh.material.opacity=THREE.MathUtils.smoothstep(t,0,.1)*(1-t)**1.5*.75;
    effect.rays.forEach((ray,i)=>{
      this.dummy.position.set(ray.x*(.14+spread*ray.speed),spread*ray.rise,ray.z*(.14+spread*ray.speed));
      this.dummy.rotation.set(ray.spin+t*2,t*3,ray.spin-t);
      this.dummy.scale.setScalar((.65+Math.sin(i*2.3)*.2)*(1-t*.7));
      this.dummy.updateMatrix();effect.mesh.setMatrixAt(i,this.dummy.matrix);
    });
    effect.mesh.instanceMatrix.needsUpdate=true;
  }
  update(dt){for(const effect of this.pool)if(effect.age<.75){effect.age+=dt;effect.mesh.visible=effect.age<.75;if(effect.mesh.visible)this.draw(effect);}}
  reset(){this.lastZone=null;for(const effect of this.pool){effect.age=1;effect.mesh.visible=false;}}
}
