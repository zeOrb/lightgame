export class BeastKnockback {
  constructor(){this.reset();}
  reset(){this.motion=null;this.cooldown=0;}
  start(s,beastS,facing=1){
    if(this.cooldown>0||this.motion)return false;
    const away=Math.sign(s-beastS)||-Math.sign(facing||1);
    this.motion={from:s,to:Math.max(0,Math.round(beastS)+away),age:0};this.cooldown=.85;return true;
  }
  advance(dt){
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(!this.motion)return null;
    const m=this.motion;m.age=Math.min(.26,m.age+dt);const t=m.age/.26,ease=1-(1-t)**3;
    const result={s:m.from+(m.to-m.from)*ease,height:Math.sin(t*Math.PI)*.48};
    if(t===1)this.motion=null;
    return result;
  }
}
