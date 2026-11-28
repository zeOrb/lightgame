import {OrbArrival} from './orb-arrival.js';
import * as THREE from 'three';
import {createVisualRandom} from './random-manager.js';
import {OrbTrail} from './orb-trail.js';
const random=createVisualRandom('pickup-orbs');
const COLLAPSE=.28,BURST=.56,CHARGE_MIN=.04,CHARGE_MAX=.24,ORB_SCALE=1.15,ORB_BRIGHTNESS=1.15;

export class PickupEffects {
  constructor(scene,glowTexture,target=()=>new THREE.Vector3(),camera=null){
    this.scene=scene;this.glowTexture=glowTexture;this.target=target;this.camera=camera;this.active=[];this.flashes=[];this.pool=[];this.clock=0;this.nextArrival=0;this.nextHomeLaunch=0;
    this.arcLast=new THREE.Vector3();this.arcPoint=new THREE.Vector3();
    this.orbGeometry=new THREE.SphereGeometry(.075,12,8);
  }
  createResources(tint){
    const flashGroup=new THREE.Group();flashGroup.scale.setScalar(.65);const flash=new OrbArrival(flashGroup,tint,0);
    const root=new THREE.Group(),group=new THREE.Group();root.add(group);
    const orb=new THREE.Mesh(this.orbGeometry,new THREE.MeshBasicMaterial({fog:false,toneMapped:false}));group.add(orb);
    const aura=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,toneMapped:false,map:this.glowTexture}));aura.scale.setScalar(.42);group.add(aura);
    const impact=new OrbArrival(group,tint,0);group.traverse(object=>object.layers.set(2));const trail=new OrbTrail(root,tint);
    return {flashGroup,flash,root,group,orb,aura,impact,trail};
  }
  collect(shard,onArrive=()=>{},{followTarget=false}={}){
    const tint=new THREE.Color(shard.userData.pickable?.color??'#ffe6a4'),origin=new THREE.Vector3();
    const gem=shard.children.find(child=>child.isMesh&&child!==shard.shadow);
    if(shard.userData.pickable&&gem)gem.getWorldPosition(origin);else shard.getWorldPosition(origin);
    const resources=this.pool.pop()??this.createResources(tint),{flashGroup,flash,root,group,orb,aura,impact,trail}=resources;
    flashGroup.position.copy(origin);this.scene.add(flashGroup);flash.material.uniforms.tint.value.copy(tint);flash.material.uniforms.seed.value=random()*Math.PI*2;flash.update(0,this.camera);this.flashes.push({group:flashGroup,flash,age:0});
    root.name=followTarget?'Pickup player anchor':'Pickup world anchor';root.position.copy(this.target(root.position));this.scene.add(root);group.position.copy(origin).sub(root.position);
    orb.visible=aura.visible=true;orb.material.color.copy(tint).lerp(new THREE.Color('white'),.30);aura.material.color.copy(tint);
    impact.mesh.visible=false;impact.material.uniforms.tint.value.copy(tint);impact.material.uniforms.seed.value=random()*Math.PI*2;trail.mesh.material.uniforms.tint.value.copy(tint);
    const dir=new THREE.Vector3(1,0,0);
    if(this.camera){this.camera.updateMatrixWorld();dir.setFromMatrixColumn(this.camera.matrixWorld,0);dir.y=0;dir.normalize();}
    dir.multiplyScalar(random()<.5?-1:1);
    const reach=1.0+random()*.5;
    // Hover around the player, not around the gem's old collection offset.
    const start=group.position.clone(),end=dir.clone().multiplyScalar(reach*.65);end.y=.45+random()*1.45;
    const c1=start.clone().addScaledVector(dir,reach);c1.y+=.06;
    const c2=end.clone().addScaledVector(dir,reach*.6);c2.y-=.25;
    const outward=new THREE.CubicBezierCurve3(start,c1,c2,end);
    const home=new THREE.CubicBezierCurve3(end.clone(),end.clone().addScaledVector(dir,-.35).add(new THREE.Vector3(0,.65,0)),end.clone(),end.clone());
    home.arcLengthDivisions=40;
    group.traverse(object=>object.layers.set(2));
    const baseOrb=orb.material.color.clone().multiplyScalar(ORB_BRIGHTNESS),baseAura=aura.material.color.clone().multiplyScalar(ORB_BRIGHTNESS);

    const outDuration=.42+random()*.12,baseHomeDuration=.48+random()*.15;
    const minimumHold=CHARGE_MIN+random()*(CHARGE_MAX-CHARGE_MIN);
    const homeLaunch=Math.max(this.clock+COLLAPSE+outDuration+minimumHold,this.nextHomeLaunch);
    this.nextHomeLaunch=homeLaunch+.12+random()*.08;
    const chargeDuration=homeLaunch-this.clock-COLLAPSE-outDuration;
    const earliest=this.clock+COLLAPSE+outDuration+chargeDuration+baseHomeDuration;
    const arrival=Math.max(earliest,this.nextArrival);
    this.nextArrival=arrival+.035+random()*.0225;
    const homeDuration=baseHomeDuration+arrival-earliest;
    this.active.push({resources,shard,reach,followTarget,source:shard.userData.pickable&&gem?gem:shard,root,launched:false,anchor:new THREE.Vector3(),group,orb,aura,impact,trail,outward,home,dir,baseOrb,baseAura,onArrive,age:0,outDuration,homeDuration,chargeDuration,arch:.95+random()*.35,curveSide:random()<.5?-1:1,delta:new THREE.Vector3(),curveOffset:new THREE.Vector3(),arrived:false,arrivalAge:0,point:new THREE.Vector3(),rotation:shard.rotation.clone()});
  }
  prepareWarmup(shard){
    if(!shard){
      shard={userData:{pickable:{color:'#74dcff'}},shadow:null,rotation:new THREE.Euler(),children:[{isMesh:true,getWorldPosition(out){return out.set(0,0,0);}}]};
    }
    for(let i=0;i<8;i++){
      this.collect(shard,()=>{});const effect=this.active.at(-1);effect.impact.update(0,this.camera);
      effect.trail.update(effect.group.position,1/60,true);effect.trail.update(effect.group.position.clone().add(new THREE.Vector3(.1,0,0)),1/60,true);
    }
    return [...this.active.map(e=>e.root),...this.flashes.map(f=>f.group)];
  }
  update(dt){
    this.clock+=dt;
    for(let i=this.flashes.length-1;i>=0;i--){const f=this.flashes[i];f.age+=dt;f.flash.update(f.age*2.2,this.camera);if(f.age>.26){f.group.removeFromParent();this.flashes.splice(i,1);}}
    for(let i=this.active.length-1;i>=0;i--){
      const e=this.active[i];e.age+=dt;
      const t=Math.min(1,e.age/COLLAPSE);e.shard.scale.setScalar(1-t*t*t);e.shard.visible=t<1;
      e.shard.rotation.set(e.rotation.x+t*t*.25,e.rotation.y+t*t*.8,e.rotation.z);
      const flight=e.age-COLLAPSE;
      if(e.followTarget)e.root.position.copy(this.target(e.anchor));
      if(!e.launched){
        // Stay on the moving gem until separation, then freeze the path in player space.
        e.source.getWorldPosition(e.point);e.point.sub(e.root.position);
        if(flight<0)e.group.position.copy(e.point);
        else{
          e.outward.v0.copy(e.point);
          e.outward.v1.copy(e.point).addScaledVector(e.dir,e.reach);e.outward.v1.y+=.06;
          e.home.v0.copy(e.outward.v3);e.launched=true;
        }
      }
      if(!e.arrived){
        e.orb.material.color.copy(e.baseOrb);e.aura.material.color.copy(e.baseAura);
        e.orb.scale.setScalar(ORB_SCALE);e.aura.scale.setScalar(.42*ORB_SCALE);e.aura.material.opacity=.8;
        if(flight<0){e.orb.scale.setScalar(Math.max(.01,t*t)*ORB_SCALE);e.aura.material.opacity=t*.6;}
        else if(flight<e.outDuration){const u=flight/e.outDuration;e.outward.getPoint(1-(1-u)**2,e.point);e.group.position.copy(e.point);}
        else if(flight<e.outDuration+e.chargeDuration){
          const u=(flight-e.outDuration)/e.chargeDuration,pulse=Math.sin(u*Math.PI)**2;
          e.group.position.copy(e.outward.v3);
          e.orb.scale.setScalar(ORB_SCALE*(1+.25*pulse));e.aura.scale.setScalar(.42*ORB_SCALE*(1+.25*pulse));
          e.orb.material.color.multiplyScalar(1+pulse*3);e.aura.material.color.multiplyScalar(1+pulse*4);
          e.aura.material.opacity=.8+pulse*.2;
        }
        else{
          const u=Math.min(1,(flight-e.outDuration-e.chargeDuration)/e.homeDuration);
          e.home.v3.copy(this.target(e.anchor)).sub(e.root.position);
          e.delta.subVectors(e.home.v3,e.home.v0);
          const distance=e.delta.length(),lift=Math.max(e.arch,distance*.38);
          e.curveOffset.set(-e.delta.z,0,e.delta.x).normalize().multiplyScalar(Math.min(.65,distance*.22)*e.curveSide);
          e.home.v1.copy(e.home.v0).addScaledVector(e.delta,.20).add(e.curveOffset);e.home.v1.y+=lift;
          e.home.v2.copy(e.home.v0).addScaledVector(e.delta,.72).addScaledVector(e.curveOffset,.75);e.home.v2.y+=lift*.95;
          const lengths=e.home.cacheArcLengths??=[];lengths.length=e.home.arcLengthDivisions+1;lengths[0]=0;e.home.getPoint(0,this.arcLast);
          for(let sample=1;sample<lengths.length;sample++){e.home.getPoint(sample/e.home.arcLengthDivisions,this.arcPoint);lengths[sample]=lengths[sample-1]+this.arcPoint.distanceTo(this.arcLast);this.arcLast.copy(this.arcPoint);}e.home.needsUpdate=false;
          // Arc-length sampling makes cubic ease-in a real speed ramp,
          // independent of uneven spacing along the Bezier control points.
          e.home.getPointAt(u*u*u,e.point);e.group.position.copy(e.point);
          if(u>=1){e.arrived=true;e.orb.visible=false;e.aura.visible=false;e.impact.update(0,this.camera);e.onArrive();e.onArrive=null;}
        }
      }else{
        e.arrivalAge+=dt;e.group.position.copy(this.target(e.anchor)).sub(e.root.position);
        const u=Math.min(1,e.arrivalAge/BURST);
        e.impact.update(e.arrivalAge,this.camera);
        if(u>=1){this.remove(e);this.active.splice(i,1);continue;}
      }
      e.trail.update(e.group.position,dt,!e.arrived&&flight>=0&&(flight<e.outDuration||flight>=e.outDuration+e.chargeDuration));
    }
  }
  remove(e){e.trail.reset();e.impact.mesh.visible=false;e.root.removeFromParent();this.pool.push(e.resources);}
  clear(){for(const f of this.flashes){f.group.removeFromParent();}this.flashes.length=0;for(const e of this.active)this.remove(e);this.active.length=0;this.clock=0;this.nextArrival=0;this.nextHomeLaunch=0;}
}
