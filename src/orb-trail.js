import * as THREE from 'three';

const CAPACITY=64,LIFETIME=.24;
export class OrbTrail {
  constructor(scene,color){
    this.clock=0;this.points=[];
    this.geometry=new THREE.BufferGeometry();
    for(const name of ['position','tangent'])this.geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(CAPACITY*2*3),3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('edge',new THREE.BufferAttribute(new Float32Array(CAPACITY*2),1));
    this.geometry.setAttribute('fade',new THREE.BufferAttribute(new Float32Array(CAPACITY*2),1).setUsage(THREE.DynamicDrawUsage));
    const indices=[];for(let i=0;i<CAPACITY-1;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}this.geometry.setIndex(indices);
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,uniforms:{tint:{value:color.clone()}},
      vertexShader:`attribute vec3 tangent;attribute float edge,fade;varying float vEdge,vFade;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);vec3 t=mat3(modelViewMatrix)*tangent;vec2 side=normalize(vec2(-t.y,t.x)+vec2(.00001,0.));p.xy+=side*edge*.085*sqrt(max(0.,fade));vEdge=edge;vFade=fade;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform vec3 tint;varying float vEdge,vFade;void main(){float soft=pow(max(0.,1.-vEdge*vEdge),2.);vec3 color=mix(tint,vec3(1.),pow(max(0.,1.-abs(vEdge)),8.)*.3);gl_FragColor=vec4(color*1.6,soft*vFade*.7);}`});
    this.mesh=new THREE.Mesh(this.geometry,material);this.mesh.frustumCulled=false;this.mesh.layers.set(2);scene.add(this.mesh);this.geometry.setDrawRange(0,0);
    this.direction=new THREE.Vector3();
  }
  update(position,dt,emitting){
    this.clock+=dt;
    while(this.points.length&&this.clock-this.points[0].time>LIFETIME)this.points.shift();
    const last=this.points[this.points.length-1];
    if(emitting&&(!last||last.position.distanceToSquared(position)>.0004)){
      const steps=last?Math.min(12,Math.max(1,Math.ceil(last.position.distanceTo(position)/.035))):1;
      for(let i=1;i<=steps;i++)this.points.push({position:last?last.position.clone().lerp(position,i/steps):position.clone(),time:last?THREE.MathUtils.lerp(last.time,this.clock,i/steps):this.clock});
    }
    if(this.points.length>CAPACITY)this.points.splice(0,this.points.length-CAPACITY);
    const p=this.geometry.attributes.position,t=this.geometry.attributes.tangent,fade=this.geometry.attributes.fade,edge=this.geometry.attributes.edge;
    this.points.forEach((point,i)=>{
      this.direction.subVectors(this.points[Math.min(i+1,this.points.length-1)].position,this.points[Math.max(0,i-1)].position).normalize();
      const age=Math.max(0,1-(this.clock-point.time)/LIFETIME),tail=THREE.MathUtils.smoothstep(i,0,3);
      for(let side=0;side<2;side++){const k=i*2+side;p.setXYZ(k,point.position.x,point.position.y,point.position.z);t.setXYZ(k,this.direction.x,this.direction.y,this.direction.z);edge.setX(k,side?1:-1);fade.setX(k,age*age*tail);}
    });
    for(const attr of [p,t,fade,edge])attr.needsUpdate=true;
    this.geometry.setDrawRange(0,Math.max(0,this.points.length-1)*6);
  }
  reset(){this.clock=0;this.points.length=0;this.geometry.setDrawRange(0,0);}
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.mesh.material.dispose();}
}
