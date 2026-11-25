import {RandomManager} from './random-manager.js';
import * as THREE from 'three';

// A camera-facing triangle tapers from the selected crystal to the rabbit.
export class CatcherRay {
  constructor(scene,gems){
    this.gems=gems;this.index=0;this.next=0;this.age=0;this.fade=0;
    this.source=new THREE.Vector3();this.target=new THREE.Vector3();
    this.side=new THREE.Vector3();this.direction=new THREE.Vector3();this.view=new THREE.Vector3();
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3));
    this.geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));
    this.material=new THREE.MeshBasicMaterial({color:'#ffb6ed',transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
    this.clock={value:0};
    this.material.onBeforeCompile=shader=>{
      shader.uniforms.rayClock=this.clock;
      shader.vertexShader='varying vec2 rayUV;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrayUV=uv;');
      shader.fragmentShader=`uniform float rayClock;varying vec2 rayUV;
        float rayHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float rayNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rayHash(i),rayHash(i+vec2(1,0)),f.x),mix(rayHash(i+vec2(0,1)),rayHash(i+vec2(1,1)),f.x),f.y);}
      `+shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
        float width=max(.02,1.-rayUV.y);
        float across=clamp((rayUV.x-.5)/width+.5,0.,1.);
        float edge=pow(max(0.,sin(across*3.14159265)),1.4);
        float endFade=smoothstep(0.,.08,rayUV.y)*(1.-smoothstep(.68,1.,rayUV.y));
        vec2 drift=vec2(across*3.2,rayUV.y*6.-rayClock*.22);
        float mist=rayNoise(drift)*.7+rayNoise(drift*2.1+vec2(rayClock*.09,4.7))*.3;
        diffuseColor.a*=edge*endFade*mix(.18,1.,smoothstep(.15,.85,mist));`);
    };
    this.material.customProgramCacheKey=()=> 'catcher-ray-soft-mist-v1';
    this.line=new THREE.Mesh(this.geometry,this.material);this.line.frustumCulled=false;scene.add(this.line);
    this.spark=new THREE.Mesh(new THREE.OctahedronGeometry(.07),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(this.spark);
    this.color=new THREE.Color();
  }
  update(dt,time,rabbit,visible,camera){
    this.clock.value=time;
    this.age+=dt;
    if(time>=this.next){
      this.index=(this.index+1+Math.floor(RandomManager.graphics()*(this.gems.length-1)))%this.gems.length;
      this.next=time+1;this.age=0;
      this.color.copy(this.gems[this.index].material.userData.beamColor??new THREE.Color('#ffd68e'));
      this.material.color.copy(this.color);this.spark.material.color.copy(this.color);
    }
    this.fade=THREE.MathUtils.clamp(this.fade+(visible?1:-1)*dt/(visible?.35:.45),0,1);
    const envelope=this.fade*this.fade*(3-2*this.fade);
    this.line.visible=this.spark.visible=envelope>.0001;
    this.spark.material.opacity=envelope;
    if(!this.line.visible){this.material.opacity=0;return;}
    this.gems[this.index].getWorldPosition(this.source);
    this.target.copy(rabbit.position);this.target.y+=.38;
    this.direction.subVectors(this.target,this.source);
    this.view.subVectors(camera.position,this.source);
    this.side.crossVectors(this.direction,this.view).normalize().multiplyScalar(.38*envelope);
    const a=this.geometry.attributes.position;
    a.setXYZ(0,this.source.x+this.side.x,this.source.y+this.side.y,this.source.z+this.side.z);
    a.setXYZ(1,this.source.x-this.side.x,this.source.y-this.side.y,this.source.z-this.side.z);
    a.setXYZ(2,this.target.x,this.target.y,this.target.z);a.needsUpdate=true;
    this.material.opacity=envelope*(.2+.04*Math.sin(time*5));
    const travel=(this.age*1.4)%1;
    this.spark.position.lerpVectors(this.source,this.target,travel);
    this.spark.scale.setScalar(.7+Math.sin(travel*Math.PI)*.7);this.spark.rotation.y=time*3;
  }
}
