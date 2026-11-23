import defaults from './combo.json' with {type:'json'};

export class Combo {
  constructor(config=defaults,{enabled=true}={}){this.config=config;this.enabled=enabled;this.reset();}
  reset(){this.seen=new Map();this.end();}
  end(){this.score=0;this.count=0;this.remaining=0;this.groundTime=0;this.lastAction=null;this.repeats=0;}
  get multiplier(){return this.enabled?Math.min(this.config.maxMultiplier,1+Math.floor(this.score/this.config.scorePerMultiplier)):1;}
  get fraction(){return this.remaining/this.config.timeout;}
  add(action,target){
    if(!this.enabled)return false;
    const weight=this.config.actions[action];if(!weight||target===undefined)return false;
    const seen=this.seen.get(action)??new Set();if(seen.has(target))return false;
    seen.add(target);this.seen.set(action,seen);
    const repeats=this.lastAction===action?this.repeats+1:0;
    const gain=weight*this.config.repeatWeights[Math.min(repeats,this.config.repeatWeights.length-1)];
    if(gain<=0)return false;
    this.lastAction=action;this.repeats=repeats;this.score+=gain;this.count++;
    this.remaining=this.config.timeout;this.groundTime=0;return true;
  }
  update(dt,grounded=false){
    if(!this.count)return;
    this.remaining=Math.max(0,this.remaining-Math.max(0,dt));
    this.groundTime=grounded?this.groundTime+Math.max(0,dt):0;
    if(this.remaining<=0||this.groundTime>=this.config.groundGrace)this.end();
  }
  reward(base){return Math.floor(base*this.multiplier);}
}
