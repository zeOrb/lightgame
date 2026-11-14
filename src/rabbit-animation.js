import * as THREE from 'three';
const DASH_FLATTEN=.75;
const DASH_PITCH=THREE.MathUtils.lerp(1.4,Math.PI/2,DASH_FLATTEN);

export class RabbitAnimation {
  constructor(visual,ears,paws,tail,arms=[],head=null){
    this.visual=visual;this.ears=ears;this.paws=paws;this.tail=tail;this.arms=arms;this.head=head;
    this.headRest=head?.position.clone();
    this.cloth=[];tail.traverse(mesh=>{if(mesh.userData.cloth){const position=mesh.geometry.attributes.position;position.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;this.cloth.push({mesh,rest:new Float32Array(position.array),kind:mesh.userData.cloth});}});
    this.reset();
  }
  reset(){
    this.phase=0;this.blend=0;this.air=0;this.landing=0;this.lastVelocity=0;this.wasAirborne=false;this.fallTime=0;
    this.clothTime=0;this.clothWind=0;this.clothTurn=0;this.fallClothBlend=0;this.dashClothBlend=0;this.dashClothTime=0;
    this.dashActive=false;this.dashTransition=0;this.dashFrom=0;
    this.jumpAge=1;this.jumpActive=false;this.launchVelocity=1;this.jumpRise=0;this.jumpMoving=false;this.launchSpeed=0;this.apexAge=-1;this.jumpBounce=0;
    this.visual.position.set(0,0,0);this.visual.rotation.set(0,0,0);this.visual.scale.setScalar(1);
    this.tail.rotation.set(0,0,0);
    if(this.head){this.head.rotation.set(0,0,0);this.head.position.copy(this.headRest);}
    for(const cloth of this.cloth){cloth.mesh.geometry.attributes.position.array.set(cloth.rest);cloth.mesh.geometry.attributes.position.needsUpdate=true;}
    this.pose(0,0,0);
  }
  updateFall(dt){
    if(this.head){this.head.rotation.x=THREE.MathUtils.damp(this.head.rotation.x,0,12,dt);this.head.position.lerp(this.headRest,1-Math.exp(-12*dt));}
    this.fallTime+=dt;
    this.clothTime+=dt;
    this.fallClothBlend=THREE.MathUtils.damp(this.fallClothBlend,1,4.5,dt);
    const t=this.fallTime,flip=THREE.MathUtils.smoothstep(t,0,.55),kick=t*17;
    const flutter=THREE.MathUtils.smoothstep(t,.12,1.4);
    this.visual.position.set(Math.sin(t*4.1)*.07*flutter,.65*flip+Math.sin(t*8)*.035*flutter,0);
    this.visual.rotation.set(Math.PI*flip+Math.sin(t*5.3)*.20*flutter,Math.sin(t*2.2)*.35*flutter,(Math.sin(t*3.5)*.22+Math.sin(t*7.1)*.09)*flip);
    this.paws.forEach((paw,i)=>{
      const step=Math.sin(kick*(1+i*.09)+i*2.7)+Math.sin(t*25+i)*.16;
      paw.position.y=.065+Math.max(0,step)*.065;
      paw.position.z=.12+step*.1;
      paw.rotation.set(step*1.15,Math.sin(t*8+i)*.25,Math.sin(kick*.8+i*Math.PI)*.42);
    });
    this.ears.forEach((ear,i)=>{
      ear.rotation.x=(.7+Math.sin(t*(9+i*1.7)+i)*.38)*flip;
      ear.rotation.z=(i===0?.165:-.165)+Math.sin(t*(7+i)+i)*.25*flip;
    });
    this.arms.forEach((arm,i)=>arm.rotation.set(Math.sin(t*14+i*2.3)*.8,Math.sin(t*9+i)*.25,(i?1:-1)*(.45+Math.sin(t*11+i)*.4)));
    const coatPose=new THREE.Euler(-.22*flutter+Math.sin(t*3.7)*.16*flutter,Math.sin(t*2.9)*.22*flutter,Math.sin(t*4.3+.8)*.19*flutter);
    this.tail.quaternion.slerp(new THREE.Quaternion().setFromEuler(coatPose),1-Math.exp(-dt*8));
    this.clothWind=THREE.MathUtils.damp(this.clothWind,flutter,6,dt);
    this.animateCloth(this.clothTime,this.clothWind,true);
  }
  animateCloth(time,wind,falling=false){
    this.cloth.forEach(({mesh,rest,kind},index)=>{
      const phase=mesh.userData.clothPhase??index;
      const position=mesh.geometry.attributes.position;
      for(let i=0;i<position.count;i++){
        const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
        const loose=kind==='scarf'?THREE.MathUtils.clamp(-x/.39,0,1):THREE.MathUtils.clamp(-y/.47,0,1);
        const wave=Math.sin(time*(10+phase)-loose*6+phase*1.8)+Math.sin(time*17-loose*9)*.3;
        let normalX=x+wave*loose*wind*.065;
        let normalY=y+Math.sin(time*12+loose*4+phase)*loose*wind*.045+.09*loose*wind;
        let normalZ=z+loose*loose*wind*(-.38+wave*.12);
        if(!falling&&this.dashClothBlend>.001){
          const rush=this.dashClothBlend,clock=this.dashClothTime;
          const ripple=Math.sin(clock*23-loose*8+phase*1.7);
          // With the torso horizontal, local -Y is behind the rabbit.
          const sweptY=y-loose*loose*.52+ripple*loose*.05;
          const sweptZ=z+loose*loose*(.02+ripple*.045);
          const sweptX=x+(phase<0?-1:1)*loose*.085+Math.sin(clock*18-loose*8+phase*2)*loose*.10;
          normalX=THREE.MathUtils.lerp(normalX,sweptX,rush);
          normalY=THREE.MathUtils.lerp(normalY,sweptY,rush);
          normalZ=THREE.MathUtils.lerp(normalZ,sweptZ,rush);
        }
        if(falling){
          // A rolling fold travels from the collar to the hem. Both tails and
          // their emissive edging use the same phase, so they stay stitched.
          const side=phase<0?-1:1;
          const gust=.72+.28*Math.sin(time*2.3+phase*1.9);
          const fold=loose*(.75+gust*.45)+Math.sin(time*(6.4+phase*.55)-loose*5+phase*2)*loose*.52;
          const twist=Math.sin(time*4.2-loose*3+phase*2.1)*loose*.38;
          const fallX=x+side*loose*loose*.095+Math.sin(time*(8.1+phase*.7)-loose*7+phase)*loose*.105;
          const fallY=y*Math.cos(fold)-z*Math.sin(fold)-loose*.07*gust;
          const fallZ=y*Math.sin(fold)+z*Math.cos(fold)+twist;
          const blend=this.fallClothBlend;
          position.setXYZ(i,THREE.MathUtils.lerp(normalX,fallX,blend),THREE.MathUtils.lerp(normalY,fallY,blend),THREE.MathUtils.lerp(normalZ,fallZ,blend));
        }else position.setXYZ(i,normalX,normalY,normalZ);
      }
      position.needsUpdate=true;mesh.geometry.computeVertexNormals();
    });
  }
  update(dt,{speed,height,velocity,turn=0,skidding=false,dashing=false}){
    // Restart from the current pose when interrupted; smoothstep gives both
    // ends a soft slope, with a fast launch and a longer cloth follow-through.
    if(dashing!==this.dashActive){this.dashActive=dashing;this.dashFrom=this.dashClothBlend;this.dashTransition=0;}
    this.dashTransition+=dt;
    const dashEase=THREE.MathUtils.smoothstep(this.dashTransition,0,dashing?.075:.24);
    this.dashClothBlend=THREE.MathUtils.lerp(this.dashFrom,dashing?1:0,dashEase);
    const rush=this.dashClothBlend;
    this.dashClothTime+=dt;
    const airborne=height>.025;
    if(airborne&&velocity>0&&(!this.wasAirborne||this.lastVelocity<=0)&&!this.jumpActive)this.jump(velocity,speed);
    this.jumpAge+=dt;
    const compressEnd=this.jumpMoving?.09:.10,stretchEnd=this.jumpMoving?.25:.28;
    const takeoff=THREE.MathUtils.smootherstep(this.jumpAge,compressEnd,stretchEnd);
    const ascentProgress=1-THREE.MathUtils.clamp(velocity/this.launchVelocity,0,1);
    const apexReturn=1-THREE.MathUtils.smootherstep(ascentProgress,.75,1);
    if(this.apexAge>=0)this.apexAge+=dt;
    else if(this.jumpActive&&airborne&&this.lastVelocity>0&&velocity<=0)this.apexAge=dt*(-velocity)/(this.lastVelocity-velocity);
    const bounceTime=this.apexAge/.24;
    this.jumpBounce=this.jumpActive&&airborne&&bounceTime>=0&&bounceTime<1
      ?.045*Math.sin(-bounceTime*Math.PI*3)*Math.exp(-bounceTime*3)*(1-THREE.MathUtils.smootherstep(bounceTime,.7,1)):0;
    this.jumpRise=this.jumpActive&&airborne&&velocity>0?takeoff*apexReturn:0;
    if(this.wasAirborne&&!airborne)this.landing=.16+THREE.MathUtils.clamp(-this.lastVelocity/9,0,1)*.16;
    if(!airborne&&velocity<=0)this.jumpActive=false;
    this.lastVelocity=velocity;
    this.wasAirborne=airborne;
    this.landing=Math.max(0,this.landing-dt);
    this.blend=THREE.MathUtils.damp(this.blend,Math.min(1,speed/3.6),12,dt);
    this.air=THREE.MathUtils.damp(this.air,airborne?1:0,14,dt);
    this.phase+=speed*dt*5.5;
    const step=Math.sin(this.phase),hop=Math.max(0,step),ground=airborne?0:(1-this.air)*(1-rush);
    const diagonal=this.jumpActive&&airborne&&this.jumpMoving;
    // Stretch along a deliberate line of action, not a sideways running sway.
    // Straighten near the apex, then reach the feet slightly ahead to land.
    const jumpLean=diagonal?(velocity>0
      ?THREE.MathUtils.clamp(Math.atan2(this.launchSpeed,this.launchVelocity),.35,.8)*this.jumpRise
      :-.22*THREE.MathUtils.smoothstep(-velocity/this.launchVelocity,0,1)*THREE.MathUtils.smoothstep(height,0,.45)):0;
    this.visual.position.y=hop*.21*this.blend*ground;
    this.visual.rotation.x=(skidding?-.28:.22)*this.blend*ground+jumpLean;
    this.visual.rotation.z=(Math.sin(this.phase*.5)*.08*this.blend-THREE.MathUtils.clamp(turn,-1,1)*.13)*ground;
    let squash=1+(hop*.19-Math.max(0,-step)*.15)*this.blend*ground-this.landing*1.05;
    if(this.jumpActive&&velocity>0){
      // Hold the stretch through 3/4 of ascent, then release it at the apex.
      if(this.jumpAge<compressEnd)squash=THREE.MathUtils.lerp(1,.67,THREE.MathUtils.smootherstep(this.jumpAge,0,compressEnd));
      else if(this.jumpAge<stretchEnd)squash=THREE.MathUtils.lerp(.67,1.33,takeoff);
      else squash=1.33;
      // A short/cut jump must also meet the neutral pose without a snap.
      squash=THREE.MathUtils.lerp(1,squash,apexReturn);
    }
    else if(this.jumpActive&&airborne)squash=1+this.jumpBounce;
    const y=airborne||this.jumpActive?squash:THREE.MathUtils.damp(this.visual.scale.y,squash,18,dt),width=1/Math.sqrt(y);
    this.visual.scale.set(width,y,width);
    this.visual.position.x=0;this.visual.position.z=0;
    this.pose(skidding?step*.3:step,ground,velocity);
    if(diagonal){
      this.paws.forEach(paw=>{paw.rotation.x=-.3*this.jumpRise;paw.position.z=.12-.06*this.jumpRise;});
      this.arms.forEach(arm=>{arm.rotation.x=.45*this.jumpRise;});
    }
    // The root keeps its physics position/yaw; only the traveller leans into
    // the burst, so collision, shadow and the trail remain aligned.
    this.visual.position.y=THREE.MathUtils.lerp(this.visual.position.y,.36,rush);
    this.visual.position.z*=1-rush;
    this.visual.rotation.x=THREE.MathUtils.lerp(this.visual.rotation.x,DASH_PITCH,rush);
    this.visual.rotation.z*=1-rush;
    this.visual.scale.set(THREE.MathUtils.lerp(this.visual.scale.x,1,rush),THREE.MathUtils.lerp(this.visual.scale.y,1,rush),THREE.MathUtils.lerp(this.visual.scale.z,1,rush));
    if(this.head){
      this.head.rotation.x=THREE.MathUtils.lerp(-jumpLean-.2*this.jumpRise-this.jumpBounce,-(DASH_PITCH+.16),rush);
      this.head.position.copy(this.headRest);
      this.head.position.z+=.10*DASH_FLATTEN*rush;
    }
    this.ears.forEach((ear,i)=>{
      ear.rotation.x=THREE.MathUtils.lerp(ear.rotation.x,-1.22+Math.sin(this.dashClothTime*22+i*.8)*.055,rush);
      ear.rotation.z=THREE.MathUtils.lerp(ear.rotation.z,(i===0?.22:-.22),rush);
    });
    this.paws.forEach((paw,i)=>{
      paw.position.y=THREE.MathUtils.lerp(paw.position.y,-.08,rush);
      paw.position.z=THREE.MathUtils.lerp(paw.position.z,.12,rush);
      paw.rotation.x=THREE.MathUtils.lerp(paw.rotation.x,THREE.MathUtils.lerp(-2.55,-Math.PI,DASH_FLATTEN),rush);
      paw.rotation.z=THREE.MathUtils.lerp(paw.rotation.z,(i?1:-1)*.16,rush);
    });
    this.arms.forEach((arm,i)=>{
      arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,THREE.MathUtils.lerp(-.2,Math.PI/2-DASH_PITCH,DASH_FLATTEN),rush);
      arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,(i?1:-1)*.22,rush);
    });
    const movement=THREE.MathUtils.clamp(speed/5,0,1);
    const wind=.035+movement*.95+this.air*.18;
    this.clothTime+=dt*(.7+movement*.4);
    this.clothWind=THREE.MathUtils.damp(this.clothWind,wind,wind>this.clothWind?6:3,dt);
    this.clothTurn=THREE.MathUtils.damp(this.clothTurn,THREE.MathUtils.clamp(turn,-1,1)*movement,6,dt);
    this.tail.rotation.set(-this.clothWind*.22+Math.sin(this.clothTime*4)*this.clothWind*.06,-this.clothTurn*.18,Math.sin(this.clothTime*3)*this.clothWind*.035+Math.sin(this.dashClothTime*11)*this.dashClothBlend*.07);
    if(diagonal)this.tail.rotation.x-=.12*this.jumpRise;
    // Cancel the panel's rest tilt during the burst so its long edge follows
    // the horizontal travel line; leave a little roll and flutter in the cloth.
    this.tail.rotation.x=THREE.MathUtils.lerp(this.tail.rotation.x,Math.PI/2-DASH_PITCH-.33,rush);
    this.tail.rotation.y*=1-DASH_FLATTEN*rush;
    this.tail.rotation.z*=1-DASH_FLATTEN*rush;
    this.animateCloth(this.clothTime,this.clothWind);
  }
  jump(velocity=12,speed=0){this.jumpAge=0;this.jumpActive=true;this.launchVelocity=Math.max(1,velocity);this.launchSpeed=Math.abs(speed);this.jumpMoving=this.launchSpeed>.5;this.apexAge=-1;this.jumpBounce=0;}
  doubleJump(){this.jump(12,this.launchSpeed);}
  pose(step,ground,velocity){
    this.ears.forEach((ear,i)=>{
      ear.rotation.x=(-.24+Math.sin(this.phase-.7+i*.25)*.23)*this.blend*ground-(this.jumpMoving?.5:.35)*this.jumpRise-this.jumpBounce*2;
      ear.rotation.z=(i===0?.165:-.165)+Math.sin(this.phase*.5+i)*.12*this.blend*ground;
    });
    this.paws.forEach((paw,i)=>{
      const stride=step*(i===0?1:-1)*this.blend*ground;
      paw.position.y=.065+Math.max(0,stride)*.075;paw.position.z=.12+stride*.095;
      paw.rotation.set(stride*.7-.60*this.air,0,this.air?(i?1:-1)*this.air*.13:0);
    });
    this.tail.rotation.x=Math.sin(this.phase-.5)*.18*this.blend;
    this.arms.forEach((arm,i)=>{const side=i?1:-1;arm.rotation.set(Math.sin(this.phase+i*Math.PI)*.5*this.blend*ground-.65*this.air,0,side*(.12+this.air*.45));});
  }
}
