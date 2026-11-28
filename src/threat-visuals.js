import * as THREE from 'three';
import { route } from './game.js';
import { ThreatType,ThreatInfo } from './threats.js';
import {createThornVines} from './thorn-vines.js';
import { applyTowerDepth } from './tower-depth.js';

const metal=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#252234',metalness:.7,roughness:.42}));
const brass=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#9b8866',metalness:.7,roughness:.5}));
const glass=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#a8bce5',emissive:'#55487b',emissiveIntensity:.45,metalness:.35,roughness:.2}));
const glow=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending});
function mesh(parent,geometry,material,x=0,y=0,z=0){const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);parent.add(object);return object;}
function ring(parent,radius,material,y=.035){const object=mesh(parent,new THREE.TorusGeometry(radius,.035,4,48),material,0,y,0);object.rotation.x=-Math.PI/2;return object;}

export class ThreatVisuals {
  constructor(scene,threats){
    this.items=[];
    for(const threat of threats){
      if(!ThreatInfo[threat.type])continue;
      const group=new THREE.Group(),p=route(threat.s);group.position.set(p.x,p.y,p.z);group.rotation.y=-p.theta;scene.add(group);
      const item={threat,group,light:glow(threat.type===ThreatType.PENDULUM?'#e86575':threat.type===ThreatType.INK_WAVE?'#b185ff':'#f09bcd')};
      if(threat.type===ThreatType.PENDULUM){
        item.pivot=new THREE.Group();item.pivot.position.y=3;group.add(item.pivot);
        mesh(item.pivot,new THREE.CylinderGeometry(.035,.035,2.4,5),brass,0,-1.2);
        const bell=new THREE.Group();bell.position.y=-2.4;item.pivot.add(bell);
        mesh(bell,new THREE.CylinderGeometry(.21,.5,.6,10,1,true),metal);
        const lip=mesh(bell,new THREE.TorusGeometry(.48,.07,5,16),brass,0,-.3);lip.rotation.x=Math.PI/2;
        mesh(bell,new THREE.OctahedronGeometry(.17),item.light,0,-.22);
        mesh(item.pivot,new THREE.OctahedronGeometry(.16),brass);
        item.mark=ring(group,.62,item.light);
      }else if(threat.type===ThreatType.INK_WAVE){
        mesh(group,new THREE.CylinderGeometry(.3,.4,.19,8),metal,0,.08);
        mesh(group,new THREE.OctahedronGeometry(.17),item.light,0,.3);
        item.mark=ring(group,.52,item.light);
        item.wave=ring(group,1,item.light.clone(),.075);
        item.halo=ring(group,1,item.light.clone(),.15);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;const shard=mesh(group,new THREE.OctahedronGeometry(.08),glass,Math.cos(a)*.55,.12,Math.sin(a)*.55);shard.rotation.z=a;}
      }else{
        item.vines=createThornVines(threat.s,threat.type===ThreatType.VINE_TRAP);
        group.add(item.vines.mesh);
      }
      this.items.push(item);
    }
  }
  update(time){
    for(const item of this.items){
      const {threat,light,mark}=item;
      if(item.vines){
        item.vines.growth.value=.12+.88*threat.rise;
        item.vines.updateShadow(time,threat.growthSmoke);
        item.vines.mesh.material.emissive.setHex(0x687a17);
        item.vines.mesh.material.emissiveIntensity=threat.warning?.42+.32*Math.sin(time*17):.08;
        continue;
      }
      light.opacity=threat.warning ? .65+.3*Math.sin(time*17) : threat.active ? .8 : .22;
      mark.rotation.z=time*.3;
      if(threat.type===ThreatType.PENDULUM){item.pivot.rotation.z=threat.swing;mark.position.x=threat.bobX;mark.scale.setScalar(threat.warning?1.1:.8);}
      else if(threat.type===ThreatType.INK_WAVE){
        for(const [i,wave] of [item.wave,item.halo].entries()){
          wave.visible=threat.active;wave.scale.setScalar(Math.max(.01,threat.radius-i*.13));
          wave.material.opacity=Math.max(0,1-threat.radius/3.3)*(i?.35:.95);
        }
        mark.scale.setScalar(threat.warning?1+.13*Math.sin(time*14):1);
      }
    }
  }
}
