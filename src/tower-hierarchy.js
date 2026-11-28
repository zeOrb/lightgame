import * as THREE from 'three';
import {FLOORS,FLOOR_CONFIG,floorForSection} from './floor-config.js';
import {TOWER_TOP,route,setRouteYawResolver} from './game.js';

// Vertical-axis rotations preserve the platformer's gravity and floor heights.
export class TowerHierarchy{
  constructor(scene){
    this.scene=scene;this.root=new THREE.Group();this.root.name='TowerRoot';scene.add(this.root);
    this.floors=FLOORS.map(f=>{const root=new THREE.Group();root.name='FloorRoot:'+f.id;root.position.y=TOWER_TOP-f.start*.5;root.userData={floorId:f.id,floorIndex:f.index};this.root.add(root);return root;});
    this.version='';this.onRotate=null;
  }
  add(object,index){if(!object)return;this.floors[index].updateWorldMatrix(true,false);object.updateWorldMatrix(true,false);this.floors[index].attach(object);}
  worldDriven(object,index){
    const position=object.position.clone(),quaternion=object.quaternion.clone(),scale=object.scale.clone();
    this.add(object,index);object.position.copy(position);object.quaternion.copy(quaternion);object.scale.copy(scale);
    const original=object.updateMatrix,inverse=new THREE.Matrix4();
    object.updateMatrix=function(){original.call(this);this.parent.updateWorldMatrix(true,false);inverse.copy(this.parent.matrixWorld).invert();this.matrix.premultiply(inverse);};
    object.userData.worldDriven=true;object.updateMatrix();
  }
  organize({walkableFloors,beasts,glints,chests,bottles,books,hazards,arenas,secretLevels,floorGates,windowPanes,architecture,springboards,threatVisuals}){
    const bySection=o=>floorForSection(o.s).index;
    for(const o of architecture)if(o.parent===this.scene&&o!==this.root&&!o.isLight){if(o.userData.floorIndex!==undefined)this.add(o,o.userData.floorIndex);else this.root.attach(o);}
    for(const o of [...this.scene.children])if(o.name.startsWith('under-shelf-relics-'))this.add(o,o.userData.floorIndex);
    for(const mesh of walkableFloors.filter(m=>!m.userData.secretStep))this.add(mesh.parent,floorForSection(mesh.userData.s).index);
    for(const list of [chests,bottles,hazards])for(const item of list)this.add(item.o,bySection(item));
    this.glints=glints;
    for(const item of glints)this.worldDriven(item.o,bySection(item));
    for(const item of springboards.items)this.add(item.group,bySection(item));
    for(const item of threatVisuals.items)this.add(item.group,bySection(item.threat));
    for(const item of beasts)this.worldDriven(item.o,bySection(item));
    for(const item of books){this.worldDriven(item.o,bySection(item));this.add(item.warning,bySection(item));}
    for(const gate of floorGates.gates)this.add(gate.group,floorForSection(gate.plank).index);
    for(const a of arenas.arenas)this.add(a.group,a.index);
    for(const r of secretLevels.routes){this.add(r.group,floorForSection(r.s).index);this.add(r.room,floorForSection(r.s).index);}
    for(const window of new Set(windowPanes.map(p=>p.parent)))if(window.parent!==this.floors[window.userData.floorIndex])this.add(window,window.userData.floorIndex);
    this.root.rotation.y=THREE.MathUtils.degToRad(FLOOR_CONFIG.tower.rotationYDegrees??0);
    for(const f of FLOORS)this.floors[f.index].rotation.y=THREE.MathUtils.degToRad(f.rotationYDegrees);
    setRouteYawResolver(s=>-this.root.rotation.y-this.floors[floorForSection(s).index].rotation.y);
    for(const mesh of walkableFloors)if(mesh.userData.s!==undefined)mesh.userData.theta=route(mesh.userData.s).theta;
    for(const a of arenas.arenas)a.theta=route(a.plank).theta;
    for(const item of springboards.items)Object.assign(item.p,route(item.s));
    this.root.updateMatrixWorld(true);this.refreshPickables();this.version=this.signature();this.lastTowerYaw=this.root.rotation.y;this.lastFloorYaws=this.floors.map(r=>r.rotation.y);
    // Discoverable scene roots and narrow rotation API for debug/editor tools.
    this.scene.userData.tower=this;
  }
  refreshPickables(){for(const item of this.glints??[]){const point=route(item.s,item.lane??0);item.o.position.x=point.x;item.o.position.z=point.z;}}
  signature(){return [this.root.rotation.y,...this.floors.map(r=>r.rotation.y)].join(':');}
  update(dt){const speed=FLOOR_CONFIG.tower.rotationSpeedDegrees??0;if(dt>0){if(speed)this.root.rotation.y+=THREE.MathUtils.degToRad(speed)*dt;for(const floor of FLOORS)this.floors[floor.index].rotation.y+=THREE.MathUtils.degToRad(floor.rotationSpeedDegrees??0)*dt;}this.sync();}
  sync(){const version=this.signature();if(version!==this.version){
    const towerDelta=this.root.rotation.y-(this.lastTowerYaw??this.root.rotation.y);
    const floorDeltas=this.floors.map((root,i)=>root.rotation.y-(this.lastFloorYaws?.[i]??root.rotation.y));
    const floorsChanged=floorDeltas.some(delta=>delta!==0);
    this.lastTowerYaw=this.root.rotation.y;this.lastFloorYaws=this.floors.map(r=>r.rotation.y);
    this.version=version;this.root.updateMatrixWorld(true);this.refreshPickables();this.onRotate?.({towerDelta,floorsChanged,floorDeltas});
  }}
  rotateFloor(id,degrees){if(!Number.isFinite(degrees))throw new Error('Invalid rotation');const index=typeof id==='number'?id:FLOORS.findIndex(f=>f.id===id);if(!this.floors[index])throw new Error('Unknown floor '+id);this.floors[index].rotation.y=THREE.MathUtils.degToRad(degrees);this.sync();}
  rotateTower(degrees){if(!Number.isFinite(degrees))throw new Error('Invalid rotation');this.root.rotation.y=THREE.MathUtils.degToRad(degrees);this.sync();}
}
