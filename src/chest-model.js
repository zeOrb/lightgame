import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {applyTowerDepth} from './tower-depth.js';
import {setObjectAura} from './object-aura.js';

let shared;
function chestAssets(){
  if(shared)return shared;
  const base=[[],[],[]],lid=[[],[],[]];
  function add(parts,kind,g,x=0,y=0,z=0,tint=1){
    g.translate(x,y,z);const geometry=g.index?g.toNonIndexed():g;if(g.index)g.dispose();
    if(kind===0){const colors=[];for(let i=0;i<geometry.attributes.position.count;i++)colors.push(tint,tint*.97,tint*.91);geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
    parts[kind].push(geometry);
  }
  const box=(parts,k,w,h,d,x,y,z,t=1)=>add(parts,k,new THREE.BoxGeometry(w,h,d),x,y,z,t);
  function line(parts,kind,points,r=.018){add(parts,kind,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,5,false));}
  box(base,0,.91,.49,.85,0,.34,0,.78);
  for(let i=0;i<6;i++)for(const sign of [-1,1])box(base,0,.147,.49,.045,-.395+i*.158,.34,sign*.438,.89+(i%3)*.075);
  for(const x of [-.44,.44])for(const z of [-.40,.40]){
    box(base,0,.10,.25,.12,x,.135,z,.82);box(base,1,.12,.09,.14,x,.115,z);
  }
  for(const y of [.15,.58])box(base,1,.99,.055,.95,0,y,0);
  // Pierced corner plates read as forged iron, with the oak visible through them.
  for(const sign of [-1,1])for(const side of [-1,1]){
    const plate=new THREE.Shape();plate.moveTo(0,.21);plate.lineTo(.10,.08);plate.lineTo(.075,-.12);plate.lineTo(0,-.20);plate.lineTo(-.075,-.12);plate.lineTo(-.10,.08);plate.closePath();
    const hole=new THREE.Path();hole.moveTo(0,.12);hole.lineTo(-.037,.025);hole.lineTo(0,-.07);hole.lineTo(.037,.025);hole.closePath();plate.holes.push(hole);
    const g=new THREE.ExtrudeGeometry(plate,{depth:.026,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:1});if(side<0)g.rotateY(Math.PI);add(base,1,g,sign*.405,.36,side*.478);
  }
  for(const x of [-.41,.41])for(const z of [-.47,.47]){
    box(base,1,.07,.46,.026,x,.36,z);
    for(const y of [.21,.38,.53]){const rivet=new THREE.SphereGeometry(.024,6,4);rivet.scale(1,1,.45);add(base,2,rivet,x,y,z*1.035);}
  }
  // Forged straps branch into broad leaf-like scrolls across the oak panels.
  for(const sign of [-1,1])for(const side of [-1,1]){
    const x=sign*.41,z=side*.493;
    line(base,1,[[x,.43,z],[x-sign*.06,.49,z],[x-sign*.13,.46,z],[x-sign*.14,.38,z],[x-sign*.09,.35,z]],.019);
    line(base,1,[[x,.30,z],[x+sign*.03,.26,z],[x+sign*.035,.20,z]],.015);
  }
  // A shield-shaped lock plate and a dark keyhole form the main front accent.
  const shield=new THREE.Shape();shield.moveTo(-.10,.13);shield.lineTo(.10,.13);shield.lineTo(.13,0);shield.lineTo(0,-.16);shield.lineTo(-.13,0);shield.closePath();
  const lock=new THREE.ExtrudeGeometry(shield,{depth:.025,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1});lock.scale(1.18,1.18,1);add(base,2,lock,0,.40,.49);
  add(base,1,new THREE.CircleGeometry(.024,10),0,.44,.541);box(base,1,.018,.055,.008,0,.407,.543);
  for(const sign of [-1,1]){
    const ring=new THREE.TorusGeometry(.095,.018,5,14);ring.rotateY(Math.PI/2);add(base,1,ring,sign*.49,.36,0);
    box(base,2,.035,.065,.065,sign*.48,.44,0);
    for(const z of [-.28,.28])line(base,1,[[sign*.492,.22,z-.09],[sign*.492,.42,z-.09],[sign*.492,.54,z],[sign*.492,.42,z+.09],[sign*.492,.22,z+.09]],.022);
  }
  const arch=new THREE.Shape();arch.moveTo(-.46,0);arch.lineTo(-.46,.08);arch.quadraticCurveTo(-.46,.35,0,.36);arch.quadraticCurveTo(.46,.35,.46,.08);arch.lineTo(.46,0);arch.closePath();
  const dome=new THREE.ExtrudeGeometry(arch,{depth:.96,bevelEnabled:true,bevelSize:.014,bevelThickness:.014,bevelSegments:1,curveSegments:10});dome.rotateY(Math.PI/2);add(lid,0,dome,-.48,0,0,1.05);
  box(lid,1,.99,.045,.97,0,.015,0);
  for(const x of [-.43,.43]){
    const strap=new THREE.Shape(),points=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return [-Math.cos(a)*.475,.075+Math.sin(a)*.285];});
    strap.moveTo(points[0][0],points[0][1]);for(const [z,y] of points.slice(1))strap.lineTo(z,y);for(const [z,y] of [...points].reverse())strap.lineTo(z,y-.035);strap.closePath();
    const band=new THREE.ExtrudeGeometry(strap,{depth:.095,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:1});band.rotateY(Math.PI/2);add(lid,1,band,x-.0475,.008,0);
    const ridge=Array.from({length:17},(_,i)=>{const a=i/16*Math.PI;return [x,.075+Math.sin(a)*.285,-Math.cos(a)*.475];});line(lid,1,ridge,.034);
    for(const z of [-.44,.44]){const nail=new THREE.SphereGeometry(.026,6,4);add(lid,2,nail,x,.13,z);}
    box(lid,1,.10,.10,.10,x,.035,-.45);
  }
  // Crown tracery follows the dome, rather than hovering over a flat lid.
  const roof=(x,z)=>[x,.095+.285*Math.sqrt(Math.max(0,1-(z/.475)**2)),z];
  for(const sign of [-1,1])for(const side of [-1,1]){
    line(lid,1,[[sign*.43,side*.12],[sign*.35,side*.20],[sign*.28,side*.32],[sign*.34,side*.40],[sign*.42,side*.34]].map(([x,z])=>roof(x,z)),.025);
    line(lid,2,[[sign*.44,side*.18],[sign*.37,side*.25],[sign*.32,side*.34]].map(([x,z])=>roof(x,z)),.010);
    const stud=new THREE.OctahedronGeometry(.042);stud.scale(1,.55,1);add(lid,2,stud,...roof(sign*.43,side*.33));
  }
  const materials=[applyTowerDepth(new THREE.MeshStandardMaterial({color:'#815735',roughness:.88,vertexColors:true})),applyTowerDepth(new THREE.MeshStandardMaterial({color:'#b9c1c8',metalness:.78,roughness:.23,emissive:'#ffffff',emissiveIntensity:.45})),applyTowerDepth(new THREE.MeshStandardMaterial({color:'#e1e5e8',metalness:.82,roughness:.17,emissive:'#ffffff',emissiveIntensity:.65}))];
  const merge=parts=>parts.map(list=>{const g=list.length?mergeGeometries(list,false):null;list.forEach(p=>p.dispose());return g;});
  return shared={base:merge(base),lid:merge(lid),materials};
}

export function createChestModel(parent,{width,height,depth},visuals={}){
  const assets=chestAssets(),model=new THREE.Group(),lid=new THREE.Group();model.name='Forged oak chest';model.scale.set(width,height,depth);parent.add(model);
  const materials=assets.materials.map((material,i)=>{if(!i||!visuals.metal)return material;const copy=material.clone();copy.color.set(i===1?visuals.metal.color:visuals.metal.accent);copy.emissive.copy(copy.color);return copy;});
  for(const [geometries,target] of [[assets.base,model],[assets.lid,lid]])geometries.forEach((g,i)=>{if(g)target.add(new THREE.Mesh(g,materials[i]));});
  lid.position.y=.60;lid.rotation.x=-.08;lid.name='Domed chest lid';model.add(lid);
  setObjectAura(model,visuals);return {model,lid};
}
