import * as THREE from 'three';
import {VineLeafParticles} from './vine-leaf-particles.js';

function dirtGeometry(){
  const geometry=new THREE.IcosahedronGeometry(.075,0),positions=geometry.attributes.position,colors=[];
  for(let i=0;i<positions.count;i++){
    const shade=.8+(positions.getY(i)/.075+1)*.15;
    colors.push(.28*shade,.135*shade,.045*shade);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geometry;
}

export class SecretDirtParticles extends VineLeafParticles{
  constructor(scene,options={}){
    super(scene,{...options,capacity:64,geometry:dirtGeometry(),contacts:false});
    this.mesh.name='Secret road underside dirt';this.origin=new THREE.Vector3();this.still=new THREE.Vector3();
  }
  burst(point){
    const count=10+Math.floor(this.random()*7);
    for(let i=0;i<count;i++){
      const p=this.particles.find(p=>!p.active);if(!p)break;
      const angle=this.random()*Math.PI*2,radius=this.random()*.25,speed=.3+this.random()*1.2;
      p.active=true;p.age=0;p.life=.5+this.random()*.4;
      p.size=.5+this.random()*.9;p.width=.65+this.random()*.7;p.length=.65+this.random()*.6;
      p.position.set(point.x+Math.cos(angle)*radius,point.y-.65-this.random()*.06,point.z+Math.sin(angle)*radius);
      p.velocity.set(Math.cos(angle)*speed,-.8-this.random()*1.3,Math.sin(angle)*speed);
      p.gravity=7;p.drag=.6;
      p.rotation.set(this.random()*6,this.random()*6,angle);p.spin.set((this.random()-.5)*8,(this.random()-.5)*8,(this.random()-.5)*8);
      const tint=.85+this.random()*.3;p.color.setRGB(tint,tint,tint);
    }
  }
  updateDirt(dt,active=true){super.update(this.origin,this.still,dt,active);}
}
