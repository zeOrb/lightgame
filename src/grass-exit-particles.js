import * as THREE from 'three';
import {VineLeafParticles} from './vine-leaf-particles.js';
import {SECRET_PASS_HEIGHT} from './secret-transition.js';

function grassGeometry(){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.018,0,0,.018,0,0,-.026,.11,.012,.026,.11,.012,.035,.25,.025],3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute([.08,.20,.025,.08,.20,.025,.22,.38,.06,.22,.38,.06,.38,.53,.16],3));
  geometry.setIndex([0,1,2,1,3,2,2,3,4]);geometry.computeVertexNormals();return geometry;
}

// Reuse the warmed, fog-aware instanced particle renderer, with grass blades.
export class GrassExitParticles extends VineLeafParticles{
  constructor(scene,options={}){
    super(scene,{...options,capacity:64,contacts:false,geometry:grassGeometry()});
    this.mesh.name='Secret road grass exit';this.lastPassAge=1;this.armed=false;
    this.stationary=new THREE.Vector3();
  }
  burst(point){
    const count=12+Math.floor(this.random()*7);
    for(let i=0;i<count;i++){
      const p=this.particles.find(p=>!p.active);if(!p)break;
      const angle=this.random()*Math.PI*2,speed=.7+this.random()*1.8;
      p.active=true;p.age=0;p.life=.7+this.random()*.55;
      p.size=.65+this.random()*.85;p.width=.7+this.random()*.8;p.length=.75+this.random()*.65;
      const radius=this.random()*.18;
      p.position.set(point.x+Math.cos(angle)*radius,point.y+SECRET_PASS_HEIGHT+.03,point.z+Math.sin(angle)*radius);
      p.velocity.set(Math.cos(angle)*speed,1.8+this.random()*1.8,Math.sin(angle)*speed);
      p.rotation.set(this.random()*6,this.random()*6,angle);
      p.spin.set((this.random()-.5)*6,(this.random()-.5)*6,(this.random()-.5)*9);
      const tint=.9+this.random()*.2;p.color.setRGB(tint,tint,tint);
    }
  }
  updatePass(point,age,dt,active){
    if(dt<=0)return;
    if(!active){this.clear();return;}
    if(age<this.lastPassAge&&age<.16)this.armed=true;
    if(this.armed&&age>=.16){this.burst(point);this.armed=false;}
    this.lastPassAge=age;
    super.update(point,this.stationary,dt,true);
  }
  clear(){super.clear();this.lastPassAge=1;this.armed=false;}
}
