import * as THREE from 'three';
import {route,END,isGap} from './game.js';
export function bounceVelocity(held,jumpScale=1){return (held?11.6:7)*jumpScale;}
export class Springboards {
  constructor(scene,threats){
    this.items=[];
    const bronze=new THREE.MeshStandardMaterial({color:'#71614b',roughness:.9});
    const light=new THREE.MeshBasicMaterial({color:'#d8f5ee',fog:false,toneMapped:false});
    for(let target=7;target<END-3;target+=28){
      const s=[target,target+1,target-1].find(n=>!isGap(n)&&n%14<11&&threats.every(t=>Math.abs(t.s-n)>1.8));
      if(s===undefined)continue;
      const p=route(s),group=new THREE.Group();group.position.set(p.x,p.y+.025,p.z);scene.add(group);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.46,.045,5,24),bronze);ring.rotation.x=-Math.PI/2;group.add(ring);
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.065,12),light);group.add(pad);
      const rune=new THREE.Mesh(new THREE.TorusGeometry(.20,.022,4,4),bronze);rune.rotation.x=-Math.PI/2;rune.position.y=.045;group.add(rune);
      this.items.push({s,p,group,pad,rune,cooldown:0,pulse:0});
    }
  }
  reset(){for(const item of this.items){item.cooldown=0;item.pulse=0;}}
  update(dt,time){for(const item of this.items){item.cooldown=Math.max(0,item.cooldown-dt);item.pulse=Math.max(0,item.pulse-dt);item.pad.scale.y=1-item.pulse*1.2;item.rune.position.y=.045+Math.sin(time*2+item.s)*.012;}}
  contact(s,lane,height,velocity){
    if(height>.08||velocity>0)return null;
    const p=route(s,lane);
    for(const item of this.items)if(item.cooldown<=0&&Math.hypot(p.x-item.p.x,p.z-item.p.z)<.55&&Math.abs(p.y-item.p.y)<.25){item.cooldown=.5;item.pulse=.32;return item;}
    return null;
  }
}
