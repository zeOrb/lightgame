import { GAP_HALF_WIDTH, ROUTE_ANGLE, SHELF_HALF_ANGLE, SHELF_OUTER_RADIUS, shelfInnerRadius, clamp } from './game.js';

export const ThreatType=Object.freeze({HOLE:'hole',MOVING_PLATFORM:'moving-platform'});
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
  return threats;
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
    if(threat.type!==ThreatType.MOVING_PLATFORM)continue;
    Object.assign(threat,motion);
    if(threat.group){const angle=threat.s*ROUTE_ANGLE;threat.group.position.x=Math.cos(angle)*motion.offset;threat.group.position.z=Math.sin(angle)*motion.offset;}
    if(threat.indicator){threat.indicator.visible=motion.warning||motion.moving;threat.indicator.material.opacity=.35+.3*(.5+.5*Math.sin(time*15));}
    if(!motion.warning)threat.notified=false;
  }
}
