import * as THREE from 'three';

// A camera-facing triangle tapers from the selected crystal to the rabbit.
export class CatcherRay {
  constructor(scene,gems){
    this.gems=gems;this.index=0;this.next=0;this.age=0;
    this.source=new THREE.Vector3();this.target=new THREE.Vector3();
    this.side=new THREE.Vector3();this.direction=new THREE.Vector3();this.view=new THREE.Vector3();
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3));
    this.material=new THREE.MeshBasicMaterial({color:'#ffb6ed',transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
    this.line=new THREE.Mesh(this.geometry,this.material);this.line.frustumCulled=false;scene.add(this.line);
    this.spark=new THREE.Mesh(new THREE.OctahedronGeometry(.07),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(this.spark);
    this.color=new THREE.Color();
  }
  update(dt,time,rabbit,visible,camera){
    this.age+=dt;
    if(time>=this.next){
      this.index=(this.index+1+Math.floor(Math.random()*(this.gems.length-1)))%this.gems.length;
      this.next=time+1;this.age=0;
      this.color.copy(this.gems[this.index].material.userData.beamColor??new THREE.Color('#ffd68e'));
      this.material.color.copy(this.color);this.spark.material.color.copy(this.color);
    }
    this.line.visible=this.spark.visible=visible;
    if(!visible)return;
    this.gems[this.index].getWorldPosition(this.source);
    this.target.copy(rabbit.position);this.target.y+=.38;
    this.direction.subVectors(this.target,this.source);
    this.view.subVectors(camera.position,this.source);
    this.side.crossVectors(this.direction,this.view).normalize().multiplyScalar(.38);
    const a=this.geometry.attributes.position;
    a.setXYZ(0,this.source.x+this.side.x,this.source.y+this.side.y,this.source.z+this.side.z);
    a.setXYZ(1,this.source.x-this.side.x,this.source.y-this.side.y,this.source.z-this.side.z);
    a.setXYZ(2,this.target.x,this.target.y,this.target.z);a.needsUpdate=true;
    this.material.opacity=Math.min(1,this.age/.12)*(.2+.04*Math.sin(time*5));
    const travel=(this.age*1.4)%1;
    this.spark.position.lerpVectors(this.source,this.target,travel);
    this.spark.scale.setScalar(.7+Math.sin(travel*Math.PI)*.7);this.spark.rotation.y=time*3;
  }
}
