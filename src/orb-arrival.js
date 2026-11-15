import * as THREE from 'three';

// A camera-facing burst of bright, independently scattered crystal slivers.
const geometry=new THREE.PlaneGeometry(3.8,3.8);
export class OrbArrival {
  constructor(parent,color,seed){
    this.material=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending,uniforms:{age:{value:0},tint:{value:color.clone()},seed:{value:seed}},
      vertexShader:'varying vec2 impactUV;void main(){impactUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 impactUV;uniform float age,seed;uniform vec3 tint;
        void main(){
          float burstDistance=mix(.55,1.08,fract(sin(seed*47.19+3.7)*43758.5453));
          float burstSize=mix(.65,1.40,fract(sin(seed*29.73+9.1)*31917.237));
          vec2 p=(impactUV-.5)*2.;
          float shards=0.,cores=0.;
          for(int i=0;i<12;i++){
            float n=float(i);
            float variation=fract(sin(n*73.13+seed*13.7)*43758.5453);
            float size=fract(sin(n*39.71+seed*7.3)*23421.631);
            float speed=fract(sin(n*91.43+seed*19.1)*31917.237);
            float angle=n*2.39996+seed+(variation-.5)*.65;
            vec2 radial=vec2(cos(angle),sin(angle)),side=vec2(-radial.y,radial.x);
            float t=max(0.,age-size*.035);
            float expand=1.-pow(1.-clamp(t/(.10+speed*.25),0.,1.),3.);
            float travel=.04+expand*(.12+pow(variation,1.4)*.65)*burstDistance;
            vec2 q=vec2(dot(p,radial)-travel,dot(p,side));
            float shrink=1.-smoothstep(.15+variation*.10,.40+size*.16,age);
            float particleSize=burstSize*mix(.60,1.25,fract(sin(n*57.17+seed*11.9)*17917.13));
            float diamond=abs(q.x)/max(.001,(.085+size*.115)*particleSize*(.4+.6*shrink))+abs(q.y)/max(.001,(.026+size*.027)*particleSize*(.4+.6*shrink));
            shards=max(shards,(1.-smoothstep(.65,1.25,diamond))*shrink);
            cores=max(cores,(1.-smoothstep(.05,.45,diamond))*shrink);
          }
          vec3 colour=mix(tint*2.8,vec3(2.6,2.55,2.4),cores*.55);
          gl_FragColor=vec4(colour,shards*.95);
        }`});
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.visible=false;this.mesh.frustumCulled=false;this.mesh.renderOrder=90;this.mesh.layers.set(2);parent.add(this.mesh);
  }
  update(age,camera){this.mesh.visible=true;this.material.uniforms.age.value=age;if(camera)this.mesh.quaternion.copy(camera.quaternion);}
  dispose(){this.mesh.removeFromParent();this.material.dispose();}
}
