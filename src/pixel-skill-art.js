import {SKILLS} from './progression.js';
import {FrameClock} from './frame-clock.js';
export function skillPosition(skill){
  const angle=-Math.PI/2+skill.ray*Math.PI*2/5,r=180+skill.tier*180;
  const bend=Math.sin(skill.tier*1.8+skill.ray*.8)*32;
  return {x:800+Math.cos(angle)*r-Math.sin(angle)*bend,y:800+Math.sin(angle)*r+Math.cos(angle)*bend};
}
function curve(a,b,ray,tier){
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length,bend=(tier%2?-1:1)*(40+ray*4);
  return t=>{const u=1-t;return {x:u*u*u*a.x+3*u*u*t*(a.x+dx*.28+nx*bend)+3*u*t*t*(a.x+dx*.72-nx*bend*.45)+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*(a.y+dy*.28+ny*bend)+3*u*t*t*(a.y+dy*.72-ny*bend*.45)+t*t*t*b.y};};
}
const icons=[['0011100','0111110','1111111','1111111','0111110','0011100','0001000'],['0001000','0011100','0111110','1111111','0111110','0011100','0001000'],['0000100','0001100','0011100','0111110','1111100','0111000','0010000'],['1000001','1100011','0111110','0011100','0111110','1100011','1000001'],['0001000','0011100','0111110','0001000','0001000','0001000','0001000']];
export class PixelSkillArt {
  constructor(map,isOpen){
    this.canvas=document.createElement('canvas');this.canvas.className='pixel-skill-canvas';this.canvas.width=this.canvas.height=640;this.canvas.setAttribute('aria-hidden','true');map.prepend(this.canvas);this.ctx=this.canvas.getContext('2d');this.isOpen=isOpen;this.nodes=new Map();this.time=0;this.frame=null;
  }
  sync(states){
    for(const state of states){
      const old=this.nodes.get(state.id);
      const appearing=!old||old.status==='hidden'||(old.status==='preview'&&state.status!=='preview');
      this.nodes.set(state.id,{...state,
        born:appearing?this.time+(old?.status==='preview' ? .12 : 0):(old?.born??this.time),
        purchased:old&&old.status!=='owned'&&state.status==='owned'?this.time:(old?.purchased??-10)});
    }
    this.draw();
  }
  start(){if(this.frame!==null)return;const clock=new FrameClock(.05);const tick=now=>{if(!this.isOpen()){this.frame=null;return;}this.time+=clock.step(now);this.draw();this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);}
  stop(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
  diamond(x,y,r,fill,stroke,width=2){const c=this.ctx;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  path(sample,progress,stroke,width,dashed=false){const c=this.ctx;c.beginPath();for(let i=0;i<=50;i++){const p=sample(progress*i/50);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.strokeStyle=stroke;c.lineWidth=width;c.lineCap='square';c.setLineDash(dashed?[5,10]:[]);c.stroke();c.setLineDash([]);}
  draw(){
    const c=this.ctx;c.setTransform(.4,0,0,.4,0,0);c.clearRect(0,0,1600,1600);
    for(const skill of SKILLS){
      const node=this.nodes.get(skill.id);if(!node||node.status==='hidden')continue;
      const to=skillPosition(skill),parent=skill.requires?skillPosition(SKILLS.find(s=>s.id===skill.requires)):{x:800,y:800};
      const sample=curve(parent,to,skill.ray,skill.tier),age=Math.max(0,this.time-node.born),progress=Math.min(1,age/.65);
      if(node.status==='preview'){this.path(sample,progress,'#84765b',3,true);continue;}
      this.path(sample,progress,'#251b19',12);this.path(sample,progress,node.status==='owned'?'#c3914e':'#776546',7);this.path(sample,progress,node.status==='owned'?'#ffe4a0':'#b49a68',2);
      // Small curved tongues of sunlight decorate the bends, without foliage.
      for(const t of [.37,.67]){
        if(progress<t)continue;const p=sample(t),q=sample(t+.03),angle=Math.atan2(q.y-p.y,q.x-p.x),sign=t<.5?1:-1;
        c.save();c.translate(p.x,p.y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(13,-sign*22,28,-sign*18,22,-sign*5);c.bezierCurveTo(18,sign*4,12,-sign*3,16,-sign*6);c.strokeStyle=node.status==='owned'?'#e8bb74':'#8b7754';c.lineWidth=3;c.stroke();c.restore();
      }
      if(node.status==='owned'&&progress===1){const p=sample((this.time*.28+skill.ray*.2)%1);this.diamond(p.x,p.y,4,'#fff1ba');}
    }
    this.drawSun();
    for(const skill of SKILLS){const node=this.nodes.get(skill.id);if(!node||node.status==='hidden')continue;this.drawNode(skill,node);}
  }
  drawSun(){
    const c=this.ctx;c.save();c.translate(800,800);
    for(let i=0;i<12;i++){const angle=i*Math.PI/6; c.save();c.rotate(angle);c.beginPath();c.moveTo(37,0);c.bezierCurveTo(55,-9,75,12,62,21);c.strokeStyle=i%2?'#c18a49':'#edc885';c.lineWidth=5;c.stroke();c.restore();}
    this.diamond(0,0,43,'#3d2b20','#98683d',4);this.diamond(-1,-2,34,'#c69b5b','#ffe7a5',3);
    c.fillStyle='#fff3bd';c.fillRect(-9,-17,16,24);c.fillRect(-17,-9,32,9);c.fillStyle='#ffe3a0';c.fillRect(-5,8,10,6);c.restore();
  }
  drawNode(skill,node){
    const p=skillPosition(skill),c=this.ctx,age=Math.max(0,this.time-node.born),birth=Math.max(0,Math.min(1,(age-.42)/.35));
    if(birth<=0)return;
    c.save();c.translate(p.x,p.y);const pop=birth<1?1+Math.sin(birth*Math.PI)*.1:1;c.scale(pop,pop);c.globalAlpha=birth;
    if(node.status==='preview'){
      this.diamond(2,4,20,'#141a1e','#0e1418',3);
      this.diamond(0,0,18.4,'#35302a','#000000',3);
      c.fillStyle='#f5dfac';
      ['111','001','010','000','010'].forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==='1')c.fillRect((x-1)*4-2,(y-2)*4-2,4,4);}));
      c.restore();return;
    }
    const owned=node.status==='owned',ready=node.status==='ready',flash=Math.max(0,1-(this.time-node.purchased)/.55);
    const body=owned?'#8a713e':ready?'#453f2e':'#242729',rim=owned?'#f4cf80':node.unaffordable?'#e85b55':ready?'#c3a76b':'#625b4d';
    this.diamond(3,5,47,'#12181b','#0b1115',5);this.diamond(0,0,46,body,'#4d3827',5);this.diamond(0,0,41,body,rim,3);this.diamond(0,0,35,owned?'#ae9257':ready?'#5b5136':'#303234',owned?'#f8e0a0':'#8b774e',2);
    if(!owned&&node.unaffordable){c.save();c.shadowColor='#e85b5540';c.shadowBlur=4;this.diamond(0,0,41,'#00000000','#e85b5580',2);c.restore();}
    if(owned){c.save();c.shadowColor='#ffecac';c.shadowBlur=6;this.diamond(0,0,43,'#00000000','#ffedb499',2);c.restore();}
    if(node.selected)this.diamond(0,0,50,'#00000000','#fff0b5',2);
    const glyph=icons[(skill.ray+skill.tier)%icons.length],pixel=4;
    glyph.forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==='1'){c.fillStyle='#211e19';c.fillRect((x-3)*pixel+2,(y-3)*pixel+3,pixel,pixel);c.fillStyle=owned?'#fff3bc':ready?'#e8c889':'#87816b';c.fillRect((x-3)*pixel,(y-3)*pixel,pixel,pixel);}}));
    if(flash>0){this.diamond(0,0,36,`rgba(255,246,190,${flash*.9})`);c.globalAlpha*=flash;for(let i=0;i<12;i++){const a=i*Math.PI/6,r=48+(1-flash)*48;this.diamond(Math.cos(a)*r,Math.sin(a)*r,2+flash*3,i%3?'#fff1b7':'#f6b56f');}}
    c.restore();
  }
}
