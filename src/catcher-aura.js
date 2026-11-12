import * as THREE from 'three';
import {createVisualRandom} from './visual-random.js';

export class CatcherAura {
  constructor(catcher,texture){
    this.catcher=catcher;
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#fff5d0',opacity:.72,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));
    halo.scale.setScalar(7);halo.layers.set(2);catcher.add(halo);
    const random=createVisualRandom('catcher-rainbow'),count=64;
    const geometry=new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1,1));
    geometry.setAttribute('sparkSeed',new THREE.InstancedBufferAttribute(Float32Array.from({length:count*4},()=>random()),4));
    geometry.instanceCount=count;
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false,uniforms:{clock:{value:0}},
      vertexShader:`attribute vec4 sparkSeed;uniform float clock;varying vec2 sparkUV;varying vec3 sparkColor;varying float sparkAlpha;
        void main(){float t=fract(clock/(2.2+sparkSeed.w)+sparkSeed.x),angle=sparkSeed.y*6.283185;
        float radius=1.2+t*(3.2+sparkSeed.z*2.);vec3 point=vec3(cos(angle)*radius,sin(angle)*radius,t*sin(angle*3.)*.65);
        vec4 view=modelViewMatrix*vec4(point,1.);float size=(.16+sparkSeed.w*.19)*(1.-t*.4);view.xy+=position.xy*size;
        sparkUV=uv*2.-1.;sparkColor=pow(.5+.5*cos(6.283185*(sparkSeed.z+vec3(0.,.33,.67))),vec3(1.7));sparkAlpha=smoothstep(0.,.12,t)*(1.-smoothstep(.55,1.,t));gl_Position=projectionMatrix*view;}`,
      fragmentShader:`varying vec2 sparkUV;varying vec3 sparkColor;varying float sparkAlpha;void main(){vec2 p=abs(sparkUV);float star=pow(max(0.,1.-pow(p.x*p.y, .5)*3.-length(p)*.35),3.);float glow=pow(max(0.,1.-length(p)),3.);gl_FragColor=vec4(sparkColor*2.+vec3(star*.08),max(star,glow*.4)*sparkAlpha);}`});
    this.sparks=new THREE.Mesh(geometry,this.material);this.sparks.frustumCulled=false;this.sparks.layers.set(2);catcher.add(this.sparks);
    this.center=new THREE.Vector3();this.edge=new THREE.Vector3();this.world=new THREE.Vector3();
  }
  update(time,camera,vignette,width,height){
    this.material.uniforms.clock.value=time;
    // The menu's DOM vignette otherwise dims even the unlit overlay pass.
    this.catcher.getWorldPosition(this.world);this.center.copy(this.world).project(camera);
    this.edge.copy(this.world).addScaledVector(new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),4.5).project(camera);
    const visible=this.center.z>-1&&this.center.z<1;
    const radius=visible?Math.abs(this.edge.x-this.center.x)*width*.5:0;
    vignette.style.maskImage=radius>0?`radial-gradient(circle ${radius}px at ${(this.center.x*.5+.5)*width}px ${(-this.center.y*.5+.5)*height}px, transparent 24%, black 100%)`:'';
  }
}
