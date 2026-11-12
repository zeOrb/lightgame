import * as THREE from 'three';
import { visualSample } from './visual-random.js';

// A single draw call of soft, overlapping billboards gives the air some volume.
export class TowerMist {
  constructor(scene){
    this.depthTarget=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
    this.depthTarget.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    this.depthMaterial=new THREE.MeshDepthMaterial();
    this.bufferSize=new THREE.Vector2();
    this.material=new THREE.ShaderMaterial({
      uniforms:{clock:{value:0},topColor:{value:new THREE.Color('#d1bb98')},bottomColor:{value:new THREE.Color('#081831')},night:{value:0},arenaMode:{value:0},arenaFloorY:{value:0},arenaRadius:{value:0},sceneDepth:{value:this.depthTarget.depthTexture},resolution:{value:new THREE.Vector2(1,1)},cameraRange:{value:new THREE.Vector2(.1,240)}},
      transparent:true,depthWrite:false,
      vertexShader:`uniform float clock;varying vec2 mistUV;varying vec3 samplePosition;varying float worldHeight;varying float viewDistance;varying float mistDepth;varying float seed;
        void main(){mistUV=uv;vec4 world=modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);worldHeight=world.y;seed=world.y*.37;
        world.x+=sin(clock*.075+seed)*.8;world.z+=cos(clock*.06+seed)*.8;
        world.y+=sin(clock*.11+seed)*1.35+sin(clock*.047+seed*2.1)*.55;worldHeight=world.y;
        vec4 view=viewMatrix*world;viewDistance=length(view.xyz);mistDepth=-view.z;
        vec2 size=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
        samplePosition=world.xyz+right*position.x*size.x+up*position.y*size.y;
        view.xy+=position.xy*size;gl_Position=projectionMatrix*view;}`,
      fragmentShader:`uniform float clock;uniform vec3 topColor;uniform vec3 bottomColor;uniform float night;uniform float arenaMode,arenaFloorY,arenaRadius;uniform sampler2D sceneDepth;uniform vec2 resolution;uniform vec2 cameraRange;uniform mat4 inverseProjection,cameraWorld;varying vec2 mistUV;varying vec3 samplePosition;varying float worldHeight;varying float viewDistance;varying float mistDepth;varying float seed;
        vec3 gradient(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return -1.0+2.0*fract((p.xxy+p.yxx)*p.zyx);}
        float perlin(vec3 p){vec3 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.0-15.0)+10.0);
          return mix(mix(mix(dot(gradient(i),f),dot(gradient(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(gradient(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(gradient(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),mix(mix(dot(gradient(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(gradient(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(gradient(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(gradient(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
        float fbm(vec3 p){return perlin(p)*.58+perlin(p*2.03+13.7)*.29+perlin(p*4.11+31.2)*.13;}
        void main(){
        vec2 screen=gl_FragCoord.xy/resolution;float depth=texture2D(sceneDepth,screen).x;
        if(arenaMode>.5&&depth<.99999){
          vec4 view=inverseProjection*vec4(screen*2.-1.,depth*2.-1.,1.);view/=view.w;
          vec3 surface=(cameraWorld*view).xyz;
          float maskRadius=abs(surface.y-arenaFloorY)<.06?arenaRadius+.03:arenaRadius-.65;
          if(length(surface.xz)<=maskRadius&&surface.y>=arenaFloorY-.4&&surface.y<=arenaFloorY+4.2)discard;
        }
        vec2 p=mistUV*2.0-1.0;float edge=pow(max(0.0,1.0-dot(p,p)),1.45);
        vec3 flow=samplePosition*vec3(.24,.43,.24)+vec3(clock*.025,-clock*.055,clock*.012);
        flow.y+=perlin(samplePosition*vec3(.09,.08,.09)+vec3(0.0,clock*.012,0.0))*.85;
        float noise=fbm(flow);float cloud=smoothstep(.13,.84,.5+noise*1.4);
        float height=smoothstep(16.0,103.0,worldHeight);float density=mix(.46,.32,height);
        float verticalPockets=perlin(samplePosition*vec3(.065,.21,.065)+vec3(0.0,-clock*.025,7.1));
        density*=mix(.3,1.5,smoothstep(-.28,.3,verticalPockets));
        float nearFade=smoothstep(1.5,5.0,viewDistance);float farFade=1.0-smoothstep(80.0,140.0,viewDistance);
        float surfaceDepth=cameraRange.x*cameraRange.y/(cameraRange.y-depth*(cameraRange.y-cameraRange.x));
        float contactFade=smoothstep(0.0,1.35,max(0.0,surfaceDepth-mistDepth));
        float below=max(1.0-height,smoothstep(9.0,34.0,cameraPosition.y-samplePosition.y));
        float warmth=smoothstep(.72,1.0,1.0-below)*(1.0-night);
        vec3 cool=mix(bottomColor,vec3(.035,.07,.14),1.0-below);
        vec3 color=mix(cool,topColor,warmth);
        gl_FragColor=vec4(color,edge*cloud*density*nearFade*farFade*contactFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    this.material.uniforms.inverseProjection={value:new THREE.Matrix4()};
    this.material.uniforms.cameraWorld={value:new THREE.Matrix4()};
    this.mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),this.material,96);
    const dummy=new THREE.Object3D();
    for(let i=0;i<96;i++){
      const random=offset=>visualSample('mist',i*8+offset);
      const level=Math.floor(i/4),angle=(i%4)*Math.PI/2+level*.41,radius=10.5+(i%3)*1.1;
      dummy.position.set(Math.cos(angle)*radius,8+level*4.7+(random(1)-.5)*5.8,Math.sin(angle)*radius);
      const tall=i%4===1;
      dummy.scale.set(tall?8+random(2)*5:16+random(2)*7,tall?13+random(3)*7:4.5+random(3)*7,1);
      dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate=true;this.mesh.frustumCulled=false;this.mesh.renderOrder=-1;scene.add(this.mesh);
  }
  update(time,night=false,arena=null){this.material.uniforms.clock.value=time;this.material.uniforms.night.value=night?1:0;this.material.uniforms.arenaMode.value=arena?1:0;this.material.uniforms.arenaFloorY.value=arena?.y??0;this.material.uniforms.arenaRadius.value=arena?.radius??0;}
  renderDepth(renderer,scene,camera){
    camera.updateMatrixWorld();
    this.material.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
    this.material.uniforms.cameraWorld.value.copy(camera.matrixWorld);
    renderer.getDrawingBufferSize(this.bufferSize);
    if(this.depthTarget.width!==this.bufferSize.x||this.depthTarget.height!==this.bufferSize.y)this.depthTarget.setSize(this.bufferSize.x,this.bufferSize.y);
    this.material.uniforms.resolution.value.copy(this.bufferSize);
    this.material.uniforms.cameraRange.value.set(camera.near,camera.far);
    const hidden=[],previousMaterial=scene.overrideMaterial,previousTarget=renderer.getRenderTarget();
    // Only solid surfaces belong in the depth buffer. VFX must not erase fog.
    scene.traverse(object=>{
      const transparent=object.material&&(Array.isArray(object.material)?object.material.some(m=>m.transparent):object.material.transparent);
      if(object.visible&&(object.isSprite||object.isPoints||transparent)){hidden.push(object);object.visible=false;}
    });
    try{
      scene.overrideMaterial=this.depthMaterial;renderer.setRenderTarget(this.depthTarget);renderer.clear();renderer.render(scene,camera);
    }finally{
      scene.overrideMaterial=previousMaterial;renderer.setRenderTarget(previousTarget);for(const object of hidden)object.visible=true;
    }
  }
}
