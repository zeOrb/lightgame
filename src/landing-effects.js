import * as THREE from 'three';
import {createVisualRandom} from './visual-random.js';
const random=createVisualRandom('landing-dust');
export class LandingEffects {
  constructor(scene,texture){
    this.group=new THREE.Group();scene.add(this.group);this.age=1;
    this.dust=Array.from({length:16},()=>{
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#b7a68b',transparent:true,depthWrite:false,fog:false,opacity:0}));
      this.group.add(sprite);return {sprite,angle:random()*Math.PI*2,speed:.4+random()*.8};
    });
  }
  land(point,strength){this.group.position.copy(point);this.age=0;this.strength=strength;}
  update(dt){
    this.age+=dt;const t=this.age/.45;
    for(const {sprite,angle,speed} of this.dust){
      sprite.visible=t<1;if(t>=1)continue;
      const r=.18+this.age*speed*(.8+this.strength);
      sprite.position.set(Math.cos(angle)*r,.04+Math.sin(t*Math.PI)*.10,Math.sin(angle)*r);
      sprite.scale.setScalar((.14+t*.20)*this.strength);
      sprite.material.opacity=Math.sin(t*Math.PI)*.40*this.strength;
    }
  }
  reset(){this.age=1;this.update(0);}
}
