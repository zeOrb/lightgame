import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {spineAtlas} from './ancient-library.js';
import {applyTowerDepth} from './tower-depth.js';
import {createVisualRandom} from './visual-random.js';
import {SHELF_OUTER_RADIUS} from './game.js';

export function createShelfDecorations(){
  const mat=(color,extra={})=>applyTowerDepth(new THREE.MeshStandardMaterial({color,roughness:.85,...extra}));
  const pages=mat('#b9aa87'),brass=mat('#987044',{metalness:.55}),binding=mat('#593c29'),glass=mat('#e7b566',{emissive:'#b76a21',emissiveIntensity:.45});
  const covers=Array.from({length:32},(_,tile)=>{const map=spineAtlas().clone();map.repeat.set(1/8,1/4);map.offset.set(tile%8/8,Math.floor(tile/8)/4);map.needsUpdate=true;return mat('#ffffff',{map});});
  return (parent,section)=>{
    const r=createVisualRandom('shelf-props:'+section);if(r()<.38)return null;
    const group=new THREE.Group(),kind=Math.floor(r()*3),bins=new Map();group.name=['Bound library volumes','Old scrolls','Brass lantern'][kind];
    group.position.set(SHELF_OUTER_RADIUS-.8,-.012,(r()<.5?-1:1)*(.65+r()*.13));group.rotation.y=(r()-.5)*.7;group.rotation.z=(r()-.5)*(kind===2?.07:.24);parent.add(group);
    const piece=(geometry,material,x,y,z,rotation=0)=>{const transform=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,rotation)),new THREE.Vector3(1,1,1));geometry.applyMatrix4(transform);if(!bins.has(material))bins.set(material,[]);bins.get(material).push(geometry);};
    const box=(w,h,d,m,x,y,z)=>piece(new THREE.BoxGeometry(w,h,d),m,x,y,z);
    if(kind===0){
      let base=0;
      for(let i=0,n=2+Math.floor(r()*2);i<n;i++){
        const w=.53+r()*.12,d=.58+r()*.13,h=.085+r()*.065,cover=covers[Math.floor(r()*32)],x=(r()-.5)*.035,z=(r()-.5)*.035;
        box(w,.025,d,cover,x,base+.0125,z);box(w-.04,h,d-.045,pages,x,base+.025+h/2,z+.01);box(w,.025,d,cover,x,base+.0375+h,z);
        box(w,h+.025,.035,cover,x,base+.025+h/2,z-d/2+.015);
        for(const sign of [-1,1])box(.025,.008,d-.08,brass,x+sign*(w/2-.065),base+h+.054,z);
        base+=h+.052;
      }
    }else if(kind===1){
      for(const z of [-.13,.13]){
        piece(new THREE.CylinderGeometry(.085,.085,.58,12),pages,0,.087,z,Math.PI/2);
        piece(new THREE.CylinderGeometry(.092,.092,.035,10),binding,0,.087,z,Math.PI/2);
      }
    }else{
      box(.37,.06,.37,brass,0,.03,0);box(.27,.42,.27,glass,0,.29,0);
      for(const x of [-.16,.16])for(const z of [-.16,.16])box(.025,.5,.025,brass,x,.31,z);
      box(.4,.065,.4,brass,0,.59,0);piece(new THREE.ConeGeometry(.24,.16,4),brass,0,.7,0);
      piece(new THREE.TorusGeometry(.1,.018,4,12),brass,0,.88,0);
    }
    for(const [material,parts] of bins){group.add(new THREE.Mesh(mergeGeometries(parts,false),material));parts.forEach(g=>g.dispose());}
    group.updateMatrixWorld(true);const bounds=new THREE.Box3();for(const child of group.children){child.geometry.computeBoundingBox();bounds.union(child.geometry.boundingBox.clone().applyMatrix4(group.matrix));}group.position.y+=-.012-bounds.min.y;
    return group;
  };
}
