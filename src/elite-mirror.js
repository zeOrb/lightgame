import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {route} from './game.js';
import {createVisualRandom} from './visual-random.js';

export class EliteMirror {
  constructor(scene,ward){
    this.ward=ward;this.root=new THREE.Group();scene.add(this.root);
    const p=route(ward.s);this.root.position.set(p.x,p.y+1.32,p.z);this.root.rotation.y=-p.theta-Math.PI/4;
    this.glass=new Reflector(new THREE.PlaneGeometry(3.65,2.55),{textureWidth:512,textureHeight:512,color:0xb8c7cd,clipBias:.004,multisample:0});
    // A mirror is a solid surface: fog and focus must use its own depth.
    this.glass.material.depthWrite=true;this.root.add(this.glass);
    const reflect=this.glass.onBeforeRender;
    this.glass.onBeforeRender=(renderer,world,camera)=>{
      // Capture the mirror plane in the depth prepass without recursively
      // rendering a reflected scene with the depth override material.
      if(world.overrideMaterial)return;
      const hidden=[];
      world.traverse(o=>{if(o.visible&&(o.material?.uniforms?.sceneDepth||o.userData.foreground)){hidden.push(o);o.visible=false;}});
      this.glass.getReflectionCamera(camera).layers.enable(2);
      try{reflect.call(this.glass,renderer,world,camera);}finally{for(const o of hidden)o.visible=true;}
    };
    const bronze=new THREE.MeshStandardMaterial({color:'#c39a56',metalness:.5,roughness:.3});
    const silver=new THREE.MeshBasicMaterial({color:'#bedde2',fog:false,toneMapped:false});
    const wood=new THREE.MeshStandardMaterial({color:'#37251d',roughness:.8});
    const bar=(x,y,w,h,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.16),mat);m.position.set(x,y,0);this.root.add(m);};
    for(const side of [-1,1]){bar(side*1.92,0,.23,2.95,wood);bar(side*1.84,0,.075,2.72,silver);bar(0,side*1.38,4.05,.21,wood);bar(0,side*1.3,3.8,.075,silver);}
    for(let i=0;i<9;i++){
      const ornament=new THREE.Mesh(new THREE.TorusGeometry(.11+(i===4?.1:0),.025,5,12),bronze);
      ornament.position.set((i-4)*.39,1.49+Math.sin(i/8*Math.PI)*.13,.03);this.root.add(ornament);
    }
    this.shards=new THREE.InstancedMesh(new THREE.CircleGeometry(1,3),new THREE.MeshBasicMaterial({color:'#d4ecff',side:THREE.DoubleSide,transparent:true,depthWrite:false,toneMapped:false}),40);
    this.shards.frustumCulled=false;this.shards.visible=false;this.root.add(this.shards);
    this.dummy=new THREE.Object3D();const random=createVisualRandom('elite-mirror');
    this.particles=Array.from({length:40},()=>({x:(random()-.5)*3.5,y:(random()-.5)*2.45,vx:(random()-.5)*3,vy:1+random()*3,vz:(random()-.5)*4,spin:random()*9,size:.08+random()*.2}));
    this.age=2;this.normal=new THREE.Vector3();this.toCamera=new THREE.Vector3();
  }
  shatter(){this.age=0;this.glass.visible=false;this.shards.visible=true;}
  reset(){this.ward.reset();this.age=2;this.shards.visible=false;this.glass.visible=true;}
  update(dt,camera,playerS){
    this.glass.visible=this.ward.protected;
    if(this.glass.visible){
      this.root.updateMatrixWorld();this.normal.set(0,0,1).transformDirection(this.root.matrixWorld);
      this.toCamera.copy(camera.position).sub(this.root.position);
      this.glass.rotation.y=this.toCamera.dot(this.normal)<0?Math.PI:0;
    }
    if(this.age>=1.1)return;this.age+=dt;
    const t=this.age;this.shards.material.opacity=Math.max(0,1-t/1.1);
    this.particles.forEach((p,i)=>{
      this.dummy.position.set(p.x+p.vx*t,p.y+p.vy*t-4*t*t,.08+p.vz*t);
      this.dummy.rotation.set(t*p.spin,t*p.spin*.7,i);this.dummy.scale.setScalar(p.size*Math.max(0,1-t/1.1));this.dummy.updateMatrix();this.shards.setMatrixAt(i,this.dummy.matrix);
    });this.shards.instanceMatrix.needsUpdate=true;if(t>=1.1)this.shards.visible=false;
  }
}
