import * as THREE from 'three';
import {createVisualRandom} from './random-manager.js';

export class RabbitShadowForm {
  constructor(scene){
    this.random=createVisualRandom('rabbit-shadow-form');this.count=24;
    const geometry=new THREE.BufferGeometry();
    for(const [name,size] of [['position',3],['fade',1],['size',1]])geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(this.count*size),size));
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{pixelHeight:{value:800}},vertexShader:`
      attribute float fade,size;uniform float pixelHeight;varying float opacity;
      void main(){opacity=fade;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*pixelHeight/max(1.,-p.z),1.,48.);}
    `,fragmentShader:`varying float opacity;void main(){float r=length(gl_PointCoord-.5)*2.;float soft=1.-smoothstep(.05,1.,r);gl_FragColor=vec4(.003,.002,.006,soft*soft*opacity);}`});
    this.mesh=new THREE.Points(geometry,this.material);this.mesh.frustumCulled=false;scene.add(this.mesh);this.reset();
  }
  reset(){this.shadow=false;this.amount=0;this.from=0;this.age=0;this.emit=0;this.particles=[];this.mesh.visible=false;this.mesh.geometry.setDrawRange(0,0);}
  transition(dt,shadow){
    if(shadow!==this.shadow){this.shadow=shadow;this.from=this.amount;this.age=0;}
    this.age+=dt;const t=Math.min(1,this.age/(shadow?.5:.25)),ease=t*t*(3-2*t);
    this.amount=THREE.MathUtils.lerp(this.from,shadow?1:0,ease);
    return 1-this.amount;
  }
  update(dt,position,emit,pixelHeight){
    this.material.uniforms.pixelHeight.value=pixelHeight;
    if(emit&&this.shadow){
      this.emit+=dt*14;
      while(this.emit>=1){this.emit--;const r=this.random,a=r()*Math.PI*2;
        this.particles.push({point:position.clone().add(new THREE.Vector3(Math.cos(a)*.18,.15+r()*.7,Math.sin(a)*.18)),age:0,life:.6+r()*.55,size:.09+r()*.13,dx:(r()-.5)*.12,dz:(r()-.5)*.12,speed:.24+r()*.25});
      }
    }else this.emit=0;
    this.particles=this.particles.filter(p=>(p.age+=dt)<p.life).slice(-this.count);
    const attrs=this.mesh.geometry.attributes;
    this.particles.forEach((p,i)=>{p.point.x+=p.dx*dt;p.point.z+=p.dz*dt;p.point.y+=p.speed*dt;const t=p.age/p.life;
      attrs.position.setXYZ(i,p.point.x,p.point.y,p.point.z);attrs.size.setX(i,p.size*(.7+t*.6));attrs.fade.setX(i,Math.sin(Math.PI*t)*.5*this.amount);
    });
    this.mesh.visible=this.particles.length>0;this.mesh.geometry.setDrawRange(0,this.particles.length);for(const a of Object.values(attrs))a.needsUpdate=true;
  }
}
