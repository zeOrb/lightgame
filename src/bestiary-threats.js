import * as THREE from 'three';
import settings from './threat-settings.json' with {type:'json'};
import {ThreatType,ThreatInfo,threatState,platformMotion} from './threats.js';
import {ThreatVisuals} from './threat-visuals.js';

export const BESTIARY_THREATS=[
  {id:'hole',name:'Missing step',description:'A gap in the staircase. Falling into it ends the run.'},
  {id:'moving-platform',name:'Moving step',description:'Slides inward and returns. Carries the player standing on it.'},
  ...Object.entries(ThreatInfo).map(([id,info])=>({id,name:info.name,description:info.hint})),
  {id:'shadow',name:'Shadow patch',description:'Drains Light and breaks the combo on contact.'},
  {id:'book',name:'Falling book',description:'Falls after a warning. Contact drains Light.'},
  {id:'bottle',name:'Potion trap',description:'Reverses controls or slows movement for a short time.'}
];

export function createThreatExhibit(definition){
  const group=new THREE.Group();
  const body=new THREE.MeshStandardMaterial({color:'#797265',roughness:.8});
  const glow=new THREE.MeshBasicMaterial({color:'#b99ae8',transparent:true,opacity:.5,depthWrite:false});
  const add=(geometry,material,x=0,y=0,z=0)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;
  };
  const threat={type:definition.id,s:0,lane:0,phase:0};
  let visuals=null,model=null;
  if(ThreatInfo[definition.id]){
    visuals=new ThreatVisuals(group,[threat]);
    visuals.items[0].group.position.set(0,0,0);
    visuals.items[0].group.rotation.set(0,0,0);
    group.scale.setScalar(.72);
  }else if(definition.id==='moving-platform'){
    model=add(new THREE.BoxGeometry(2.3,.22,1.8),body,0,.12);
  }else if(definition.id==='hole'||definition.id==='shadow'){
    model=add(new THREE.CircleGeometry(definition.id==='hole'?.85:1.15,48),new THREE.MeshBasicMaterial({color:'#07050d',transparent:true,opacity:.95}),0,.02);
    model.rotation.x=-Math.PI/2;
    if(definition.id==='hole'){
      const rim=add(new THREE.TorusGeometry(.9,.12,6,32),body,0,.03);rim.rotation.x=-Math.PI/2;
    }
  }else if(definition.id==='book'){
    model=add(new THREE.BoxGeometry(1.9,.35,1.25),new THREE.MeshStandardMaterial({color:'#79597c'}),0,2.5);
  }else{
    const glass=new THREE.MeshStandardMaterial({color:'#a39ae4',transparent:true,opacity:.7,metalness:.2,roughness:.15,emissive:'#55477c',emissiveIntensity:.5});
    add(new THREE.SphereGeometry(.45,12,10),glass,0,.55);
    add(new THREE.CylinderGeometry(.13,.18,.48,8),glass,0,1.03);
    add(new THREE.CylinderGeometry(.16,.16,.13,8),body,0,1.3);
  }
  const pulse=add(new THREE.RingGeometry(.85,1,48),glow,0,.04);
  pulse.rotation.x=-Math.PI/2;pulse.visible=false;
  let age=Infinity;
  const vine=settings.types[definition.id];
  const duration=vine?.extensionDuration!==undefined
    ? vine.warningDuration+vine.extensionDuration+vine.activeDuration+vine.retractionDuration
    : 5;
  const update=dt=>{
    age+=dt;
    const playing=age<duration,t=playing?age:0;
    pulse.visible=playing;
    pulse.scale.setScalar(1+t*.4);
    glow.opacity=playing?Math.max(0,.6*(1-t/duration)):0;
    if(visuals){
      const clock=playing?t+(definition.id===ThreatType.INK_WAVE?2.5:0):0;
      Object.assign(threat,threatState(threat,clock));visuals.update(clock);
    }
    if(definition.id==='moving-platform')model.position.x=playing?platformMotion(5+t,0).offset*.55:0;
    if(definition.id==='book'){
      model.position.y=playing?Math.max(.2,2.5-Math.max(0,t-.6)**2*8):2.5;
      model.rotation.z=playing?Math.min(t,.95)*.35:0;
    }
    if(definition.id==='shadow')model.scale.setScalar(playing?1+Math.sin(t*6)*.12:1);
  };
  update(0);
  return {group,trigger(){age=0;update(0);},update};
}
