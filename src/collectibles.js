import * as THREE from 'three';
import config from './collectibles.json' with {type:'json'};
import {createVisualRandom} from './visual-random.js';

const random=createVisualRandom('gem-idle'),clock={value:0},assets=new Map();
const gemAuraGeometry=new THREE.PlaneGeometry(1.05,1.05);
const contactShadowGeometry=new THREE.PlaneGeometry(1,1);
const contactShadowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false,
  vertexShader:'varying vec2 shadowUV;void main(){shadowUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 shadowUV;void main(){
    float radius=length(shadowUV*2.-1.);
    float alpha=exp(-radius*radius*3.8)*(1.-smoothstep(.50,1.,radius))*.60;
    gl_FragColor=vec4(.003,.004,.008,alpha);
  }`});
const gleamGeometry=new THREE.PlaneGeometry(.27,.27);
const gleamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,uniforms:{gemTime:clock},
  vertexShader:'varying vec2 gleamUV;void main(){gleamUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 gleamUV;uniform float gemTime;void main(){
    vec2 p=abs(gleamUV*2.-1.);
    float rays=pow(max(0.,1.-pow(p.x*p.y, .45)*5.),2.)*(1.-smoothstep(.55,1.,max(p.x,p.y)));
    float core=exp(-dot(p,p)*42.);
    float alpha=(rays*.65+core)*(.75+.25*sin(gemTime*2.4));
    gl_FragColor=vec4(vec3(1.,.98,.91)*1.7,alpha);
  }`});
export const COLLECTIBLES=config;

function gemAssets(definition){
  if(assets.has(definition.id))return assets.get(definition.id);
  const {sides,width,height}=definition,positions=[];
  const rings=[{y:height*.40,r:width*.53},{y:height*.07,r:width},{y:-height*.14,r:width*.94}];
  const point=(ring,j)=>{const a=j/sides*Math.PI*2;return [Math.cos(a)*ring.r,ring.y,Math.sin(a)*ring.r];};
  for(let j=0;j<sides;j++){
    const n=(j+1)%sides;
    positions.push(0,height*.40,0,...point(rings[0],n),...point(rings[0],j));
    for(let k=0;k<2;k++){const a=point(rings[k],j),b=point(rings[k],n),c=point(rings[k+1],j),d=point(rings[k+1],n);positions.push(...a,...b,...c,...b,...d,...c);}
    positions.push(...point(rings[2],j),...point(rings[2],n),0,-height,0);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:definition.color,emissive:definition.color,emissiveIntensity:.20,roughness:.20,metalness:.18,flatShading:true});
  material.onBeforeCompile=shader=>{
    shader.uniforms.gemTime=clock;
    shader.uniforms.gemCrown={value:height*.40};
    shader.vertexShader='varying vec3 vGemPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGemPosition=position;');
    shader.fragmentShader='uniform float gemTime,gemCrown;varying vec3 vGemPosition;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
      float tipGradient=smoothstep(-gemCrown*2.5,gemCrown*.40,vGemPosition.y);
      outgoingLight*=mix(.30,1.,tipGradient);
      vec3 shineDirection=normalize(vec3(sin(gemTime*.43)*.65,.8,1.));
      float facetShine=pow(max(0.,dot(normal,shineDirection)),38.);
      outgoingLight+=vec3(1.,.97,.91)*facetShine*1.5;
      float gleamSpot=(1.-smoothstep(.025,.095,length(vGemPosition.xz-vec2(.05,.04))))*smoothstep(gemCrown-.012,gemCrown,vGemPosition.y);
      outgoingLight+=vec3(1.,.98,.94)*gleamSpot*1.3;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=> 'collectible-faceted-gem-v4';
  const auraMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{tint:{value:new THREE.Color(definition.textColor??definition.color)}},
    vertexShader:`varying vec2 auraUV;void main(){auraUV=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);float scale=length(modelMatrix[0].xyz);center.xy+=position.xy*scale;gl_Position=projectionMatrix*center;}`,
    fragmentShader:`varying vec2 auraUV;uniform vec3 tint;void main(){vec2 p=auraUV*2.-1.;float r=length(p);float alpha=exp(-r*r*4.5)*(1.-smoothstep(.45,1.,r))*.30;gl_FragColor=vec4(tint*1.2,alpha);}`});
  const result={geometry,material,auraMaterial};assets.set(definition.id,result);return result;
}

