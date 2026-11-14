import {createVisualRandom} from './visual-random.js';

export class SkillComets {
  constructor(viewport){
    this.viewport=viewport;this.random=createVisualRandom('skill-tree-comets');
    this.reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    this.canvas=document.createElement('canvas');this.canvas.className='tree-comets';this.canvas.setAttribute('aria-hidden','true');
    viewport.append(this.canvas);this.ctx=this.canvas.getContext('2d');this.reset();
  }
  reset(){this.parallaxX=null;this.parallaxY=null;this.slots=Array.from({length:5},()=>({comet:null,wait:.8+this.random()*10}));this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}
  spawn(w,h){
    const side=Math.floor(this.random()*4),speed=28+this.random()*38;
    let x,y,vx,vy;
    if(side<2){x=side===0?-12:w+12;y=h*(.06+this.random()*.88);vx=side===0?speed:-speed;vy=(this.random()-.5)*speed*.9;}
    else{x=w*(.06+this.random()*.88);y=side===2?-12:h+12;vx=(this.random()-.5)*speed*.9;vy=side===2?speed:-speed;}
    return {x,y,vx,vy,baseSpeed:Math.hypot(vx,vy),heading:Math.atan2(vy,vx),age:0,life:7+this.random()*5,tail:40+Math.pow(this.random(),.85)*110,hue:this.random()*360,headSize:3+this.random()*2,starArm:2+Math.floor(this.random()*3),flameSeed:this.random()*1000,warpPhase:this.random()*Math.PI*2,warpSize:4+this.random()*5,curve:(this.random()-.5)*18};
  }
  update(dt,parallax=null){
    const w=Math.max(1,Math.ceil(this.viewport.clientWidth/2)),h=Math.max(1,Math.ceil(this.viewport.clientHeight/2));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    const c=this.ctx;c.clearRect(0,0,w,h);if(this.reduced||dt<=0)return;
    const px=parallax?.x??0,py=parallax?.y??0;
    const shiftX=this.parallaxX===null?0:(px-this.parallaxX)*.05,shiftY=this.parallaxY===null?0:(py-this.parallaxY)*.05;
    this.parallaxX=px;this.parallaxY=py;
    for(const slot of this.slots){
      if(slot.comet){slot.comet.x+=shiftX;slot.comet.y+=shiftY;}
      if(!slot.comet){slot.wait-=dt;if(slot.wait<=0)slot.comet=this.spawn(w,h);}
      const p=slot.comet;if(!p)continue;
      p.age+=dt;
      if(p.age>=p.life){slot.comet=null;slot.wait=3+this.random()*15;continue;}
      const heading=p.heading+Math.sin(p.age*.34+p.warpPhase)*.16+Math.sin(p.age*.71+p.warpPhase)*.045;
      const speed=p.baseSpeed*(.78+.22*Math.sin(p.age*.65+p.warpPhase))*(.6+.4*Math.min(1,p.age/1.2));
      p.vx=Math.cos(heading)*speed;p.vy=Math.sin(heading)*speed;
      p.x+=p.vx*dt;p.y+=p.vy*dt;this.draw(c,p);
    }
  }
  draw(c,p){
    const alpha=Math.min(1,p.age/.4,(p.life-p.age)/.7)*.85;
    const speed=Math.hypot(p.vx,p.vy),dx=p.vx/speed,dy=p.vy/speed;
    const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+p.flameSeed)*43758.5453;return n-Math.floor(n);};
    const noise=(x,y)=>{
      const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
      const a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);
      return (hash(ix,iy)*(1-a)+hash(ix+1,iy)*a)*(1-b)+(hash(ix,iy+1)*(1-a)+hash(ix+1,iy+1)*a)*b;
    };
    const plot=(u,v,color,opacity)=>{
      c.globalAlpha=alpha*opacity;c.fillStyle=color;
      c.fillRect(Math.round(p.x-dx*u-dy*v),Math.round(p.y-dy*u+dx*v),1,1);
    };
    const radius=p.headSize,limit=Math.ceil(radius*2.5);
    for(let u=-limit;u<p.tail;u++){
      const t=Math.max(0,u/p.tail),fade=Math.pow(1-t,.85);
      const warp=(Math.sin(t*8-p.age*1.7+p.warpPhase)*p.warpSize+p.curve)*t*t;
      const broad=noise(u*.10-p.age*.6,4.7),width=radius*(.32+.28*(1-t))*(.65+broad*.85);
      for(let v=-limit;v<=limit;v++){
        const grain=hash(u,v),cloud=noise(u*.18-p.age*1.4,v*.23);
        const ribbonDistance=Math.abs(v)/width;
        const tailMask=u>0?Math.max(0,1-ribbonDistance*.55+(cloud-.5)*.65)*fade:0;
        const halo=tailMask*.7;
        if(halo<=.04||grain>halo*.88)continue;
        const w=v+warp;
        // Broad violet vapour surrounds the cyan stream, with pixelated noise.
        plot(u,w,grain>.5?'#5555a5':'#674b91',halo*.17);
        const tailBody=u>0?Math.max(0,1-ribbonDistance+(cloud-.5)*.8)*fade:0;
        const density=tailBody;
        if(density<=.05)continue;
        let color;
        if(density>.68)color=grain>.35?'#f4ffff':'#d8ffff';
        else if(density>.38)color=grain>.45?'#9feaff':'#a9cfff';
        else color='hsl('+((195+t*65+Math.sin(p.hue)*15)%360)+' 55% '+(58+grain*22)+'%)';
        plot(u,w,color,Math.min(1,density*1.7)*(.7+grain*.3));
        if(density>.78)plot(u,w,'#ffffff',.95);
      }
    }
    for(let i=0;i<25;i++){
      const t=(i*.618+p.age*.08)%1,u=t*p.tail;
      const warp=(Math.sin(t*8-p.age*1.7+p.warpPhase)*p.warpSize+p.curve)*t*t;
      const v=warp+Math.sin(i*13.7+p.warpPhase)*(radius*.4+t*radius*1.5);
      plot(u,v,i%4?'#d3edff':'#fffef0',(1-t)*.65);
    }
    // Same simple, axis-aligned pixel cross as the stationary sky stars.
    const x=Math.round(p.x),y=Math.round(p.y),arm=p.starArm;
    c.globalAlpha=alpha*.55;c.fillStyle='#aaaebd';
    c.fillRect(x-arm-1,y,arm*2+3,1);c.fillRect(x,y-arm-1,1,arm*2+3);
    c.globalAlpha=alpha;c.fillStyle='#f3f3f1';
    c.fillRect(x-arm,y,arm*2+1,1);c.fillRect(x,y-arm,1,arm*2+1);
    if(arm>=3)c.fillRect(x-1,y-1,3,3);
    c.globalAlpha=1;
  }
}
