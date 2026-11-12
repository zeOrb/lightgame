import {clamp,lightStep,route} from './game.js';
export function traceVitralPath(state,fromS,toS,lane,height,sampleZone){
  const steps=Math.max(1,Math.ceil(Math.abs(toS-fromS)/.08));
  for(let i=1;i<=steps;i++)state.setVitral(sampleZone(route(fromS+(toS-fromS)*i/steps,lane),height),true);
}
export const RabbitMode=Object.freeze({NORMAL:'normal',VITRAL:'vitral',FALLING:'falling'});
export class RabbitState {
  constructor(upgrades={}){this.upgrades=upgrades;this.reset();}
  reset(){this.mode=RabbitMode.NORMAL;this.zone=null;this.fall=null;this.vitralTime=0;this.pendingHeal=0;this.entryHealedZones=new Set();this.dashHealedZones=new Set();this.healPulse=0;this.lightCharge=0;this.chargeZone=null;}
  setVitral(zone,phasing=false,jumping=false){
    if(this.mode===RabbitMode.FALLING)return;
    if(!zone||this.mode!==RabbitMode.VITRAL)this.vitralTime=0;
    const beforeHeal=this.pendingHeal;
    if(zone&&(phasing||jumping)&&this.upgrades.rayEntryHeal&&!this.entryHealedZones.has(zone)){this.pendingHeal+=this.upgrades.rayEntryHeal;this.entryHealedZones.add(zone);}
    if(zone&&phasing&&this.upgrades.rayDashHeal&&!this.dashHealedZones.has(zone)){this.pendingHeal+=this.upgrades.rayDashHeal;this.dashHealedZones.add(zone);}
    if(this.pendingHeal>beforeHeal){this.lightCharge=1.5;this.chargeZone={palette:zone.palette,lightStrength:1};}
    this.zone=zone;this.mode=zone?RabbitMode.VITRAL:RabbitMode.NORMAL;
  }
  updateLight(light,dt,shadow,{passive=true}={}){
    if(this.mode===RabbitMode.FALLING)return light;
    const vitral=this.mode===RabbitMode.VITRAL;
    this.healPulse=Math.max(0,this.healPulse-dt);
    this.lightCharge=Math.max(0,this.lightCharge-dt);
    if(this.chargeZone)this.chargeZone.lightStrength=Math.min(1,this.lightCharge/.25);
    if(this.pendingHeal){light=clamp(light+this.pendingHeal,0,this.upgrades.maxHP??100);this.pendingHeal=0;this.healPulse=.65;}
    const next=lightStep(light,dt,{...this.upgrades,...(!passive?{drainScale:0}:{}),shadow,vitral:vitral&&!this.upgrades.rayEntryHeal,vitralTime:this.vitralTime});
    if(vitral)this.vitralTime+=dt;
    return next;
  }
  startFall(position,outward,launched=true){
    if(this.mode===RabbitMode.FALLING)return false;
    this.mode=RabbitMode.FALLING;this.zone=null;this.vitralTime=0;this.pendingHeal=0;this.healPulse=0;this.lightCharge=0;this.chargeZone=null;
    this.fall={x:position.x,y:position.y,z:position.z,startY:position.y,angle:Math.atan2(position.z,position.x),radius:Math.hypot(position.x,position.z),radialSpeed:(outward?1:-1)*(launched?13:6),vy:launched?3:-1,time:0,landTime:0,landed:false,wallHit:false,done:false,dissolve:0};return true;
  }
  updateFall(dt){
    const f=this.fall;if(!f||f.done)return f;
    f.time+=dt;
    if(!f.landed){
      f.radius+=f.radialSpeed*dt;
      if(f.radius>18){f.radius=18;f.radialSpeed=-17;f.vy=-1;f.wallHit=true;}
      if(f.radius<5){f.radius=5;f.radialSpeed=0;}
      f.vy=Math.max(-42,f.vy-14*dt);f.y+=f.vy*dt;
      if(f.y<=.35){f.y=.35;f.landed=true;}
    }else{f.landTime+=dt;f.done=f.landTime>.85;}
    f.x=Math.cos(f.angle)*f.radius;f.z=Math.sin(f.angle)*f.radius;
    const descent=clamp((f.startY-f.y)/Math.max(1,f.startY-.35),0,1);
    f.dissolve=f.landed?1:clamp((descent-.12)/.78,0,.98);
    return f;
  }
}
