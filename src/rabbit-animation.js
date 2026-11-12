import * as THREE from 'three';

export class RabbitAnimation {
  constructor(visual,ears,paws,tail){
    this.visual=visual;this.ears=ears;this.paws=paws;this.tail=tail;this.reset();
  }
  reset(){
    this.phase=0;this.blend=0;this.air=0;this.landing=0;this.lastVelocity=0;this.wasAirborne=false;this.fallTime=0;
    this.visual.position.set(0,0,0);this.visual.rotation.set(0,0,0);this.visual.scale.setScalar(1);
    this.pose(0,0,0);
  }
  updateFall(dt){
    this.fallTime+=dt;
    const t=this.fallTime,flip=THREE.MathUtils.smoothstep(t,0,.55),kick=t*17;
    this.visual.position.set(0,.65*flip,0);
    this.visual.rotation.set(Math.PI*flip,0,Math.sin(t*3.5)*.09*flip);
    this.paws.forEach((paw,i)=>{
      const step=Math.sin(kick+i*Math.PI);
      paw.position.y=.065+Math.max(0,step)*.065;
      paw.position.z=.12+step*.1;
      paw.rotation.set(step*.9,0,Math.sin(kick*.8+i*Math.PI)*.28);
    });
    this.ears.forEach((ear,i)=>{
      ear.rotation.x=.25*flip+Math.sin(t*11+i)*.12*flip;
      ear.rotation.z=(i===0?.165:-.165)+Math.sin(t*8+i)*.09*flip;
    });
    this.tail.rotation.x=Math.sin(t*13)*.25;
  }
  update(dt,{speed,height,velocity,turn=0,skidding=false}){
    const airborne=height>.025;
    if(this.wasAirborne&&!airborne)this.landing=.16+THREE.MathUtils.clamp(-this.lastVelocity/9,0,1)*.16;
    this.lastVelocity=velocity;
    this.wasAirborne=airborne;
    this.landing=Math.max(0,this.landing-dt);
    this.blend=THREE.MathUtils.damp(this.blend,Math.min(1,speed/3.6),12,dt);
    this.air=THREE.MathUtils.damp(this.air,airborne?1:0,14,dt);
    this.phase+=speed*dt*5.5;
    const step=Math.sin(this.phase),hop=Math.max(0,step),ground=1-this.air;
    this.visual.position.y=hop*.14*this.blend*ground;
    this.visual.rotation.x=(skidding?-.18:.13)*this.blend*ground+THREE.MathUtils.clamp(-velocity*.023,-.22,.2)*this.air;
    this.visual.rotation.z=Math.sin(this.phase*.5)*.045*this.blend*ground-THREE.MathUtils.clamp(turn,-1,1)*.07;
    const squash=1+(hop*.13-Math.max(0,-step)*.1)*this.blend*ground+.1*this.air-this.landing*.85;
    const y=THREE.MathUtils.damp(this.visual.scale.y,squash,18,dt),width=1/Math.sqrt(y);
    this.visual.scale.set(width,y,width);
    this.pose(skidding?step*.3:step,ground,velocity);
  }
  pose(step,ground,velocity){
    this.ears.forEach((ear,i)=>{
      ear.rotation.x=-.16*this.blend+Math.sin(this.phase-.7+i*.25)*.13*this.blend-velocity*.018*this.air;
      ear.rotation.z=(i===0?.165:-.165)+Math.sin(this.phase*.5+i)*.07*this.blend;
    });
    this.paws.forEach((paw,i)=>{
      const stride=step*(i===0?1:-1)*this.blend*ground;
      paw.position.y=.065+Math.max(0,stride)*.045;paw.position.z=.12+stride*.055;
      paw.rotation.set(stride*.4-.25*this.air,0,0);
    });
    this.tail.rotation.x=Math.sin(this.phase-.5)*.18*this.blend;
  }
}
