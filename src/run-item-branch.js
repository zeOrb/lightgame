import branchSource from './run-item-hover-leaves.svg?raw';
import {addLeafGlint} from './ui-leaf-glints.js';

const GROW_MS=900,RETRACT_MS=160;
const clamp=value=>Math.max(0,Math.min(1,value));
const unfold=value=>1-Math.pow(1-value,3);
let nextId=0;
const SVG='http://www.w3.org/2000/svg';
function node(name,attributes){const element=document.createElementNS(SVG,name);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));return element;}

// An instance owns only presentation. Selection remains in RunItemUI.
export class RunItemBranch{
  constructor(){
    const prefix=`run-item-branch-${nextId++}-`;
    const source=branchSource.replaceAll('id="fade"',`id="${prefix}fade"`).replaceAll('id="ends"',`id="${prefix}ends"`).replaceAll('url(#fade)',`url(#${prefix}fade)`).replaceAll('url(#ends)',`url(#${prefix}ends)`);
    this.element=document.importNode(new DOMParser().parseFromString(source,'image/svg+xml').documentElement,true);
    this.element.classList.add('run-item-branch');this.element.setAttribute('aria-hidden','true');this.element.setAttribute('focusable','false');
    const definitions=this.element.querySelector('defs'),glowId=prefix+'leaf-glow';
    const glow=node('filter',{id:glowId,x:'-100%',y:'-100%',width:'300%',height:'300%','color-interpolation-filters':'sRGB'});
    glow.append(node('feGaussianBlur',{in:'SourceGraphic',stdDeviation:1.1,result:'light'}));
    const merge=node('feMerge',{});merge.append(node('feMergeNode',{in:'light'}),node('feMergeNode',{in:'SourceGraphic'}));glow.append(merge);definitions.append(glow);
    const main=this.element.querySelector('[data-grow="stem"]');
    const length=main.getTotalLength(),points=Array.from({length:97},(_,i)=>main.getPointAtLength(length*i/96));
    this.parts=[...this.element.querySelectorAll('[data-grow]')].map((element,index)=>{
      const kind=element.dataset.grow,anchor=(element.dataset.anchor??'0 0').split(' ').map(Number);
      let nearest=0;
      if(kind==='leaf'||kind==='curl')for(let i=1;i<points.length;i++)if(Math.hypot(points[i].x-anchor[0],points[i].y-anchor[1])<Math.hypot(points[nearest].x-anchor[0],points[nearest].y-anchor[1]))nearest=i;
      const start=Number(element.dataset.start??(kind==='root'?0:.13+.73*nearest/96));
      const duration=Number(element.dataset.duration??(kind==='root'?.13:.15));
      if(kind==='stem'||kind==='curl'){element.setAttribute('pathLength','1');element.style.strokeDasharray='1 1';}
      let birthLight=null,ambientLight=null;
      if(element.dataset.tip){
        const [tx,ty]=element.dataset.tip.split(' ').map(Number),gradientId=prefix+'leaf-'+index;
        const gradient=node('linearGradient',{id:gradientId,gradientUnits:'userSpaceOnUse',x1:anchor[0],y1:anchor[1],x2:tx,y2:ty});
        gradient.append(node('stop',{offset:0,'stop-color':'currentColor','stop-opacity':0}),node('stop',{offset:'.5','stop-color':'currentColor','stop-opacity':'.3'}),node('stop',{offset:1,'stop-color':'color-mix(in srgb,currentColor 40%,white)'}));definitions.append(gradient);
        birthLight=node('path',{d:element.querySelector('path').getAttribute('d'),fill:`url(#${gradientId})`,'fill-opacity':1,stroke:`url(#${gradientId})`,'stroke-width':'.8',filter:`url(#${glowId})`,opacity:0});
        element.insertBefore(birthLight,element.children[1]??null);
        ambientLight=addLeafGlint(this.element,element,element.querySelector('path'),'up','rarity');
      }
      return {element,kind,anchor,start,duration,birthLight,ambientLight};
    });
    this.progress=0;this.active=false;this.raf=0;this.disposed=false;
    this.tick=now=>{
      this.raf=0;if(this.disposed)return;
      const fraction=clamp((now-this.started)/this.duration);
      this.render(this.from+(this.to-this.from)*fraction);
      if(fraction<1)this.raf=requestAnimationFrame(this.tick);
    };
    this.render(0);
  }
  render(progress){
    this.progress=progress;
    for(const {element,kind,anchor,start,duration,birthLight,ambientLight} of this.parts){
      const local=clamp((progress-start)/duration);
      element.style.visibility=local===0?'hidden':'visible';
      if(birthLight)birthLight.setAttribute('opacity',String(this.active&&local>0&&local<1?Math.pow(Math.sin(Math.PI*local),.75)*.9:0));
      if(ambientLight)ambientLight.style.visibility=this.active&&local===1?'visible':'hidden';
      if(kind==='stem'||kind==='curl')element.style.strokeDashoffset=String(1-(kind==='curl'?unfold(local):local));
      else{
        const growth=unfold(local),[x,y]=anchor;
        const width=growth,height=kind==='leaf'?growth*(.3+.7*growth):growth;
        const angle=kind==='leaf'?(y>=23?-10:10)*(1-growth):0;
        element.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(${width} ${height}) translate(${-x} ${-y})`);
      }
    }
  }
  setActive(active){
    if(this.active===active||this.disposed)return;
    this.active=active;cancelAnimationFrame(this.raf);this.raf=0;
    const target=active?1:0;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){this.render(target);return;}
    this.from=this.progress;this.to=target;this.started=performance.now();
    this.duration=Math.max(1,(active?GROW_MS:RETRACT_MS)*Math.abs(target-this.progress));
    this.raf=requestAnimationFrame(this.tick);
  }
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.raf=0;}
}
