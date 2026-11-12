// A broken mirror stays broken until the next run. The breaking dash is spent
// on the shield; it cannot also kill the beast behind it in the same frame.
export class EliteWard {
  constructor(s){this.s=s-.85;this.reset();}
  reset(){this.protected=true;}
  contact(from,to,lane,height){
    return this.protected&&Math.abs(lane)<2.4&&height<2.7&&Math.min(from,to)<=this.s+.16&&Math.max(from,to)>=this.s-.16;
  }
  breakWithDash(){if(!this.protected)return false;this.protected=false;return true;}
}
