import * as THREE from 'three';
export class PhaseTrail {
  constructor(scene){
    this.color=new THREE.Color('#fff1bc');this.samples=[];this.geometry=new THREE.BufferGeometry();this.positions=new Float32Array(64*6);this.colors=new Float32Array(64*6);this.alphas=new Float32Array(64*2);
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3));this.geometry.setAttribute('fade',new THREE.BufferAttribute(this.alphas,1));
    const indices=[];for(let i=0;i<63;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}this.geometry.setIndex(indices);
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:'attribute vec3 color;attribute float fade;varying vec3 tint;varying float alpha;void main(){tint=color;alpha=fade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 tint;varying float alpha;void main(){float grain=fract(sin(dot(floor(gl_FragCoord.xy*.3),vec2(12.98,78.23)))*43758.54);if(grain>alpha)discard;gl_FragColor=vec4(tint*1.5,alpha*.55);}'});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.visible=false;scene.add(this.mesh);
    this.side=new THREE.Vector3();this.direction=new THREE.Vector3();this.view=new THREE.Vector3();
  }
  reset(){this.samples=[];this.mesh.visible=false;}
  update(dt,position,active,camera,color=this.color){
    for(const sample of this.samples)sample.age+=dt;
    this.samples=this.samples.filter(s=>s.age<.32);
    if(active){
      const start=this.samples.at(-1)?.point??position;
      const count=Math.max(1,Math.ceil(start.distanceTo(position)/.14));
      const previousColor=this.samples.at(-1)?.color??color;
      for(let i=1;i<=count;i++)this.samples.push({point:start.clone().lerp(position,i/count),age:0,color:previousColor.clone().lerp(color,i/count)});
    }
    this.samples=this.samples.slice(-64);const samples=this.samples;
    this.mesh.visible=samples.length>1;
    for(let i=0;i<samples.length;i++){
      const sample=samples[i],next=samples[Math.min(i+1,samples.length-1)],prev=samples[Math.max(0,i-1)];
      this.direction.subVectors(next.point,prev.point);this.view.subVectors(camera.position,sample.point);this.side.crossVectors(this.direction,this.view).normalize().multiplyScalar(.3*(1-sample.age/.32));
      const color=sample.color;
      for(let j=0;j<2;j++){const k=i*2+j,sign=j?1:-1;this.positions.set([sample.point.x+this.side.x*sign,sample.point.y+.38+this.side.y*sign,sample.point.z+this.side.z*sign],k*3);this.colors.set([color.r,color.g,color.b],k*3);this.alphas[k]=Math.pow(1-sample.age/.32,1.3);}
    }
    this.geometry.setDrawRange(0,Math.max(0,samples.length-1)*6);for(const attr of Object.values(this.geometry.attributes))attr.needsUpdate=true;
  }
}
