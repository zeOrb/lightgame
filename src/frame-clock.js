// RAF timestamps describe the start of a frame and can predate module setup.
// Never mix them with a performance.now() sampled during heavy initialization.
export class FrameClock {
  constructor(maxStep=.04){this.maxStep=maxStep;this.reset();}
  reset(){this.previous=null;}
  step(now){
    if(!Number.isFinite(now))return 0;
    if(this.previous===null){this.previous=now;return 0;}
    const elapsed=Math.max(0,now-this.previous)/1000;
    this.previous=Math.max(this.previous,now);
    return Math.min(elapsed,this.maxStep);
  }
}
