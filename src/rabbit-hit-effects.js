import * as THREE from 'three';

export class RabbitHitEffects {
  constructor(scene,rabbit,visual){
    this.rabbit=rabbit;this.age=1;this.point={value:new THREE.Vector3()};this.time={value:1};this.inverse={value:new THREE.Matrix4()};
    const materials=new Set();visual.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial)materials.add(o.material);});
    for(const material of materials){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=shader=>{
        compile(shader);Object.assign(shader.uniforms,{hitOrigin:this.point,hitAge:this.time,hitRootInverse:this.inverse});
        shader.vertexShader='varying vec3 hitWorld;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nhitWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
        shader.fragmentShader='uniform vec3 hitOrigin;uniform float hitAge;uniform mat4 hitRootInverse;varying vec3 hitWorld;\n'+shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
          vec3 hitLocal=(hitRootInverse*vec4(hitWorld,1.)).xyz;
          float waveAge=hitAge/1.33;
          float distanceFromHit=length(hitLocal-hitOrigin),radius=waveAge*3.6;
          float front=1.-smoothstep(.11,.21,abs(distanceFromHit-radius));
          float wake=smoothstep(distanceFromHit-.04,distanceFromHit+.04,radius)*(1.-smoothstep(.15,.48,waveAge));
          float wave=max(front,wake*.85)*(1.-smoothstep(.35,.55,waveAge));
          gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.002,.001,.004),wave);`);
      };
      material.customProgramCacheKey=()=> 'rabbit-shadow-impact-v2';material.needsUpdate=true;
    }
    this.bits=Array.from({length:10},()=>{
      const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#050408',transparent:true,depthWrite:false,fog:false,toneMapped:false}));
      mesh.layers.set(3);mesh.renderOrder=3;mesh.visible=false;scene.add(mesh);return {mesh,velocity:new THREE.Vector3(),spin:new THREE.Vector3(),age:1,life:.2,size:1};
    });
  }
  hit(source){
    const root=this.rabbit;root.updateWorldMatrix(true,true);
    const direction=root.position.clone().sub(source);direction.y=.12;direction.normalize();
    const impact=root.position.clone().add(new THREE.Vector3(0,.5,0)).addScaledVector(direction,-.24);
    this.point.value.set(0,.5,0);this.age=0;this.time.value=0;
    const count=6+Math.floor(Math.random()*5);
    this.bits.forEach((bit,i)=>{
      bit.age=0;bit.life=.22+Math.random()*.18;bit.size=.10+Math.random()*.09;
      bit.mesh.visible=i<count;bit.mesh.position.copy(impact);bit.mesh.material.opacity=1;
      bit.velocity.copy(direction).multiplyScalar(3+Math.random()*3).add(new THREE.Vector3((Math.random()-.5)*2,Math.random()*2.3,(Math.random()-.5)*2));
      bit.spin.set(Math.random()*20,Math.random()*20,Math.random()*20);bit.mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);bit.mesh.scale.set(bit.size,bit.size*2.5,bit.size*.5);
    });
  }
  update(dt){
    this.age+=dt;this.time.value=this.age;this.rabbit.updateWorldMatrix(true,false);this.inverse.value.copy(this.rabbit.matrixWorld).invert();
    for(const bit of this.bits){if(!bit.mesh.visible)continue;bit.age+=dt;const t=Math.min(1,bit.age/bit.life);bit.mesh.position.addScaledVector(bit.velocity,dt);bit.velocity.multiplyScalar(Math.exp(-dt*6));bit.mesh.rotation.x+=bit.spin.x*dt;bit.mesh.rotation.z+=bit.spin.z*dt;bit.mesh.material.opacity=1-THREE.MathUtils.smoothstep(t,.4,1);bit.mesh.scale.multiplyScalar(Math.exp(-dt*2));if(t>=1)bit.mesh.visible=false;}
  }
  get visible(){return this.bits.some(bit=>bit.mesh.visible);}
  reset(){this.age=1;this.time.value=1;for(const bit of this.bits)bit.mesh.visible=false;}
}
