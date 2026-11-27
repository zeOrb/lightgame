import defaults from './combo.json' with {type:'json'};

const groundActions=new Set(['gem','vitral']);

export class Combo {
  constructor(config=defaults,{enabled=true}={}){this.config=config;this.enabled=enabled;this.reset();}
  reset(enabled=this.enabled){this.enabled=enabled;this.seen=new Map();this.end();}
  end(){this.score=0;this.count=0;this.remaining=0;this.groundTime=0;this.lastAction=null;this.repeats=0;}
  get multiplier(){return this.enabled?Math.min(this.config.maxMultiplier,1+Math.floor(this.score/this.config.scorePerMultiplier)):1;}
  get fraction(){return this.remaining/this.config.timeout;}
  crossVitral(previous,zone){
    return !!zone&&zone!==previous&&!zone.extinguished&&this.add('vitral',zone);
  }
  add(action,target){
    if(!this.enabled)return false;
    const weight=this.config.actions[action];if(!weight||target===undefined)return false;
    const seen=this.seen.get(action)??new Set();if(seen.has(target))return false;
    seen.add(target);this.seen.set(action,seen);
    const repeats=this.lastAction===action?this.repeats+1:0;
    const repeatWeight=this.config.repeatWeights[Math.min(repeats,this.config.repeatWeights.length-1)];
    const gain=weight*(groundActions.has(action)?Math.max(repeatWeight,.5):repeatWeight);
    if(gain<=0)return false;
    this.lastAction=action;this.repeats=repeats;this.score+=gain;this.count++;
    this.remaining=this.config.timeout;this.groundTime=0;return true;
  }
  update(dt,grounded=false){
    if(!this.count)return;
    this.remaining=Math.max(0,this.remaining-Math.max(0,dt));
    this.groundTime=grounded?this.groundTime+Math.max(0,dt):0;
    if(this.remaining<=0||(!groundActions.has(this.lastAction)&&this.groundTime>=this.config.groundGrace))this.end();
  }
  reward(base){return Math.floor(base*this.multiplier);}
}
