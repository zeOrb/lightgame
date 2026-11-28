import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROUTE_RADIUS} from './game.js';
import {thornFootprint} from './threats.js';
import {applyTowerDepth} from './tower-depth.js';
import {createVisualRandom} from './random-manager.js';

// Each ring carries its distance along the shoot, including the barbs attached to it.
function shoot(curve, segments, radius, colors, progress, stemCurve, pathIndex){
  const sides=7;
  const geometry=new THREE.TubeGeometry(curve,segments,1,sides,false);
  const positions=geometry.attributes.position;
  const tint=[],growth=[],anchors=[],rows=[];
  const vertex=new THREE.Vector3(),color=new THREE.Color();
  for(let i=0;i<=segments;i++){
    const t=i/segments,center=curve.getPointAt(t);
    for(let j=0;j<=sides;j++){
      const index=i*(sides+1)+j;
      vertex.fromBufferAttribute(positions,index).sub(center)
        .multiplyScalar(radius*Math.pow(1-t,.72)).add(center);
      positions.setXYZ(index,vertex.x,vertex.y,vertex.z);
      color.copy(colors[0]).lerp(colors[1],.64*t+.30*Math.max(0,Math.cos(j*2*Math.PI/sides+t*5)));
      color.lerp(new THREE.Color('#08070d'),THREE.MathUtils.smoothstep(progress(t),.65,1));
      tint.push(color.r,color.g,color.b);
      growth.push(progress(t));
      const anchor=stemCurve.getPointAt(progress(t));
      anchors.push(anchor.x,anchor.y,anchor.z);
      rows.push(pathIndex);
    }
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(tint,3));
  geometry.setAttribute('growthAt',new THREE.Float32BufferAttribute(growth,1));
  geometry.setAttribute('stemAnchor',new THREE.Float32BufferAttribute(anchors,3));
  geometry.setAttribute('pathIndex',new THREE.Float32BufferAttribute(rows,1));
  return geometry;
}

