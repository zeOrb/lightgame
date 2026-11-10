import * as THREE from 'three';

export class VitralGlow {
  constructor(parent,texture){
    this.group=new THREE.Group();this.group.position.y=.43;parent.add(this.group);
    this.bodyColor=new THREE.Color();this.palette=[new THREE.Color('#ffe7ac')];this.rays=[];
    const geometry=new THREE.ConeGeometry(.11,.8,8,1,true);
    for(let i=0;i<12;i++){
      const y=1-2*(i+.5)/12,a=i*2.399963,r=Math.sqrt(1-y*y),direction=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
      const material=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
      const ray=new THREE.Mesh(geometry,material);ray.position.copy(direction).multiplyScalar(.65);ray.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);this.group.add(ray);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
      glow.position.copy(direction).multiplyScalar(.36);glow.scale.setScalar(1.1);this.group.add(glow);this.rays.push({ray,glow});
    }
    this.lights=[new THREE.PointLight('#ff609e',0,3.5,2),new THREE.PointLight('#50bfff',0,3.5,2)];
    for(const light of this.lights)this.group.add(light);
    this.reset();
  }
  reset(){this.remaining=0;this.strength=0;this.group.visible=false;}
  update(dt,zone,brightness,time){
    if(zone){this.remaining=1;this.palette=zone.palette;}else this.remaining=Math.max(0,this.remaining-dt);
    this.strength=this.remaining*this.remaining*(3-2*this.remaining);
    const amount=this.strength*brightness;this.group.visible=amount>.001;
    const phase=time*.8,index=Math.floor(phase)%this.palette.length;
    this.bodyColor.copy(this.palette[index]).lerp(this.palette[(index+1)%this.palette.length],phase%1);
    this.group.rotation.y=time*.28;
    this.rays.forEach(({ray,glow},i)=>{
      const color=this.palette[i%this.palette.length],pulse=.85+.15*Math.sin(time*3+i);
      ray.material.color.copy(color);ray.material.opacity=amount*.19*pulse;
      glow.material.color.copy(color);glow.material.opacity=amount*.21*pulse;
    });
    this.lights.forEach((light,i)=>{light.color.copy(this.palette[(index+i*2)%this.palette.length]);light.intensity=amount*6;});
  }
}
