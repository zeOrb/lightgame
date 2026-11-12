export const TREE_PAN_KEYS=new Set(['KeyW','KeyA','KeyS','KeyD']);
export class PanTail {
  constructor(){this.clear();}
  clear(){this.x=0;this.y=0;}
  record(dx,dy,dt){const speed=Math.hypot(dx,dy)/Math.max(dt,.008),limit=Math.min(1,900/Math.max(speed,1));this.x=dx/Math.max(dt,.008)*limit;this.y=dy/Math.max(dt,.008)*limit;}
  step(dt){const fade=Math.exp(-Math.max(0,dt)/.055),x=this.x*.055*(1-fade),y=this.y*.055*(1-fade);this.x*=fade;this.y*=fade;return {x,y};}
}
export class SmoothTreeZoom {
  constructor(){this.clear();}
  clear(){this.target=null;this.velocity=0;}
  queue(camera,x,y,factor){
    this.x=x;this.y=y;this.target=Math.max(.35,Math.min(1.75,(this.target??camera.zoom)*factor));
  }
  step(camera,dt){
    if(this.target===null||!(dt>0))return false;
    const omega=24,t=Math.min(dt,.05),offset=Math.log(camera.zoom/this.target),carry=this.velocity+omega*offset,decay=Math.exp(-omega*t);
    const next=(offset+carry*t)*decay;this.velocity=(this.velocity-omega*carry*t)*decay;
    const settled=Math.abs(next)<.00005&&Math.abs(this.velocity)<.002;
    camera.zoomAt(this.x,this.y,(settled?this.target:this.target*Math.exp(next))/camera.zoom);
    if(settled)this.clear();return true;
  }
}
export function treeKeyboardDelta(keys,dt){
  const x=Number(keys.has('KeyA'))-Number(keys.has('KeyD'));
  const y=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
  const length=Math.hypot(x,y),distance=560*Math.max(0,Math.min(dt,.05));
  return length?{x:x/length*distance,y:y/length*distance}:{x:0,y:0};
}
export class TreeViewport {
  constructor(root=800){this.x=0;this.y=0;this.zoom=1;this.root=root;}
  center(width,height){this.x=width/2-this.root*this.zoom;this.y=height/2-this.root*this.zoom;}
  pan(x,y){this.x+=x;this.y+=y;}
  zoomAt(x,y,factor){
    const next=Math.max(.35,Math.min(1.75,this.zoom*factor)),ratio=next/this.zoom;
    this.x=x-(x-this.x)*ratio;this.y=y-(y-this.y)*ratio;this.zoom=next;
  }
  transform(){return `translate(${this.x}px,${this.y}px) scale(${this.zoom})`;}
}