export function createThornVines(section,spiral=false){
  const {inner,outer,angle}=thornFootprint(section);
  const pieces=[],stem=['#29391b','#a6af38'].map(c=>new THREE.Color(c));
  const barb=['#596022','#ead65d'].map(c=>new THREE.Color(c));
  function point(radial,across,y){
    const radius=THREE.MathUtils.lerp(inner,outer,radial),theta=across*angle;
    return new THREE.Vector3(radius*Math.cos(theta)-ROUTE_RADIUS,y,radius*Math.sin(theta));
  }
  const rootLayout=[
    [-.76,-.52,.23],[.02,-.76,.14],[.73,-.45,.19],
    [.74,.49,.13],[.05,.77,.21],[-.73,.48,.16],
    [-.28,-.04,.12],[.30,.10,.17]
  ];
  const samples=64,outerCount=spiral?5:6,count=spiral?5:rootLayout.length;
  const paths=new Float32Array(samples*count*4);
  for(let i=0;i<count;i++){
    const phase=i*2.4+section*.67;
    const curl=.76+.14*Math.sin(phase*2);
    const height=1.2+.35*Math.cos(phase);
    const central=i>=outerCount;
    const stemRadius=spiral?.24+.035*Math.sin(phase):rootLayout[i][2];
    const points=Array.from({length:15},(_,k)=>{
      const t=k/14;
      if(!spiral){
        const [rootX,rootZ]=rootLayout[i];
        const baseAngle=Math.atan2(rootZ,rootX);
        const bend=(.85+.65*(.5+.5*Math.sin(phase)))*t*t+.12*Math.sin(4*t+phase)*t*t;
        const baseRadius=Math.hypot(rootX,rootZ);
        const tipRadius=central?.12:.17+.15*(.5+.5*Math.sin(phase));
        const spread=THREE.MathUtils.lerp(baseRadius,tipRadius,t*t)+.035*Math.sin(Math.PI*t);
        return point(.5+.47*spread*Math.cos(baseAngle+bend),spread*Math.sin(baseAngle+bend),
          -.19+(height+(central?.69:.35))*t+.035*Math.sin(phase+t*5)*t);
      }
      const turn=phase+t*t*(3-2*t)*Math.PI*2*curl;
      const spread=.45+.48*Math.sin(t*Math.PI)-.18*t+.06*Math.sin(phase+9*t);
      return point(.5+.47*spread*Math.cos(turn),spread*Math.sin(turn),
        -.19+height*t+.14*Math.sin(t*Math.PI*2+phase)*t);
    });
    const curve=new THREE.CatmullRomCurve3(points);
    curve.getSpacedPoints(samples-1).forEach((p,j)=>p.toArray(paths,(i*samples+j)*4));
    pieces.push(shoot(curve,40,stemRadius,stem,t=>t,curve,i));
    for(let j=1;j<=10;j++){
      const t=j/12,base=curve.getPointAt(t),side=j%2?1:-1;
      const tangent=curve.getTangentAt(t);
      const outward=new THREE.Vector3(-tangent.z,.65,tangent.x).normalize();
      outward.x*=side;outward.z*=side;
      const thornScale=spiral?1:.6+stemRadius*1.6;
      const mid=base.clone().addScaledVector(outward,.27*thornScale);
      const tip=mid.clone().addScaledVector(tangent,-.18*thornScale);
      pieces.push(shoot(new THREE.QuadraticBezierCurve3(base,mid,tip),5,.105*thornScale,barb,()=>t,curve,i));
    }
  }
  if(!spiral){
    const random=createVisualRandom('floor-thorns-'+section);
    for(let j=0;j<36;j++){
      const phase=random()*Math.PI*2;
      const radial=.08+.84*random();
      const across=(random()*2-1)*.84;
      const base=point(radial,across,.015);
      const size=.12+.30*random();
      const lean=.2+.65*random();
      const mid=base.clone().add(new THREE.Vector3(
        Math.cos(phase)*size*lean*.25,size*.65,Math.sin(phase)*size*lean*.25));
      const tip=base.clone().add(new THREE.Vector3(
        Math.cos(phase)*size*lean,size,Math.sin(phase)*size*lean));
      const floorThorn=shoot(new THREE.QuadraticBezierCurve3(base,mid,tip),
        5,size*(.26+.15*random()),barb,t=>t,
        new THREE.LineCurve3(base,base),0);
      floorThorn.attributes.pathIndex.array.fill(-1);
      pieces.push(floorThorn);
    }
  }
  const growth={value:0},swayClock={value:0};
  const pathTexture=new THREE.DataTexture(paths,samples,count,THREE.RGBAFormat,THREE.FloatType);
  pathTexture.needsUpdate=true;
  const material=applyTowerDepth(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.68}));
  const depthShader=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    depthShader(shader);
    shader.uniforms.vineGrowth=growth;
    shader.uniforms.vineSwayClock=swayClock;
    shader.uniforms.vinePaths={value:pathTexture};
    shader.vertexShader=`uniform float vineGrowth;
      uniform float vineSwayClock;
      uniform sampler2D vinePaths;
      attribute float growthAt;
      attribute float pathIndex;
      attribute vec3 stemAnchor;
      varying float vineTip;
      varying float floorThornMask;
    `+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vineTip=growthAt;
      floorThornMask=pathIndex<0.?1.:0.;
      float growthProgress=clamp((vineGrowth-.12)/.88,0.,1.);
      float impactGrowth=1.-pow(1.-growthProgress,3.);
      float impactKick=sin(growthProgress*3.14159265)*exp(-growthProgress*3.)*.32;
      float pathStep=growthAt*(.12+.88*impactGrowth)*${samples-1}.0;
      ivec2 cell=ivec2(int(pathStep),max(0,int(pathIndex)));
      vec3 a=texelFetch(vinePaths,cell,0).xyz;
      vec3 b=texelFetch(vinePaths,ivec2(min(cell.x+1,${samples-1}),cell.y),0).xyz;
      transformed=mix(a,b,fract(pathStep))+(position-stemAnchor)*sqrt(.12+.88*impactGrowth);
      transformed.y+=impactKick*growthAt;
      if(pathIndex<0.){
        transformed=position;
        float phase=stemAnchor.x*19.+stemAnchor.z*13.;
        float tipWeight=growthAt*growthAt;
        transformed.x+=sin(vineSwayClock*1.7+phase)*.10*tipWeight;
        transformed.z+=cos(vineSwayClock*1.35+phase)*.085*tipWeight;
      }`);
    shader.fragmentShader='varying float vineTip; varying float floorThornMask;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance*=1.-floorThornMask;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
      float tipShade=smoothstep(0.,.72,vineTip);
      gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.009,.006,.015),tipShade*.98);`);
  };
  material.customProgramCacheKey=()=>'thorn-vine-floor-thorns-sway-v6';
  material.addEventListener('dispose',()=>pathTexture.dispose());
  const mesh=new THREE.Mesh(mergeGeometries(pieces),material);
  pieces.forEach(piece=>piece.dispose());
  const shadowGeometry=new THREE.BufferGeometry();
  const shadowPositions=[],shadowPaths=[],shadowOffsets=[],shadowSizes=[],shadowLifetimes=[];
  for(let i=0;i<count;i++)for(let j=0;j<7;j++){
    const index=(i*samples+Math.floor(samples*(.48+j*.07)))*4;
    shadowPositions.push(paths[index],paths[index+1]+.04,paths[index+2]);
    shadowPaths.push(i);
    shadowOffsets.push(j/7);
    shadowSizes.push(.3+.7*Math.random()**2);
    shadowLifetimes.push(.15+Math.random()*.85);
  }
  shadowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(shadowPositions,3));
  shadowGeometry.setAttribute('smokePath',new THREE.Float32BufferAttribute(shadowPaths,1));
  shadowGeometry.setAttribute('smokeOffset',new THREE.Float32BufferAttribute(shadowOffsets,1));
  shadowGeometry.setAttribute('smokeSize',new THREE.Float32BufferAttribute(shadowSizes,1));
  shadowGeometry.setAttribute('smokeLifetime',new THREE.Float32BufferAttribute(shadowLifetimes,1));
  const shadowMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{clock:{value:0},strength:{value:0},vineGrowth:growth,vinePaths:{value:pathTexture}},
    vertexShader:`uniform float clock;
      uniform float vineGrowth;
      uniform sampler2D vinePaths;
      attribute float smokePath;
      attribute float smokeOffset;
      attribute float smokeSize;
      attribute float smokeLifetime;
      varying float particleLifetime;
      varying float particleGrowth;
      void main(){
        particleLifetime=smokeLifetime;
        particleGrowth=clamp((vineGrowth-.12)/.88,0.,1.);
        float progress=clamp((vineGrowth-.12)/.88,0.,1.);
        float pathStep=progress*(.83+.17*smokeOffset)*${samples-1}.0;
        ivec2 cell=ivec2(int(pathStep),int(smokePath));
        vec3 a=texelFetch(vinePaths,cell,0).xyz;
        vec3 b=texelFetch(vinePaths,ivec2(min(cell.x+1,${samples-1}),cell.y),0).xyz;
        vec3 p=mix(a,b,fract(pathStep));
        float phase=smokePath*13.+smokeOffset*7.;
        float age=fract(clock*.32+phase);
        p.x+=sin(clock*.8+phase)*(.08+age*.17);
        p.z+=cos(clock*.65+phase)*(.08+age*.17);
        p.y+=.08+age*.12;
        vec4 view=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*view;
        gl_PointSize=clamp(950./max(1.,-view.z),8.,85.)*smokeSize;
      }`,
    fragmentShader:`uniform float strength;
      varying float particleLifetime;
      varying float particleGrowth;
      void main(){
        vec2 p=gl_PointCoord*2.-1.;
        float edge=length(p)+.07*sin(p.x*9.+p.y*6.);
        float falloff=exp(-edge*edge*4.)*(1.-smoothstep(.65,1.,edge));
        float earlyFade=1.-smoothstep(particleLifetime,min(1.,particleLifetime+.22),particleGrowth);
        float lateFade=smoothstep(1.-particleLifetime,1.,strength/.24);
        float particleFade=mix(earlyFade,lateFade,smoothstep(.65,.85,particleLifetime));
        gl_FragColor=vec4(.035,.022,.065,falloff*strength*particleFade);
      }`
  });
  const shadow=new THREE.Points(shadowGeometry,shadowMaterial);
  shadow.renderOrder=2;
  mesh.add(shadow);
  return {mesh,growth,updateShadow(time,strength=0){
    swayClock.value=time;
    shadowMaterial.uniforms.clock.value=time;
    shadowMaterial.uniforms.strength.value=strength*.24;
  }};
}
