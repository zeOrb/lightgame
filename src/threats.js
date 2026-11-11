import { GAP_HALF_WIDTH, ROUTE_ANGLE, SHELF_HALF_ANGLE, SHELF_OUTER_RADIUS, shelfInnerRadius, clamp } from './game.js';

export const ThreatType=Object.freeze({HOLE:'hole',MOVING_PLATFORM:'moving-platform',PENDULUM:'pendulum',INK_WAVE:'ink-wave',THORNS:'thorns'});
export const ThreatInfo=Object.freeze({
  [ThreatType.PENDULUM]:{name:'Колокол затмения',damage:10,hint:'Колокол затмения · обойди его с другой стороны полки.'},
  [ThreatType.INK_WAVE]:{name:'Чернильная волна',damage:8,hint:'Чернильная волна · перепрыгни расширяющееся кольцо.'},
  [ThreatType.THORNS]:{name:'Стеклянные шипы',damage:12,hint:'Стеклянные шипы · руны предупреждают о выдвижении. Обойди или прыгни.'},
});
export const PLATFORM_COOLDOWN=5;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

export function platformMotion(time){
  if(time<PLATFORM_COOLDOWN)return {offset:0,warning:time>=4.25,moving:false};
  const t=(time-PLATFORM_COOLDOWN)%PLATFORM_COOLDOWN;
  const amount=t<.45?ease(t/.45):t<.95?1:t<1.45?1-ease((t-.95)/.5):0;
  return {offset:amount>0?-2.1*amount:0,warning:t>=4.25,moving:amount>0};
}

export function createThreats(holes,end,reserved=new Set()){
  const threats=holes.map(s=>({type:ThreatType.HOLE,s}));
  for(let s=12;s<end-2;s+=18){
    if(reserved.has(s)||holes.some(h=>Math.abs(h-s)<3))continue;
    threats.push({type:ThreatType.MOVING_PLATFORM,s,offset:0,group:null,indicator:null,warning:false,notified:false});
  }
  const types=Object.keys(ThreatInfo);
  for(let target=25,index=0;target<end-4;target+=14,index++){
    const candidates=Array.from({length:13},(_,i)=>target+(i%2?1:-1)*Math.ceil(i/2));
    const s=candidates.find(s=>s>8&&s<end-3&&!reserved.has(s)&&threats.every(t=>Math.abs(t.s-s)>=3));
    if(s!==undefined)threats.push({type:types[index%types.length],s,lane:index%2?-.95:.95,phase:(s*.371)%2,lastHit:-Infinity,introduced:false});
  }
  updateThreats(threats,0);
  return threats;
}

export function threatState(threat,time){
  const clock=time+(threat.phase??0);
  if(threat.type===ThreatType.PENDULUM){
    const swing=Math.sin(clock*Math.PI*2/3.6)*.72;
    return {swing,bobX:Math.sin(swing)*2.4,bobY:3-Math.cos(swing)*2.4,active:true,warning:Math.abs(swing)<.27};
  }
  const cycle=clock%(threat.type===ThreatType.INK_WAVE?5.2:4.8);
  if(threat.type===ThreatType.INK_WAVE)return {warning:cycle>=2.5&&cycle<3.4,active:cycle>=3.4&&cycle<4.4,radius:clamp((cycle-3.4)/1,0,1)*3.1};
  if(threat.type===ThreatType.THORNS){
    const rise=cycle<2.8?0:cycle<3?ease((cycle-2.8)/.2):cycle<3.9?1:1-ease((cycle-3.9)/.35);
    return {warning:cycle>=2&&cycle<2.8,active:rise>.3,rise};
  }
  return {};
}
export function threatHits(threat,{s,lane,height}){
  if(!threat.active||!ThreatInfo[threat.type]||Math.abs(s-threat.s)>1.2)return false;
  const angle=(s-threat.s)*ROUTE_ANGLE,radius=12+lane;
  const x=Math.cos(angle)*radius-12,z=Math.sin(angle)*radius;
  const foot=height-(s-threat.s)*.5;
  if(threat.type===ThreatType.PENDULUM)return Math.hypot(x-threat.bobX,z)<.72&&Math.abs(foot+.45-threat.bobY)<.68;
  if(threat.type===ThreatType.INK_WAVE)return foot<.62&&Math.abs(Math.hypot(x,z)-threat.radius)<.24;
  return Math.abs(x-threat.lane)<.86&&Math.abs(z)<.86&&foot<.95;
}
export function consumeThreatHit(threats,player,time){
  for(const threat of threats)if(threatHits(threat,player)&&time-(threat.lastHit??-Infinity)>=1.15){threat.lastHit=time;return threat;}
  return null;
}
export function resetThreats(threats){
  for(const threat of threats){threat.lastHit=-Infinity;threat.introduced=false;threat.notified=false;}
  updateThreats(threats,0);
}

export function movingPlatformSupports(threat,s,lane){
  const angle=(s-threat.s)*ROUTE_ANGLE,radius=12+lane;
  const x=Math.cos(angle)*radius-threat.offset,z=Math.sin(angle)*radius;
  const r=Math.hypot(x,z);
  return r>=shelfInnerRadius(threat.s)&&r<=SHELF_OUTER_RADIUS&&Math.abs(Math.atan2(z,x))<=SHELF_HALF_ANGLE;
}

export function unsupportedThreat(threats,s,lane){
  for(const threat of threats){
    if(threat.type===ThreatType.HOLE&&Math.abs(s-threat.s)<GAP_HALF_WIDTH)return threat;
    if(threat.type===ThreatType.MOVING_PLATFORM&&Math.round(s)===threat.s&&!movingPlatformSupports(threat,s,lane))return threat;
  }
  return null;
}

export function updateThreats(threats,time){
  const motion=platformMotion(time);
  for(const threat of threats){
    if(threat.type!==ThreatType.MOVING_PLATFORM){Object.assign(threat,threatState(threat,time));continue;}
    Object.assign(threat,motion);
    if(threat.group){const angle=threat.s*ROUTE_ANGLE;threat.group.position.x=Math.cos(angle)*motion.offset;threat.group.position.z=Math.sin(angle)*motion.offset;}
    if(threat.indicator){threat.indicator.visible=motion.warning||motion.moving;threat.indicator.material.opacity=.35+.3*(.5+.5*Math.sin(time*15));}
    if(!motion.warning)threat.notified=false;
  }
}
