import {AbilityType} from './abilities.js';
const approach=(v,target,rate,dt)=>v+Math.sign(target-v)*Math.min(Math.abs(target-v),rate*dt);
export class PlatformerMotion {
  constructor(){this.reset();}
  reset(){this.rail=0;this.x=this.z=0;this.jumpBuffer=0;this.coyote=0;this.cuttable=false;this.skidding=false;this.didDoubleJump=false;}
  tick(dt,pressed){this.jumpBuffer=pressed?.13:Math.max(0,this.jumpBuffer-dt);this.coyote=Math.max(0,this.coyote-dt);}
  ground(supported){if(supported)this.coyote=.085;}
  railStep(input,maxSpeed,airborne,dt){
    this.skidding=!airborne&&Math.abs(this.rail)>.25&&input*this.rail<0;
    const rate=airborne?(input?5:1.2):!input?16:this.skidding?21:11;
    this.rail=approach(this.rail,input*maxSpeed,rate,dt);return this.rail;
  }
  arenaStep(input,maxSpeed,airborne,dt){
    const targetX=input.x*maxSpeed,targetZ=input.z*maxSpeed;
    const active=Math.hypot(input.x,input.z)>.01;
    const rate=airborne?(active?18:5):active?38:46;
    const dx=targetX-this.x,dz=targetZ-this.z,length=Math.hypot(dx,dz),step=Math.min(length,rate*dt);
    if(length>0){this.x+=dx/length*step;this.z+=dz/length*step;}
    return {x:this.x/maxSpeed,z:this.z/maxSpeed};
  }
  tryJump(abilities,height,grounded,speedRatio=0){
    if(!this.jumpBuffer)return null;
    const dashTakeoff=abilities.phase?.groundedLaunch&&abilities.phase.age<=.05;
    const effectiveHeight=grounded||dashTakeoff||this.coyote>0&&height<=.001?0:Math.max(.01,height);
    const jump=abilities.use(AbilityType.JUMP,{height:effectiveHeight});if(!jump)return null;
    this.jumpBuffer=0;this.coyote=0;this.cuttable=true;
    this.didDoubleJump=!!jump.airJump;
    return jump.velocity*(1.27+Math.min(1,speedRatio)*.035);
  }
  jumpStep(height,velocity,dt,held){
    if(dt<=0)return {height,velocity};
    if(this.cuttable&&velocity>0&&!held){velocity=Math.min(velocity,10.05);this.cuttable=false;}
    const gravity=velocity<0?28:20;
    const next=height+velocity*dt-.5*gravity*dt*dt;
    if(next<=0){this.cuttable=false;return {height:0,velocity:0};}
    return {height:next,velocity:velocity-gravity*dt};
  }
}

