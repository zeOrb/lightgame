import {createPixelSun,SUN_SPRITE_GRID,SUN_PIXEL} from './pixel-sun.js';
import {skillIcon} from './skill-icons.js';
import {SKILLS,ROOT_SKILL,SKILL_BRANCH_COUNT,SKILL_MAP_SIZE} from './progression.js';
import {FrameClock} from './frame-clock.js';
import {visualSample} from './visual-random.js';
import gemsConfig from './collectibles.json' with {type:'json'};
// U wraps once around the four edges; this keeps the shine attached to the rim.
const SOLID_UNAFFORDABLE_BRANCH=true;
export function diamondUV(u,radius){
  const phase=((u%1)+1)%1*4,side=Math.floor(phase),t=phase-side;
  const corners=[[0,-radius],[radius,0],[0,radius],[-radius,0]],a=corners[side],b=corners[(side+1)%4];
  return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t};
}
export function skillPosition(skill){
  if(skill.isRoot)return {x:SKILL_MAP_SIZE/2,y:SKILL_MAP_SIZE/2};
  const branches=skill.branchCount??SKILL_BRANCH_COUNT;
  const angle=-Math.PI/2+Math.PI/branches+skill.ray*Math.PI*2/branches+(skill.layout?.angleOffset??0),r=200+skill.tier*170;
  const bend=Math.sin(skill.tier*1.8+skill.ray*.8)*32;
  const center=SKILL_MAP_SIZE/2;
  return {x:center+Math.cos(angle)*r-Math.sin(angle)*bend,y:center+Math.sin(angle)*r+Math.cos(angle)*bend};
}
function curve(a,b,ray,tier,central=false){
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length,bend=(tier%2?-1:1)*(central?6:40+ray*4);
  return t=>{const u=1-t;return {x:u*u*u*a.x+3*u*u*t*(a.x+dx*.28+nx*bend)+3*u*t*t*(a.x+dx*.72-nx*bend*.45)+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*(a.y+dy*.28+ny*bend)+3*u*t*t*(a.y+dy*.72-ny*bend*.45)+t*t*t*b.y};};
}
export class PixelSkillArt {
  constructor(map,isOpen){
    this.canvas=document.createElement('canvas');this.canvas.className='pixel-skill-canvas';this.canvas.width=this.canvas.height=Math.round(SKILL_MAP_SIZE*.4);this.canvas.style.width=this.canvas.style.height=SKILL_MAP_SIZE+'px';this.canvas.setAttribute('aria-hidden','true');map.prepend(this.canvas);this.ctx=this.canvas.getContext('2d');this.isOpen=isOpen;this.nodes=new Map();this.clicks=new Map();this.time=0;this.frame=null;
  }
  pulse(id){this.clicks.set(id,this.time);}
  clickScale(id){const start=this.clicks.get(id);if(start===undefined)return 1;const t=(this.time-start)/.42;if(t>=1){this.clicks.delete(id);return 1;}return 1+.1*Math.sin(Math.PI*Math.max(0,t))**2;}
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
  start(){if(this.frame!==null)return;const clock=new FrameClock(.05);const tick=now=>{if(!this.isOpen()){this.frame=null;return;}const dt=clock.step(now);this.time+=dt;this.onFrame?.(dt);this.draw();this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);}
  stop(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
  diamond(x,y,r,fill,stroke,width=2){const c=this.ctx;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  path(sample,progress,stroke,width,dashed=false){const c=this.ctx;c.beginPath();for(let i=0;i<=50;i++){const p=sample(progress*i/50);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.strokeStyle=stroke;c.lineWidth=width;c.lineCap='square';c.setLineDash(dashed?[5,10]:[]);c.stroke();c.setLineDash([]);}
  draw(){
    const c=this.ctx,scale=this.canvas.width/SKILL_MAP_SIZE;c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,SKILL_MAP_SIZE,SKILL_MAP_SIZE);
    for(const skill of SKILLS){
      const node=this.nodes.get(skill.id);if(skill.isRoot||!node||node.status==='hidden')continue;
      const to=skillPosition(skill),parent=skill.requires?skillPosition(SKILLS.find(s=>s.id===skill.requires)):{x:SKILL_MAP_SIZE/2,y:SKILL_MAP_SIZE/2};
      const sample=curve(parent,to,skill.ray,skill.tier,skill.requires==='treasurySource'),age=Math.max(0,this.time-node.born),progress=Math.min(1,age/.65);
      if(node.status==='preview'){this.path(sample,progress,'#84765b',3,true);continue;}
      const unaffordable=node.status!=='owned'&&node.unaffordable;
      const branchGradient=(start,end)=>{const gradient=c.createLinearGradient(parent.x,parent.y,to.x,to.y);gradient.addColorStop(0,start);gradient.addColorStop(.22,start);gradient.addColorStop(1,end);return gradient;};
      const lockedRed='#a95751';
      const redFade=(colour,faded)=>{const gradient=c.createLinearGradient(parent.x,parent.y,to.x,to.y);gradient.addColorStop(0,colour);gradient.addColorStop(.60,colour);gradient.addColorStop(.82,faded);gradient.addColorStop(1,faded);return gradient;};
      const branchRim=unaffordable?(SOLID_UNAFFORDABLE_BRANCH?redFade('#51292b','#111116'):branchGradient('#776546',lockedRed)):node.status==='owned'?'#c3914e':'#776546';
      const branchLight=unaffordable?(SOLID_UNAFFORDABLE_BRANCH?redFade(lockedRed,'#191216'):branchGradient('#b49a68',lockedRed)):node.status==='owned'?'#ffe4a0':'#b49a68';
      this.path(sample,progress,'#251b19',12);this.path(sample,progress,branchRim,7);this.path(sample,progress,branchLight,2);
      // Small curved tongues of sunlight decorate the bends, without foliage.
      for(const t of [.37,.67]){
        if(progress<t)continue;const p=sample(t),q=sample(t+.03),angle=Math.atan2(q.y-p.y,q.x-p.x),sign=t<.5?1:-1;
        const blend=Math.max(0,Math.min(1,(t-.22)/.78));
        const curlTint=SOLID_UNAFFORDABLE_BRANCH?lockedRed:`rgb(${[180,154,104].map((v,i)=>Math.round(v+([169,87,81][i]-v)*blend)).join(',')})`;
        c.save();c.translate(p.x,p.y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(13,-sign*22,28,-sign*18,22,-sign*5);c.bezierCurveTo(18,sign*4,12,-sign*3,16,-sign*6);
        if(unaffordable&&t>.5){
          const dx=to.x-p.x,dy=to.y-p.y;
          const gradient=c.createLinearGradient(0,0,dx*Math.cos(angle)+dy*Math.sin(angle),-dx*Math.sin(angle)+dy*Math.cos(angle));
          gradient.addColorStop(0,curlTint);gradient.addColorStop(.33,'#191216');gradient.addColorStop(1,'#191216');c.strokeStyle=gradient;
        }else c.strokeStyle=unaffordable?curlTint:node.status==='owned'?'#e8bb74':'#8b7754';
        c.lineWidth=3;c.stroke();c.restore();
      }
      if(node.status==='owned'&&progress===1){const p=sample((this.time*.28+skill.ray*.2)%1);this.diamond(p.x,p.y,4,'#fff1ba');}
    }
    this.drawSun();
    for(const skill of SKILLS){const node=this.nodes.get(skill.id);if(!node||node.status==='hidden')continue;this.drawNode(skill,node);}
  }
  drawSun(){
    if(this.rootId==='treasurySource'){this.drawTreasury();return;}
    // Rotate on the pixel grid, keeping the central diamond upright. Cached
    // frames avoid blurring a rotated bitmap and doing repeated raster work.
    this.sunFrames??=new Map();
    const rootState=this.nodes.get(this.rootId??ROOT_SKILL?.id),unlocked=rootState?.status==='owned';
    const frame=unlocked?Math.floor(this.time*.32/(Math.PI*2)*360)%360:0;
    if(unlocked&&!this.sunFrames.has(frame))this.sunFrames.set(frame,createPixelSun(frame/360*Math.PI*2));
    const c=this.ctx,center=SKILL_MAP_SIZE/2,root=this.nodes.get(this.rootId??ROOT_SKILL?.id),owned=root?.status==='owned';
    const age=root?this.time-root.purchased:10;
    const size=SUN_SPRITE_GRID*SUN_PIXEL*this.clickScale(this.rootId??ROOT_SKILL?.id);
    this.dormantSun??=createPixelSun(0,true);
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(owned?this.sunFrames.get(frame):this.dormantSun,center-size/2,center-size/2,size,size);
    if(root?.selected)this.diamond(center,center,size*.23,'#00000000',owned?'#fff0bc':'#c79986',2);
    if(owned&&age>=0&&age<1.1){
      const t=age/1.1,r=30+t*460;c.globalAlpha=(1-t)**.7;
      for(let i=0;i<112;i++){
        const a=i/112*Math.PI*2,x=Math.round((center+Math.cos(a)*r)/5)*5,y=Math.round((center+Math.sin(a)*r)/5)*5;
        c.fillStyle=i%4?'#ffd978':'#fff5c7';c.fillRect(x-5,y-5,10,10);
        if(i%4===0){const sr=r+18+t*30;c.fillRect(Math.round((center+Math.cos(a)*sr)/5)*5,Math.round((center+Math.sin(a)*sr)/5)*5,5,5);}
      }
    }
    c.restore();
  }
  drawTreasury(){
    const node=this.nodes.get('treasurySource');if(!node||node.status==='hidden')return;
    const c=this.ctx,owned=node.status==='owned',center=SKILL_MAP_SIZE/2;
    c.save();c.translate(center,center);const scale=this.clickScale('treasurySource');c.scale(scale,scale);
    const gemArt=['0LLL0','LWWWL','LCCDL','0CDD0','00D00'];
    const scatter=[[-62,-18],[-27,-67],[43,-54],[56,34],[-43,47]];
    scatter.forEach(([x,y],i)=>{
      const phase=visualSample('treasury-gem',i),motion=owned?Math.sin(this.time*.9+phase*6.28):0;
      const length=Math.hypot(x,y),drift=motion*(4+phase*4),px=Math.round((x+x/length*drift)/4)*4,py=Math.round((y+y/length*drift)/4)*4;
      const pixels=[5,4.5,5.5,4.5,5][i];
      const gem=gemsConfig.variants[i],base=owned?gem.color:'#85463e';
      const colours={L:owned?gem.textColor:'#665147',W:owned?'#fff3e4':'#b6967d',C:base,D:owned?gem.color:'#362d2a'};
      c.save();c.translate(px,py);c.globalAlpha=owned?.75+.25*Math.sin(this.time*1.4+phase*6.28)**2:.8;
      c.shadowColor=owned?gem.textColor:'#96604f33';c.shadowBlur=owned?13:4;
      gemArt.forEach((row,gy)=>[...row].forEach((bit,gx)=>{if(!colours[bit])return;c.fillStyle=colours[bit];c.fillRect((gx-2)*pixels,(gy-2)*pixels,pixels,pixels);}));
      c.restore();
    });
    if(owned){c.shadowColor='#ffe4a044';c.shadowBlur=10;}
    const art=[
      '00000000000000000',
      '000GGGGGGGGGGG000',
      '00GBBBBBBBBBBBG00',
      '0GBBGGBBBBBGGBBG0',
      '0GBBGGBBBBBGGBBG0',
      '0GGGGGGGGGGGGGGG0',
      '00DDDDDDDDDDDDD00',
      '00WWWWWWWWWWWWW00',
      '0GGGGGGGGGGGGGGG0',
      '0GBBGGBBBBBGGBBG0',
      '0GBBGGBGGGBGGBBG0',
      '0GBBGGBGWWBGGBBG0',
      '0GBBGGBGDDBGGBBG0',
      '0GBBGGBGGGBGGBBG0',
      '0GBBGGBBBBBGGBBG0',
      '0GGGGGGGGGGGGGGG0',
      '00GG000000000GG00'
    ];
    const palette=owned?{G:'#ddba70',B:'#805c35',W:'#fff6d4',D:'#302519'}:{G:'#90483e',B:'#382022',W:'#c17b5b',D:'#211317'};
    // Cover the branches with an opaque chest silhouette before painting its
    // small pixels. Overlap rows slightly so downsampling cannot reveal lines.
    c.shadowBlur=0;c.fillStyle=owned?'#302519':'#211317';
    art.forEach((row,y)=>{const first=[...row].findIndex(bit=>bit!=='0'),last=row.length-1-[...row].reverse().findIndex(bit=>bit!=='0');if(first<0)return;c.fillRect((first-8)*4-.5,(y-8)*4-.5,(last-first+1)*4+1,5);});
    for(let y=0;y<art.length;y++)for(let x=0;x<art[y].length;x++){const col=palette[art[y][x]];if(!col)continue;c.fillStyle='#0e0d0b';c.fillRect((x-8)*4+2,(y-8)*4+2,4,4);c.fillStyle=col;c.fillRect((x-8)*4,(y-8)*4,4,4);}c.shadowBlur=0;
    if(owned){const blink=.5+.5*Math.sin(this.time*2.2);c.globalAlpha=.4+blink*.6;this.diamond(27,-24,3,'#fff3be');this.diamond(-24,13,2,'#fff3be');}
    c.restore();
  }
  drawNode(skill,node){
    if(skill.isRoot)return;
    const p=skillPosition(skill),c=this.ctx,age=Math.max(0,this.time-node.born),birth=Math.max(0,Math.min(1,(age-.42)/.35));
    if(birth<=0)return;
    c.save();c.translate(p.x,p.y);const pop=birth<1?1+Math.sin(birth*Math.PI)*.1:1;const click=this.clickScale(skill.id);c.scale(pop*click,pop*click);c.globalAlpha=birth;
    if(node.status==='preview'){
      this.diamond(2,4,20,'#141a1e','#0e1418',3);
      this.diamond(0,0,18.4,'#35302a','#000000',3);
      c.fillStyle='#f5dfac';
      ['111','001','010','000','010'].forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==='1')c.fillRect((x-1)*4-2,(y-2)*4-2,4,4);}));
      c.restore();return;
    }
    const owned=node.status==='owned',ready=node.status==='ready',flash=Math.max(0,1-(this.time-node.purchased)/.55);
    const seed=visualSample('skill-ready-border:'+skill.id,0);
    const pulse=Math.pow(.5+.5*Math.sin(this.time*(.58+seed*.24)+seed*Math.PI*2),2.5);
    const tint=(a,b)=>`rgb(${a.map((value,i)=>Math.round(value+(b[i]-value)*pulse)).join(',')})`;
    const readyRim=tint([58,61,64],[255,226,127]),readyOuter=tint([40,43,46],[248,202,86]);
    const body=owned?'#8a713e':ready?'#322e24':'#242729',rim=owned?'#f4cf80':node.unaffordable?'#a95751':ready?readyRim:'#625b4d';
    if(owned){c.save();c.shadowColor='#ffcc7099';c.shadowBlur=14;this.diamond(0,0,47,'#00000000','#efbe6555',8);c.restore();}
    this.diamond(3,5,47,'#12181b','#0b1115',5);this.diamond(0,0,46,body,owned?'#ffd34f':ready?readyOuter:'#4d3827',ready?3:5);this.diamond(0,0,41,body,rim,ready?1.5:3);this.diamond(0,0,35,owned?'#ae9257':ready?'#403927':'#303234',owned?'#f8e0a0':ready?readyRim:'#8b774e',ready?1:2);
    if(!owned&&node.unaffordable){c.save();c.shadowColor='#a9575140';c.shadowBlur=4;this.diamond(0,0,41,'#00000000','#a9575180',2);c.restore();}
    if(owned){c.save();c.shadowColor='#ffecac';c.shadowBlur=6;this.diamond(0,0,43,'#00000000','#ffedb499',2);c.restore();}
    if(owned)this.drawGoldShine(skill);
    if(node.selected)this.diamond(0,0,50,'#00000000','#fff0b5',2);
    const glyph=skillIcon(skill.icon),pixel=2.5,center=(glyph.length-1)/2;
    glyph.forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==='1'){c.fillStyle='#211e19';c.fillRect((x-center)*pixel+pixel,(y-center)*pixel+pixel,pixel,pixel);c.fillStyle=owned?'#fff3bc':ready?'#e8c889':'#87816b';c.fillRect((x-center)*pixel,(y-center)*pixel,pixel,pixel);}}));
    if(flash>0){this.diamond(0,0,36,`rgba(255,246,190,${flash*.9})`);c.globalAlpha*=flash;for(let i=0;i<12;i++){const a=i*Math.PI/6,r=48+(1-flash)*48;this.diamond(Math.cos(a)*r,Math.sin(a)*r,2+flash*3,i%3?'#fff1b7':'#f6b56f');}}
    c.restore();
  }
  drawGoldShine(skill){
    const c=this.ctx,head=this.time*.17+skill.ray*.19+skill.tier*.13,alpha=c.globalAlpha;
    c.save();c.shadowColor='#fff3b4';c.shadowBlur=5;c.lineCap='round';
    for(let i=0;i<28;i++){
      const t=(i+1)/28,u=head-.22+i*.22/28,a=diamondUV(u,46),b=diamondUV(u+.22/28,46);
      c.globalAlpha=alpha*t*t;c.lineWidth=2+t*3;c.strokeStyle=t>.82?'#fffde8':'#ffe580';
      c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    }
    const tip=diamondUV(head,46);c.globalAlpha=alpha;c.fillStyle='#fffde8';c.fillRect(tip.x-2,tip.y-2,4,4);
    c.restore();
  }
}
