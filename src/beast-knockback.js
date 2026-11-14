export function canDamageDashCancel(age,stats){
  return !!stats.damageDashCancel&&age>=.46-Math.min(.46,Math.max(0,stats.damageDashCancelWindow??.2))&&age<.46;
}
export class BeastKnockback {
  constructor(){this.reset();}
  reset(){this.motion=null;this.cooldown=0;}
  start(s,beastS,facing=1,height=0){
    if(this.cooldown>0||this.motion)return false;
    const away=Math.sign(s-beastS)||-Math.sign(facing||1);
    this.motion={from:s,to:Math.round(beastS)+away,age:0,height};this.cooldown=.85;return true;
  }
  advance(dt){
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(!this.motion)return null;
    const m=this.motion;m.age=Math.min(.46,m.age+dt);const t=m.age/.46,travel=Math.min(1,t/.8),ease=1-(1-travel)**3;
    const result={s:m.from+(m.to-m.from)*ease,height:(m.height??0)*(1-ease)+Math.sin(travel*Math.PI)*.65};
    if(t===1)this.motion=null;
    return result;
  }
}
