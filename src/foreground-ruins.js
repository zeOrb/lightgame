import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Near, peripheral silhouettes move more than the distant library during turns.
export class ForegroundRuins {
  constructor(scene){
    this.root=new THREE.Group();this.root.name='Peripheral ruined carvings';scene.add(this.root);
    this.previous=new THREE.Vector3();this.delta=new THREE.Vector3();this.offset=new THREE.Vector3();this.initial=true;
    const material=new THREE.MeshBasicMaterial({color:'#0b1318',transparent:true,opacity:.72,depthWrite:false,depthTest:false});
    this.sides=[];
    for(const sign of [-1,1]){
      const pieces=[];
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-2,0),new THREE.Vector3(-sign*.03,-.4,0),new THREE.Vector3(sign*.06,.8,0),new THREE.Vector3(0,2,0)]);
      pieces.push(new THREE.TubeGeometry(curve,16,.045,5,false));
      for(const y of [-.8,.8,1.2]){
        const scroll=Array.from({length:24},(_,i)=>{const a=i/23*Math.PI*2,r=.14*(1-i/28);return new THREE.Vector3(-sign*.06+Math.cos(a)*r,y+Math.sin(a)*r,0);});
        pieces.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(scroll),24,.012,4,false));
      }
      const mesh=new THREE.Mesh(mergeGeometries(pieces,false),material);mesh.renderOrder=4;mesh.frustumCulled=false;this.root.add(mesh);this.sides.push({sign,mesh});pieces.forEach(g=>g.dispose());
    }
  }
  update(camera,dt,visible=true){
    this.root.visible=visible;if(!visible){this.initial=true;return;}
    if(this.initial){this.previous.copy(camera.position);this.initial=false;}
    this.delta.copy(camera.position).sub(this.previous).applyQuaternion(camera.quaternion.clone().invert());this.previous.copy(camera.position);
    this.offset.addScaledVector(this.delta,-.04);this.offset.x=THREE.MathUtils.clamp(this.offset.x,-.07,.07);this.offset.y=THREE.MathUtils.clamp(this.offset.y,-.04,.04);this.offset.multiplyScalar(Math.exp(-dt*5));
    this.root.position.copy(camera.position);this.root.quaternion.copy(camera.quaternion);
    const z=2.8,halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*z;
    for(const {sign,mesh} of this.sides)mesh.position.set(sign*halfHeight*camera.aspect*1.02+this.offset.x,this.offset.y,-z);
  }
}
