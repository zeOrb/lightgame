export const TREE_PAN_KEYS=new Set(['KeyW','KeyA','KeyS','KeyD']);
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
