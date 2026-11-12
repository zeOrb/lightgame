import {FLOOR_COUNT,END,route} from './game.js';
export const ARENA_RADIUS=5.6;
export function arenaLayout(){return Array.from({length:FLOOR_COUNT},(_,index)=>{
  const plank=13+index*14,p=route(plank);
  return {index,plank,s:plank-.35,exitS:Math.min(END,plank+.8),y:p.y,theta:p.theta,cleared:false};
});}
export function clampArena(point,radius=ARENA_RADIUS-.45){
  const length=Math.hypot(point.x,point.z);
  if(length>radius){point.x*=radius/length;point.z*=radius/length;}
  return point;
}
export function arenaInput(keys,forward){
  const h=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const v=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const fl=Math.hypot(forward.x,forward.z)||1,fx=forward.x/fl,fz=forward.z/fl,length=Math.hypot(h,v)||1;
  return {x:(-fz*h+fx*v)/length,z:(fx*h+fz*v)/length};
}
export class ArenaRun {
  constructor(){this.arenas=arenaLayout();this.reset();}
  reset(){for(const arena of this.arenas)arena.cleared=false;this.active=null;this.player={x:0,y:0,z:0};}
  enter(from,to,position){
    if(this.active||to<from)return null;
    const arena=this.arenas.find(a=>!a.cleared&&from<=a.s&&to>=a.s);if(!arena)return null;
    this.active=arena;arena.stage='entering';arena.age=0;arena.from={...position};
    this.player={...position};arena.living=3;return arena;
  }
  transition(dt){
    const a=this.active;if(!a||!['entering','exiting'].includes(a.stage))return null;
    a.age=Math.min(1,a.age+dt/1.05);const t=a.age,e=t*t*(3-2*t);
    const dest=a.stage==='entering'?{x:Math.cos(a.theta)*(ARENA_RADIUS-1),y:a.y,z:Math.sin(a.theta)*(ARENA_RADIUS-1)}:route(a.exitS);
    for(const axis of ['x','y','z'])this.player[axis]=a.from[axis]+(dest[axis]-a.from[axis])*e;
    if(t===1){if(a.stage==='entering')a.stage='fighting';else{this.active=null;return a.exitS;}}
    return null;
  }
  move(dx,dz){this.player.x+=dx;this.player.z+=dz;clampArena(this.player);}
  clear(){const a=this.active;if(!a||a.stage!=='fighting')return false;a.cleared=true;a.stage='cleared';a.age=0;return true;}
  tryExit(){
    const a=this.active;if(!a||a.stage!=='cleared')return false;
    const p=route(a.exitS),length=Math.hypot(p.x,p.z),x=p.x/length*(ARENA_RADIUS-1),z=p.z/length*(ARENA_RADIUS-1);
    if(Math.hypot(this.player.x-x,this.player.z-z)>1)return false;
    a.stage='exiting';a.age=0;a.from={...this.player};return true;
  }
}