// Interactive item contract: one collection, reset, reward data and cosmetic pose.
export class Pickable {
  constructor(definition,{s,lane,position}){
    this.type=config.type;this.definition=definition;this.s=s;this.lane=lane;this.taken=false;
    this.o=new THREE.Group();this.o.position.copy(position);this.baseY=position.y;
    const {geometry,material,auraMaterial}=gemAssets(definition);this.gem=new THREE.Mesh(geometry,material);this.o.add(this.gem);
    this.aura=new THREE.Mesh(gemAuraGeometry,auraMaterial);this.aura.frustumCulled=false;this.aura.renderOrder=-1;this.gem.add(this.aura);
    this.shadow=new THREE.Mesh(contactShadowGeometry,contactShadowMaterial);this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=-.025;this.o.add(this.shadow);
    this.gleam=new THREE.Mesh(gleamGeometry,gleamMaterial);this.gleam.position.set(.05,definition.height*.40+.006,.04);this.gleam.rotation.x=-Math.PI/2;this.gem.add(this.gleam);
    this.phase=random()*Math.PI*2;this.speed=.32+random()*.14;
    this.contactPoint=new THREE.Vector3();this.poseMatrix=new THREE.Matrix4();
    this.rollQuaternion=new THREE.Quaternion();this.upAxis=new THREE.Vector3(0,1,0);this.tiltAxis=new THREE.Vector3(0,0,1);
    this.o.userData.pickable={id:definition.id,light:definition.light,points:definition.points,color:definition.color};
    this.update(0);
  }
  collect(){if(this.taken)return false;this.taken=true;return true;}
  reset(){this.drop=null;this.taken=false;this.o.visible=true;this.o.scale.setScalar(1);this.o.rotation.set(0,0,0);this.o.position.y=this.baseY;this.update(0);}
  lightValue(shardHeal){return this.definition.light*shardHeal/config.baseLight;}
  update(time){
    clock.value=time;if(this.taken)return;
    const step=Math.PI*2/this.definition.sides,cycle=(time*1.68+this.phase)/step;
    const face=Math.floor(cycle),u=cycle-face;
    // Dwell slightly on a face, then pass over the edge into the next one.
    const spin=(face+u*.45+(u*u*(3-2*u))*.55)*step;
    this.poseMatrix.makeRotationY(spin);
    let tilt=Math.PI/2;
    const vertices=this.gem.geometry.attributes.position;
    // The actual polygon determines the support angle. A rounded cone would
    // stay level; these broad planar cuts lift and settle over each edge.
    for(let i=0;i<vertices.count;i++){
      this.contactPoint.fromBufferAttribute(vertices,i).applyMatrix4(this.poseMatrix);
      if(this.contactPoint.x<-.00001)tilt=Math.min(tilt,Math.atan2(this.contactPoint.y+this.definition.height,-this.contactPoint.x));
    }
    tilt=Math.max(0,tilt-.001);
    const restingTilt=Math.atan2(this.definition.height*.86,this.definition.width*.94);
    const yaw=this.phase-spin*Math.cos(restingTilt);
    this.gem.quaternion.setFromAxisAngle(this.upAxis,yaw)
      .multiply(this.rollQuaternion.setFromAxisAngle(this.tiltAxis,tilt))
      .multiply(this.rollQuaternion.setFromAxisAngle(this.upAxis,spin));
    this.poseMatrix.makeRotationFromQuaternion(this.gem.quaternion);
    // The bottom cone tip is the fixed pivot, not the model origin.
    // Translate by -R*pivot so the tip stays still through every rotation.
    this.contactPoint.set(0,-this.definition.height,0).applyMatrix4(this.poseMatrix);
    this.gem.position.copy(this.contactPoint).negate();
    this.shadow.position.x=this.gem.position.x;
    this.shadow.position.z=this.gem.position.z;
    this.shadow.rotation.set(-Math.PI/2,0,-yaw);
    this.shadow.scale.set(this.definition.width*3.4,this.definition.width*2.7,1);
    if(this.drop){const elapsed=Math.max(0,time-this.drop.start),y=this.drop.fromY+this.drop.velocity*elapsed-2.45*elapsed*elapsed;this.o.position.x=this.drop.originX+this.drop.drift*elapsed;if(y<=this.baseY){this.o.position.y=this.baseY;this.o.position.x=this.drop.originX+this.drop.drift*Math.sqrt(this.drop.velocity/2.45);this.drop=null;}else this.o.position.y=y; }
    else this.o.position.y=this.baseY;
  }
}

export function createGemPickable(index,placement){return new Pickable(config.variants[index%config.variants.length],placement);}
