import * as THREE from 'three';
import {createVisualRandom} from './random-manager.js';
const random=createVisualRandom('landing-dust');
export class LandingEffects {
  constructor(scene,texture){
    this.group=new THREE.Group();scene.add(this.group);this.age=1;
    this.dust=Array.from({length:16},()=>{
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#e0cfb1',transparent:true,depthWrite:false,fog:true,opacity:0}));
      this.group.add(sprite);return {sprite,offset:new THREE.Vector3(),travel:new THREE.Vector3(),size:1};
    });
  }
  land(point,strength,direction=null,speed=0){
    this.group.position.copy(point);this.age=0;this.strength=THREE.MathUtils.clamp(strength,.2,1);
    const length=Math.hypot(direction?.x??0,direction?.z??0);
    const moving=length>.001?THREE.MathUtils.clamp(speed/5,0,1):0;
    this.moving=moving;this.duration=.7+moving*.12;
    const forward=new THREE.Vector3((direction?.x??0)/(length||1),0,(direction?.z??0)/(length||1));
    const side=new THREE.Vector3(forward.z,0,-forward.x);
    this.dust.forEach((p,i)=>{
      const angle=(i+random())/this.dust.length*Math.PI*2;
      const radius=.65+random()*.65;
      p.travel.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);
      // Braking dust trails behind the rabbit, opposite its travel direction.
      p.travel.multiplyScalar(1-moving*.75).addScaledVector(forward,-moving*(1.35+random()*1.15))
        .addScaledVector(side,moving*(i%2?1:-1)*(.18+random()*.32));
      p.offset.set(Math.cos(angle)*.12,0,Math.sin(angle)*.12);
      p.size=(.35+random()**2*.95)*(1+moving*.22);
      p.lift=.12+random()*.17+moving*.13;
      p.drag=3.2+random()*1.6;
      p.sprite.material.rotation=random()*Math.PI*2;
    });
  }
  update(dt){
    this.age+=dt;const t=this.age/(this.duration??.7);
    for(const {sprite,offset,travel,size,lift,drag} of this.dust){
      sprite.visible=t<1;if(t>=1)continue;
      // Exact integral of exponentially damped velocity: fast initial puff,
      // then air resistance slows it without frame-rate-dependent stepping.
      const spread=(1-Math.exp(-drag*this.age))/(1-Math.exp(-drag*this.duration));
      sprite.position.copy(offset).addScaledVector(travel,spread*(.3+this.strength*.4));
      sprite.position.y=.10+spread*lift;
      sprite.scale.setScalar((.14+spread*.19)*size*(.5+this.strength*.5));
      sprite.material.opacity=THREE.MathUtils.smoothstep(t,0,.07)
        *(1-THREE.MathUtils.smootherstep(t,.2,1))*(.32+this.strength*.25);
    }
  }
  reset(){this.age=1;this.update(0);}
}
