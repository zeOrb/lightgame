// Shared feedback for instant light recovery: shards and absorbed stained glass.
export class LightBarRecovery {
  constructor(value=100){this.reset(value);}
  reset(value){this.displayed=value;this.tween=null;this.hold=0;this.pulse=0;}
  receive(value){
    const gap=Math.max(0,value-this.displayed);
    if(gap>0)this.tween={gap,age:0};
  }
  tick(dt){this.hold=Math.max(0,this.hold-dt);this.pulse=Math.max(0,this.pulse-dt);}
  update(value,max,dt){
    if(this.tween){
      this.tween.age=Math.min(.5,this.tween.age+dt);
      const t=this.tween.age/.5;
      this.displayed=Math.max(0,Math.min(max,value-this.tween.gap*(1-t*t)));
      if(t>=1){this.tween=null;this.hold=.2;this.pulse=.333;}
    }else this.displayed=value;
    return this.displayed;
  }
  get holding(){return this.hold>0;}
  get scale(){return 1+(this.pulse>0?.28*Math.sin(Math.PI*(1-this.pulse/.333)):0);}
}
