// Critically damped motion: continuous position and velocity across mouse events.
export class ParallaxMotion {
  constructor(){this.x=0;this.y=0;this.vx=0;this.vy=0;this.targetX=0;this.targetY=0;}
  drag(dx,dy){this.targetX+=dx;this.targetY+=dy;}
  update(dt){
    if(!(dt>0))return;
    const omega=44,decay=Math.exp(-omega*dt);
    for(const [axis,velocity,target] of [['x','vx','targetX'],['y','vy','targetY']]){
      const offset=this[axis]-this[target],c=this[velocity]+omega*offset;
      this[axis]=this[target]+(offset+c*dt)*decay;
      this[velocity]=(this[velocity]-omega*c*dt)*decay;
    }
  }
}

export class StarParallax {
  constructor(viewport,images){
    this.motion=new ParallaxMotion();
    this.reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    this.layers=images.map(image=>{const layer=document.createElement('div');layer.className='tree-sky-layer';layer.setAttribute('aria-hidden','true');layer.style.backgroundImage=image;viewport.prepend(layer);return layer;});
  }
  drag(dx,dy){if(!this.reduced)this.motion.drag(dx,dy);}
  update(dt){
    this.motion.update(dt);
    const wrap=value=>((value+384)%768+768)%768-384;
    this.layers.forEach((layer,i)=>{const speed=i===0?.15:.065;layer.style.transform=`translate3d(${wrap(this.motion.x*speed)}px,${wrap(this.motion.y*speed)}px,0)`;});
  }
}
