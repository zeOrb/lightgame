import {SecretGrass} from './secret-grass.js';
import * as THREE from 'three';
import {applyTowerDepth} from './tower-depth.js';

function roadMaterial(source,repeat){
  const size=128,data=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
  const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const noise=(x,y,period)=>{
    const wrap=n=>((n%period)+period)%period,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(wrap(ix),wrap(iy)),hash(wrap(ix+1),wrap(iy)),u),THREE.MathUtils.lerp(hash(wrap(ix),wrap(iy+1)),hash(wrap(ix+1),wrap(iy+1)),u),v);
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const n=noise(x/32,y/32,4)*.58+noise(x/8,y/8,16)*.27+noise(x/2,y/2,64)*.15;
    const blade=hash(Math.floor(x/2),Math.floor(y/4))>.78&&x%2===0?.13:0;
    const i=(y*size+x)*4,t=THREE.MathUtils.clamp((n-.24)*1.7+blade,0,1);
    data[i]=18+t*43;data[i+1]=60+t*62;data[i+2]=36+t*23;data[i+3]=255;
    height[i]=height[i+1]=height[i+2]=90+n*95+blade*120;height[i+3]=255;
  }
  const texture=(pixels,colour)=>{const map=new THREE.DataTexture(pixels,size,size);map.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1,repeat);map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=8;map.needsUpdate=true;return map;};
  const material=applyTowerDepth(new THREE.MeshStandardMaterial({color:0xffffff,map:texture(data,true),bumpMap:texture(height,false),bumpScale:.018,roughness:1,metalness:0,vertexColors:true}));
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    previous(shader);
    shader.vertexShader='attribute float roadDepth; varying float grassDepth; varying vec2 grassUV; varying vec3 grassWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngrassUV=uv;grassDepth=roadDepth;grassWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`varying float grassDepth;varying vec2 grassUV;varying vec3 grassWorld;
      float grassHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float grassNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(grassHash(i),grassHash(i+vec2(1.,0.)),f.x),mix(grassHash(i+vec2(0.,1.)),grassHash(i+vec2(1.,1.)),f.x),f.y);}
    `+shader.fragmentShader.replace('#include <map_fragment>',`
      vec2 worldGrass=grassWorld.xz+grassWorld.y*vec2(.173,-.109);
      vec2 warp=vec2(grassNoise(worldGrass*.31),grassNoise(worldGrass*.31+vec2(31.2,17.4)))-.5;
      vec2 grassA=worldGrass*.43+warp*.38;
      vec2 grassB=mat2(.7986,.6018,-.6018,.7986)*worldGrass*.217+vec2(7.31,19.87)-warp*.23;
      vec2 grassC=mat2(.3746,-.9272,.9272,.3746)*worldGrass*.731+vec2(41.7,3.6);
      float grassBlend=grassNoise(worldGrass*.19+vec2(8.3,13.7));
      vec4 worldColour=mix(texture2D(map,grassA),texture2D(map,grassB),smoothstep(.18,.82,grassBlend));
      worldColour=mix(worldColour,texture2D(map,grassC),.22);
      diffuseColor*=mix(texture2D(map,vMapUv),worldColour,.8);
      diffuseColor.rgb*=mix(vec3(.77,.85,.88),vec3(1.15,1.13,.96),grassNoise(worldGrass*.37));
      float topMask=1.-step(1.001,grassUV.x);
      float centre=pow(max(0.,sin(clamp(grassUV.x,0.,1.)*3.14159265)),.65);
      diffuseColor.rgb*=mix(vec3(.42,.62,.51),vec3(1.12,1.18,.91),centre*topMask);
      float soilMask=smoothstep(.18,.30,grassDepth+(grassNoise(worldGrass*5.3)-.5)*.20);
      vec2 soilUV=vec2(dot(grassWorld.xz,vec2(.73,.68))*11.,grassDepth*6.+grassWorld.y*.4);
      float soilGrain=grassNoise(soilUV*2.7),soilPatch=grassNoise(worldGrass*2.3);
      vec3 soil=mix(vec3(.18,.075,.026),vec3(.38,.215,.085),soilPatch)*(.80+.34*soilGrain);
      vec2 cell=floor(soilUV),q=fract(soilUV)-.5;
      q+=(vec2(grassHash(cell+3.7),grassHash(cell+17.1))-.5)*.3;
      float stone=(1.-smoothstep(.20,.37,length(q*vec2(1.,1.4))))*step(.72,grassHash(cell));
      soil=mix(soil,vec3(.49,.36,.19),stone*.75)*(1.-grassDepth*.5);
      diffuseColor.rgb=mix(diffuseColor.rgb,soil,soilMask);
    `);
  };
  material.customProgramCacheKey=()=> 'secret-road-turf-soil-v3';return material;
}

// A closed ribbon: the upper surface follows the route's height exactly;
// only its horizontal centre and width receive a small organic variation.
export class SecretRoad {
  constructor(points,material,seed=0){
    this.segments=96;this.revealed=0;this.triangles=[];
    const profile=[[-.90,0],[.90,0],[1.055,-.10],[1.02,-.32],[.76,-.56],[-.72,-.60],[-1.01,-.35],[-1.055,-.10]];
    this.rowStride=profile.length*2;this.indicesPerSegment=profile.length*6;this.capIndexCount=(profile.length-2)*6;this.topTrianglesPerSegment=6;
    const curve=new THREE.CatmullRomCurve3(points),length=curve.getLength(),positions=[],uv=[],indices=[],colours=[],depths=[];
    const centres=[];
    for(let i=0;i<=this.segments;i++){
      const t=-.035+1.07*i/this.segments,u=THREE.MathUtils.clamp(t,0,1),p=curve.getPoint(u),tangent=curve.getTangent(u);tangent.y=0;tangent.normalize();
      p.addScaledVector(tangent,(t-u)*length);
      const normal=new THREE.Vector3(tangent.z,0,-tangent.x),envelope=Math.sin(Math.PI*u)**2;
      const warp=envelope*(Math.sin(u*11+seed)*.65+Math.sin(u*23+seed*1.7)*.22);
      const endDistance=Math.min(i/this.segments,1-i/this.segments);
      const taper=.18+.82*Math.sqrt(THREE.MathUtils.smoothstep(endDistance,0,.07));
      const halfWidth=(1.85+envelope*Math.sin(u*15+seed)*.34)*taper;
      const depthScale=.55+.45*taper;
      p.addScaledVector(normal,warp);
      const ring=profile.map(([x,y],j)=>{
        const lower=Math.min(1,-y/.35),sideWarp=envelope*lower*Math.sin(u*19+seed+j*.7)*.10;
        return p.clone().addScaledVector(normal,x*halfWidth+sideWarp).add(new THREE.Vector3(0,y*depthScale,0));
      });
      centres.push(p.clone());
      for(let edge=0;edge<profile.length;edge++)for(const j of [edge,(edge+1)%profile.length]){
        const v=ring[j];positions.push(v.x,v.y,v.z);
        const depth=THREE.MathUtils.clamp(-profile[j][1]/.6,0,1),light=1-depth*.76;depths.push(depth);
        colours.push(light*(edge===0?1:.66),light*(edge===0?1:.78),light*(edge===0?1:.60));
      }
      if(i){const a=(i-1)*this.rowStride,b=i*this.rowStride;for(let edge=0;edge<profile.length;edge++){const j=edge*2;indices.push(a+j,b+j,a+j+1,a+j+1,b+j,b+j+1);}}

    }
    const distances=[0];for(let i=1;i<centres.length;i++)distances.push(distances[i-1]+centres[i].distanceTo(centres[i-1]));
    const total=distances.at(-1);
    // Top: U across, V along. Bottom and walls have their own straight UV islands.
    let island=0;const columns=[];
    for(let edge=0;edge<profile.length;edge++){
      const next=(edge+1)%profile.length,span=edge===0?1:Math.hypot(profile[next][0]-profile[edge][0],(profile[next][1]-profile[edge][1])/1.85)*.5;
      columns.push(island,island+span);island+=span+.08;
    }
    for(let i=0;i<=this.segments;i++)for(const u of columns)uv.push(u,distances[i]/total);
    for(const end of [0,this.segments*this.rowStride]){
      const base=positions.length/3;
      for(let j=0;j<profile.length;j++){
        const source=end+j*2;positions.push(...positions.slice(source*3,source*3+3));uv.push(4+(profile[j][0]+1)*.5,-profile[j][1]);colours.push(.40,.54,.36);depths.push(THREE.MathUtils.clamp(-profile[j][1]/.6,0,1));
      }
      for(let j=1;j<profile.length-1;j++)if(end===0)indices.push(base,base+j,base+j+1);else indices.push(base,base+j+1,base+j);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('uv1',geometry.attributes.uv.clone());geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));geometry.setAttribute('roadDepth',new THREE.Float32BufferAttribute(depths,1));geometry.setIndex(indices);geometry.computeVertexNormals();
    const normals=geometry.attributes.normal,n=new THREE.Vector3(),m=new THREE.Vector3();
    for(let row=0;row<=this.segments;row++)for(let j=0;j<profile.length;j++){
      const a=row*this.rowStride+j*2,b=row*this.rowStride+((j+profile.length-1)%profile.length)*2+1;
      n.fromBufferAttribute(normals,a);m.fromBufferAttribute(normals,b);n.add(m).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);
    }
    geometry.computeBoundingSphere();
    this.mesh=new THREE.Mesh(geometry,roadMaterial(material,total/3));this.mesh.visible=false;this.mesh.userData.secretStep=true;
    const vector=i=>new THREE.Vector3().fromArray(positions,i*3);
    for(let i=0;i<this.segments;i++){const a=i*this.rowStride,b=(i+1)*this.rowStride;for(const edge of [0,1,7]){const j=edge*2;this.triangles.push([vector(a+j),vector(b+j),vector(a+j+1)],[vector(a+j+1),vector(b+j),vector(b+j+1)]);}}
    this.grass=new SecretGrass(this,seed,total/3);
    this.ray=new THREE.Ray();this.result=new THREE.Vector3();this.from=new THREE.Vector3();this.direction=new THREE.Vector3();
  }
  reveal(amount){this.revealed=Math.min(this.segments,Math.floor(amount*this.segments));this.mesh.visible=this.revealed>0;this.grass.reveal(this.revealed);this.mesh.geometry.setDrawRange(0,this.revealed*this.indicesPerSegment+(amount>=1?this.capIndexCount:0));}
  heightAt(p){
    this.ray.origin.set(p.x,this.mesh.geometry.boundingSphere.center.y+this.mesh.geometry.boundingSphere.radius+1,p.z);this.ray.direction.set(0,-1,0);
    for(let i=0;i<this.revealed*this.topTrianglesPerSegment;i++){const tri=this.triangles[i];if(this.ray.intersectTriangle(...tri,false,this.result))return this.result.y;}
    return null;
  }
  landing(beforeY,afterY,p,before){
    this.from.set(before.x,beforeY,before.z);this.direction.set(p.x-before.x,afterY-beforeY,p.z-before.z);const length=this.direction.length();if(length<1e-8)return null;
    this.ray.set(this.from,this.direction.divideScalar(length));let nearest=Infinity,y=null;
    for(let i=0;i<this.revealed*this.topTrianglesPerSegment;i++){if(this.ray.intersectTriangle(...this.triangles[i],true,this.result)){const d=this.result.distanceTo(this.from);if(d<=length+1e-5&&d<nearest){nearest=d;y=this.result.y;}}}return y;
  }
}
