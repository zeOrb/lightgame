export class TreeViewport {
  constructor(){this.x=0;this.y=0;this.zoom=1;}
  center(width,height){this.x=width/2-800*this.zoom;this.y=height/2-800*this.zoom;}
  pan(x,y){this.x+=x;this.y+=y;}
  zoomAt(x,y,factor){
    const next=Math.max(.35,Math.min(1.75,this.zoom*factor)),ratio=next/this.zoom;
    this.x=x-(x-this.x)*ratio;this.y=y-(y-this.y)*ratio;this.zoom=next;
  }
  transform(){return `translate(${this.x}px,${this.y}px) scale(${this.zoom})`;}
}
