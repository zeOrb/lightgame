import * as THREE from 'three';
import {BeastVitralBurst} from './beast-vitral-burst.js';

export class BossHitEffects {
  constructor(scene,texture){
    this.pool=Array.from({length:3},()=>({burst:new BeastVitralBurst(scene,texture),age:2}));
    this.gold=['#fff9db','#ffd35a','#fff1a6'].map(color=>new THREE.Color(color));
    this.clock=0;this.shake=0;
    for(const effect of this.pool){effect.burst.group.scale.setScalar(.48);effect.burst.group.renderOrder=14;}
  }
  hit(point,palette){
    const effect=this.pool.find(item=>item.age> .7)??this.pool[0];
    effect.age=0;effect.burst.start(new THREE.Vector3(point.x,point.y,point.z),palette?.length?palette:this.gold);
    effect.burst.update(0);this.shake=.12;
  }
  update(dt){
    this.clock+=dt;this.shake*=Math.exp(-dt*22);
    for(const effect of this.pool)if(effect.age<.75){effect.age+=dt;effect.burst.update(effect.age*2.5);}
  }
  applyShake(camera){camera.translateX(Math.sin(this.clock*83)*this.shake);camera.translateY(Math.sin(this.clock*97)*this.shake*.65);}
  reset(){for(const effect of this.pool){effect.age=2;effect.burst.reset();}this.shake=0;}
}
