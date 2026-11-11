import * as THREE from 'three';
import {createVisualRandom} from './visual-random.js';
const random=createVisualRandom('rabbit-fall');
export class FallingShadows {
  constructor(scene,texture){
    this.group=new THREE.Group();scene.add(this.group);this.clock=0;this.cursor=0;
    this.motes=Array.from({length:56},()=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#020105',transparent:true,opacity:0,depthWrite:false}));this.group.add(sprite);return {sprite,age:10,life:1};});
  }
  reset(){this.clock=0;for(const m of this.motes){m.age=10;m.sprite.material.opacity=0;}}
  update(dt,position,strength){
    this.clock+=dt;
    while(this.clock>.035){this.clock-=.035;const m=this.motes[this.cursor++%this.motes.length];m.age=0;m.life=.8+random()*.9;m.sprite.position.copy(position);m.sprite.position.x+=(random()-.5)*.6;m.sprite.position.y+=random()*.6;m.sprite.position.z+=(random()-.5)*.6;m.dx=(random()-.5)*1.1;m.dz=(random()-.5)*1.1;m.size=.3+random()*.7;m.strength=strength;}
    for(const m of this.motes){m.age+=dt;const t=m.age/m.life;if(t>=1){m.sprite.material.opacity=0;continue;}m.sprite.position.x+=m.dx*dt;m.sprite.position.z+=m.dz*dt;m.sprite.position.y+=dt*(1.3+t);m.sprite.scale.set(m.size*(1+t),m.size*(1.5+t*2),1);m.sprite.material.opacity=Math.sin(t*Math.PI)*m.strength*.95;}
  }
}
