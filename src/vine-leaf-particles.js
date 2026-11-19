import * as THREE from 'three';
import {RandomManager} from './random-manager.js';
import {applyTowerDepth} from './tower-depth.js';
import {VINE_RESPONSE_REACH} from './foliage-response.js';

const CONTACT_RADIUS=VINE_RESPONSE_REACH;
function leafGeometry(){
  const positions=[],colors=[],indices=[];
  // Ovate blade with a short stem, pointed tip and a raised pale midrib.
  const rows=[[0,.004],[.025,.006],[.045,.038],[.08,.07],[.13,.092],[.18,.079],[.225,.046],[.27,0]];
  rows.forEach(([y,width],row)=>{
    const t=y/.27,rib=Math.min(width,.004),bend=Math.sin(t*Math.PI),centre=Math.sin(t*2.2)*.012;
    [-width,-rib,0,rib,width].forEach((x,column)=>{
      positions.push(x+centre,y,bend*(column===0||column===4?-.006:.025));
      const c=row<2?[.10,.22,.025]:column===0?[.13,.27,.04]:column===4?[.18,.34,.06]:[.25,.41,.08];colors.push(...c);
    });
    if(row)for(let column=0;column<4;column++){
      const a=(row-1)*5+column,b=a+1,c=row*5+column,d=c+1;indices.push(a,b,c,b,d,c);
    }
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export class VineLeafParticles {
  constructor(scene,{random=RandomManager.graphics,capacity=96,camera=null,geometry=null,contacts=true}={}){
    this.random=random;this.camera=camera;this.tumble=new THREE.Quaternion();this.sources=[];this.previous=null;
    if(contacts)scene.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.userData.vineLength)this.sources.push({mesh,length:mesh.userData.vineLength,inside:new Uint8Array(mesh.instanceMatrix.count)});});
    this.geometry=geometry??leafGeometry();
    this.alpha=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage);this.geometry.setAttribute('leafAlpha',this.alpha);
    const material=applyTowerDepth(new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,depthWrite:false,fog:true}));
    const previous=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{previous(shader);
      shader.vertexShader='attribute float leafAlpha;varying float vLeafAlpha;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLeafAlpha=leafAlpha;');
      shader.fragmentShader='varying float vLeafAlpha;\n'+shader.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a*=vLeafAlpha;\n#include <alphatest_fragment>');
    };
    material.customProgramCacheKey=()=> 'vine-leaf-particles-v1';
    this.mesh=new THREE.InstancedMesh(this.geometry,material,capacity);this.mesh.name='Vine leaf bursts';this.mesh.renderOrder=12;this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.layers.set(2);this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
    this.particles=Array.from({length:capacity},()=>({active:false,position:new THREE.Vector3(),velocity:new THREE.Vector3(),spin:new THREE.Vector3(),rotation:new THREE.Euler(),color:new THREE.Color()}));
    this.instance=new THREE.Matrix4();this.matrix=new THREE.Matrix4();this.root=new THREE.Vector3();this.segment=new THREE.Vector3();this.direction=new THREE.Vector3();this.contact=new THREE.Vector3();this.dummy=new THREE.Object3D();
  }
  spawn(point,direction,speed){
    const count=3+Math.floor(this.random()*4);
    for(let i=0;i<count;i++){
      const p=this.particles.find(p=>!p.active);if(!p)break;
      p.active=true;p.age=0;p.life=1.1+this.random()*.8;p.size=.55+this.random()*.55;p.width=.85+this.random()*.3;p.length=.9+this.random()*.2;
      p.position.copy(point).add(new THREE.Vector3((this.random()-.5)*.16,(this.random()-.5)*.15,(this.random()-.5)*.16));
      const launch=1.2+Math.min(24,speed)*.16+this.random()*.8,side=(this.random()-.5)*.8;
      p.velocity.set(direction.x*launch-direction.z*side,.6+this.random()*1.2,direction.z*launch+direction.x*side);
      p.rotation.set(this.random()*6,this.random()*6,this.random()*Math.PI*2);p.spin.set((this.random()-.5)*3,(this.random()-.5)*3,(this.random()-.5)*5);
      const tint=.9+this.random()*.1;p.color.setRGB(tint,tint, tint*.94);
    }
  }
  update(position,velocity,dt,active=true){
    if(dt<=0)return;
    if(!active){this.clear();return;}
    const before=this.previous??position;
    this.segment.subVectors(position,before);
    const teleported=this.segment.lengthSq()>100;
    const lengthSq=this.segment.x*this.segment.x+this.segment.z*this.segment.z;
    const moving=!teleported&&lengthSq>1e-7&&Math.hypot(velocity.x,velocity.z)>.15;
    this.direction.set(this.segment.x,0,this.segment.z).normalize();
    const speed=Math.min(24,Math.sqrt(lengthSq)/dt);
    for(const source of this.sources){
      const {mesh,inside}=source;let visible=true;
      for(let parent=mesh;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}
      if(!visible){inside.fill(0);continue;}
      mesh.updateWorldMatrix(true,false);
      for(let i=0;i<inside.length;i++){
        if(i>=mesh.count){inside[i]=0;continue;}
        mesh.getMatrixAt(i,this.instance);this.matrix.multiplyMatrices(mesh.matrixWorld,this.instance);this.root.setFromMatrixPosition(this.matrix);
        const length=source.length*Math.hypot(this.matrix.elements[4],this.matrix.elements[5],this.matrix.elements[6]);
        const bottom=this.root.y-length,top=this.root.y;
        const distance=(x,y,z)=>{
          const dy=y+.4-THREE.MathUtils.clamp(y+.4,bottom,top);
          return (x-this.root.x)**2+(z-this.root.z)**2+(dy*.7)**2;
        };
        const now=distance(position.x,position.y,position.z)<CONTACT_RADIUS**2;
        const t=lengthSq>1e-7?THREE.MathUtils.clamp(((this.root.x-before.x)*this.segment.x+(this.root.z-before.z)*this.segment.z)/lengthSq,0,1):1;
        this.contact.copy(before).addScaledVector(this.segment,t);
        const crossed=distance(this.contact.x,this.contact.y,this.contact.z)<CONTACT_RADIUS**2;
        if(moving&&!inside[i]&&crossed&&this.random()<.1){
          // The moving strand reacts at the player's body, not at its undeformed axis.
          const dx=this.root.x-this.contact.x,dz=this.root.z-this.contact.z,distance=Math.hypot(dx,dz),edge=Math.min(.25,distance);
          this.contact.x+=dx/Math.max(.001,distance)*edge;this.contact.z+=dz/Math.max(.001,distance)*edge;
          this.contact.y=THREE.MathUtils.clamp(THREE.MathUtils.clamp(this.contact.y+.4,bottom,top),this.contact.y+.15,this.contact.y+1.05);
          this.spawn(this.contact,this.direction,speed);
        }
        inside[i]=now?1:0;
      }
    }
    if(!this.previous)this.previous=new THREE.Vector3();this.previous.copy(position);
    let count=0;
    for(const p of this.particles){
      if(!p.active)continue;p.age+=dt;
      if(p.age>=p.life){p.active=false;continue;}
      p.position.addScaledVector(p.velocity,dt);p.velocity.multiplyScalar(Math.exp(-dt*1.3));p.velocity.y-=dt*.9;
      p.rotation.x+=p.spin.x*dt;p.rotation.y+=p.spin.y*dt;p.rotation.z+=p.spin.z*dt;
      this.dummy.position.copy(p.position);this.dummy.rotation.set(Math.sin(p.rotation.x)*.45,Math.sin(p.rotation.y)*.55,p.rotation.z);if(this.camera){this.tumble.copy(this.dummy.quaternion);this.dummy.quaternion.copy(this.camera.quaternion).multiply(this.tumble);}this.dummy.scale.set(p.size*p.width,p.size*p.length,p.size);this.dummy.updateMatrix();this.mesh.setMatrixAt(count,this.dummy.matrix);this.mesh.setColorAt(count,p.color);
      this.alpha.setX(count,THREE.MathUtils.smoothstep(p.age,0,.06)*(1-THREE.MathUtils.smoothstep(p.age/p.life,.2,1)));count++;
    }
    this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;this.alpha.needsUpdate=true;
  }
  prepareWarmup(){this.dummy.position.set(0,0,0);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.mesh.setMatrixAt(0,this.dummy.matrix);this.mesh.setColorAt(0,new THREE.Color('white'));this.alpha.setX(0,1);this.mesh.count=1;return this.mesh;}
  clear(){this.previous=null;for(const source of this.sources)source.inside.fill(0);for(const p of this.particles)p.active=false;this.mesh.count=0;}
  dispose(){this.clear();this.mesh.removeFromParent();this.geometry.dispose();this.mesh.material.dispose();}
}
