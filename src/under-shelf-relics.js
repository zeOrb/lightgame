import * as THREE from 'three';
import {createVisualRandom} from './random-manager.js';
import {shelfInnerRadius,SHELF_OUTER_RADIUS} from './game.js';
import {applyTowerDepth} from './tower-depth.js';

export function applyMetalGradient(material,geometry,wood=false){
  geometry.computeBoundingBox();const extent=geometry.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(.5),previous=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,...args){
    previous.call(this,shader,...args);shader.uniforms.metalExtent={value:extent};
    shader.vertexShader='uniform vec3 metalExtent;varying float metalVertical;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      mat3 metalBasis=mat3(modelMatrix);
      #ifdef USE_INSTANCING
        metalBasis*=mat3(instanceMatrix);
      #endif
      float metalHalfHeight=max(.001,dot(abs(vec3(metalBasis[0].y,metalBasis[1].y,metalBasis[2].y)),metalExtent));
      metalVertical=clamp(.5+(metalBasis*position).y/(metalHalfHeight*2.),0.,1.);`);
    const fade=wood?`float timberTop=smoothstep(0.,.95,metalVertical);
      float timberLuma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
      gl_FragColor.rgb=mix(vec3(timberLuma),gl_FragColor.rgb,mix(.45,1.,timberTop))*mix(.42,1.,timberTop);`:'gl_FragColor.rgb*=mix(.30,1.,smoothstep(0.,.88,metalVertical));';
    shader.fragmentShader='varying float metalVertical;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\n'+fade);
  };
  material.customProgramCacheKey=()=>wood?'tower-timber-vertical-fade-v1':'tower-metal-vertical-fade-v1';return material;
}

export function applyRopeSway(material,clock){
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,...args){
    previous.call(this,shader,...args);shader.uniforms.ropeClock=clock;
    shader.vertexShader='uniform float ropeClock;attribute vec4 ropeWind;attribute vec4 ropeAxis;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      float ropeT=clamp(ropeWind.x+position.y*ropeWind.y,0.,1.);
      float ropeMask=mix(sin(ropeT*3.14159265),ropeT*ropeT,ropeAxis.w);
      float ropeWave=sin(ropeClock*.72+ropeWind.z)*.7+sin(ropeClock*1.13+ropeWind.z*.63)*.3;
      vec3 ropeOffset=ropeAxis.xyz*ropeWave*ropeWind.w*4.0*ropeMask;
      mvPosition.xyz+=(viewMatrix*modelMatrix*vec4(ropeOffset,0.)).xyz;
      gl_Position=projectionMatrix*mvPosition;`);
  };
  material.customProgramCacheKey=()=> 'tower-rope-sway-v1';return material;
}

export class UnderShelfRelics {
  constructor(scene){this.scene=scene;this.parts=Array.from({length:5},()=>[]);this.dynamic=[];this.matrix=new THREE.Matrix4();this.previousStyle=-1;this.windTime={value:0};}
  addShelf(group,section,moving=false,random=createVisualRandom('shelf-relics:'+section)){
    const inner=shelfInnerRadius(section),up=new THREE.Vector3(0,1,0);
    let style=Math.floor(random()*6);if(style===this.previousStyle)style=(style+1+Math.floor(random()*5))%6;this.previousStyle=style;
    const v=(x,y,z)=>new THREE.Vector3(x,y,z),pick=values=>values[Math.floor(random()*values.length)];
    const wood=()=>new THREE.Color(pick(['#c59b71','#a98c72','#bf9d79','#9b8168','#d1b08a']));
    // Dark patina carries the structure; occasional worn paint keeps the salvage character.
    const iron=()=>{const painted=random()<.20;return new THREE.Color(pick(painted?['#896353','#52756e','#596c7d','#8a7853']:['#625e53','#535f55','#5b5d58','#675b4e'])).multiplyScalar(.95+random()*.35);};
    const add=(kind,position,quaternion,scale,color)=>{if(kind===3){scale.x*=1.5;scale.z*=1.5;}const part={group,moving,style,kind,local:new THREE.Matrix4().compose(position,quaternion,scale),color};this.parts[kind].push(part);return part;};
    const beam=(a,b,width=.18,depth=width,kind=0)=>{if(kind===0&&random()<.30)kind=1;const delta=b.clone().sub(a),part=add(kind,a.clone().add(b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,delta.clone().normalize()),v(width,delta.length(),depth),kind===0?wood():kind===3?new THREE.Color('#b49a73'):iron());if(kind===3)part.wind={center:.5,span:1,phase:random()*Math.PI*2,amplitude:.035+random()*.04,axis:v(1,0,0)};return part;};
    const band=(p,width=.25)=>add(1,p,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,random()*.3,random()*.12)),v(width,.09,.29),iron());
    const ring=(p,size=.10)=>add(2,p,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.PI/2+random()*.5,random()*.3)),v(size,size,size),iron());
    const root=inner+.20+random()*.25,span=Math.min(2.5,SHELF_OUTER_RADIUS-root-.3),bottom=-1.25-random()*1.55,z=(random()-.5)*.25;
    // Every kit has a convincing load-bearing attachment under the tread.
    beam(v(root,-.38,-.91),v(root+.15,-.48,.91),.22,.22);
    if(style===0){ // Cantilever: two mismatched triangular brackets.
      for(const side of [-1,1]){const tz=z+side*(.58+random()*.13),low=v(root-.18,bottom,tz);
        beam(v(root,-.40,tz),low,.21);beam(low,v(root+span,-.38,tz+.10),.16,.20);
        beam(v(root,-.44,tz),v(root+span,-.44,tz),.17);band(low.clone().add(v(0,.24,0)));}
    }else if(style===1){ // Cross-braced timber frame.
      const a=v(root-.12,bottom,-.78),b=v(root+.18,bottom+.35,.78);
      beam(v(root,-.42,-.80),a,.23);beam(v(root+.15,-.42,.80),b,.18);
      beam(a,v(root+.10,-.52,.75),.13);beam(b,v(root-.06,-.62,-.76),.11);
      beam(a,b,.17);band(a.clone().lerp(b,.5),.34);ring(a.clone().add(v(0,-.16,0)),.13);
    }else if(style===2){ // Small salvaged scaffold suspended on ropes.
      for(const tz of [-.68,.68]){beam(v(root+.08,-.38,tz),v(root-.40,bottom,tz+.08),.045,.045,3);
        beam(v(root-.72,bottom,tz),v(root+.55,bottom,tz),.16);ring(v(root+.08,-.52,tz));}
      for(let i=0;i<4;i++){const tz=-.72+i*.46;beam(v(root-.61,bottom+.08,tz),v(root+.47,bottom+.08+random()*.06,tz+.10),.20,.10);}
      beam(v(root+.45,-.43,.68),v(root-.64,bottom,-.68),.12);
    }else if(style===3){ // Repaired uneven ribs, with a metal splice.
      const tips=[];for(let i=0;i<3;i++){const tz=-.78+i*.75,end=v(root-.15-random()*.50,bottom-random()*.60,tz+.18);
        beam(v(root+.12,-.40,tz),end,.16+random()*.08,.15);band(end.clone().lerp(v(root,-.45,tz),.58));tips.push(end);}
      beam(tips[0].clone().lerp(v(root,-.4,-.8),.40),tips[2].clone().lerp(v(root,-.4,.7),.20),.14);
    }else if(style===4){ // Sparse long hanger and a crooked crossbar.
      const low=v(root-.25,bottom-.65,z);
      beam(v(root,-.42,-.67),low,.065,.065,3);beam(v(root+.35,-.42,.65),low.clone().add(v(.18,.30,.3)),.15);
      beam(low.clone().add(v(-.20,0,-.63)),low.clone().add(v(.18,.13,.66)),.16,.19);
      ring(low.clone().add(v(0,-.28,0)),.18);
      for(let i=0;i<2;i++)beam(low.clone().add(v(0,.06,-.35+i*.7)),low.clone().add(v(-.18,-.42-random()*.45,-.28+i*.7)),.10);
    }else{ // Fan braces and a short central timber stump.
      const low=v(root-.45,bottom,z);beam(v(root,-.38,z),low,.27,.23);
      for(const tz of [-.85,.72]){beam(low.clone().add(v(0,.20,0)),v(root+.8+random()*.7,-.40,tz),.15,.18);ring(v(root+.65,-.46,tz),.09);}
      band(low.clone().add(v(0,.28,0)),.35);
    }
    // Normal-sized scrap panels overlap through placement, not stretched frames.
    for(let i=0,n=2+Math.floor(random()*2);i<n;i++){
      const p=v(root-.15-random()*.10,-.78-random()*.55,-.88+i*.74);
      add(4,p,new THREE.Quaternion().setFromEuler(new THREE.Euler(random()*.16,Math.PI/2+(random()-.5)*.3,(random()-.5)*.35)),v(.55+random()*.42,.42+random()*.45,1),iron());
      ring(p.clone().add(v(-.04,.16,0)),.045);
    }
    if(random()<.6){const tz=(random()-.5)*1.6;beam(v(root+.15,-.42,tz),v(root-.32,-.8-random()*1.4,tz+.2),.08,.12);}
    const railA=v(root-.08,-1.02,-1.33),railB=v(root+.07,-1.15,1.33);
    beam(railA,railB,.12,.16,1);
    // Real connections between adjacent stationary treads, never across gaps,
    // independent floor roots, or moving platforms.
    const previous=this.previousShelf;
    if(previous&&previous.section===section-1&&!moving&&!previous.moving&&previous.group.userData.floorIndex===group.userData.floorIndex){
      previous.group.updateWorldMatrix(true,false);group.updateWorldMatrix(true,false);
      const ropeCount=1+Math.floor(random()*3);
      for(let row=0;row<ropeCount;row++){
        // Pick attachment points on the actual crossbars, not arbitrary air below them.
        const a=group.worldToLocal(previous.group.localToWorld(previous.railA.clone().lerp(previous.railB,.15+random()*.70))),b=railA.clone().lerp(railB,.15+random()*.70);
        const vertical=row>0&&random()<.45;
        if(vertical){a.copy(b);b.copy(a).add(v((random()-.5)*.20,-.8-random()*1.7,(random()-.5)*.20));}
        const sag=.16+Math.pow(random(),.65)*.85,lean=(random()-.5)*.28,belly=.36+random()*.28;
        if(a.distanceTo(b)>.1&&a.distanceTo(b)<6){
          const point=t=>{const u=t<belly?t/belly:(1-t)/(1-belly),weight=Math.sin(u*Math.PI/2);return a.clone().lerp(b,t).add(v(Math.sin(Math.PI*t)*lean,-weight*sag,0));};
          const phase=random()*Math.PI*2,amplitude=.045+random()*.045,axis=b.clone().sub(a).cross(up);
          if(axis.lengthSq()<.001)axis.set(1,0,0);axis.normalize();
          for(let i=0;i<8;i++){const part=beam(point(i/8),point((i+1)/8),.048+row*.006,.048+row*.006,3);part.link=true;part.wind={center:(i+.5)/8,span:1/8,phase,amplitude,axis,freeEnd:vertical};}
          ring(a,.065);ring(b,.065);
          if(row===0){
            const start=a.clone(),end=b.clone();
            // Two overlapping stock beams and three separate sheets bridge the
            // seam. Individual pieces retain their original cross sections.
            beam(start,start.clone().lerp(end,.54),.10,.13,1).link=true;
            beam(start.clone().lerp(end,.46),end,.10,.13,1).link=true;
            const tangent=end.clone().sub(start).normalize(),normal=tangent.clone().cross(up).normalize(),sheetUp=normal.clone().cross(tangent).normalize();
            const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent,sheetUp,normal));
            for(const t of [.38,.64]){
              const p=start.clone().lerp(end,t).add(v(-.08,.06+(random()-.5)*.14,0));
              add(4,p,orientation.clone(),v(.58+random()*.18,.38+random()*.18,1),iron()).link=true;
            }
          }
        }
      }
    }
    this.previousShelf={group,section,moving,root,railA,railB};
  }
  build(){
    const plank=new THREE.BoxGeometry(1,1,1),p=plank.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,-.5+.16*(p.getX(i)+.5)+.08*(p.getZ(i)+.5));
    plank.computeVertexNormals();
    const sheet=new THREE.PlaneGeometry(1,1,8,2),sp=sheet.attributes.position;
    for(let i=0;i<sp.count;i++){const x=sp.getX(i),y=sp.getY(i);sp.setXYZ(i,x+y*.09,y,Math.sin(x*Math.PI*8)*.035+(y<0?.045:0));}sheet.computeVertexNormals();
    const geometries=[plank,new THREE.BoxGeometry(1,1,1),new THREE.TorusGeometry(1,.16,4,10),new THREE.CylinderGeometry(.5,.5,1,6,6),sheet];
    const size=64,data=new Uint8Array(size*size*4),random=createVisualRandom('relic-timber-grain');
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const value=.65+.16*Math.sin(x*.71+Math.sin(y*.14)*.6)+random()*.12,i=(y*size+x)*4;data[i]=value*230;data[i+1]=value*212;data[i+2]=value*184;data[i+3]=255;}
    const grain=new THREE.DataTexture(data,size,size);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.generateMipmaps=true;grain.minFilter=THREE.LinearMipmapLinearFilter;grain.needsUpdate=true;
    const materials=geometries.map((_,kind)=>applyTowerDepth(new THREE.MeshStandardMaterial({color:'#ffffff',map:kind===0||kind===3?grain:null,roughness:kind===0||kind===3?.97:.83,metalness:kind===0||kind===3?0:.38,side:kind===4?THREE.DoubleSide:THREE.FrontSide})));
    for(const kind of [1,2,4])applyMetalGradient(materials[kind],geometries[kind]);
    applyMetalGradient(materials[0],geometries[0],true);
    applyRopeSway(materials[3],this.windTime);
    this.parts.forEach((parts,kind)=>{
      if(!parts.length)return;
      const grouped=new Map();for(const part of parts){const id=part.group.userData.floorIndex??0;if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(part);}
      for(const [floorIndex,parts] of grouped){
      const material=materials[kind];
      const geometry=kind===3?geometries[kind].clone():geometries[kind];
      if(kind===3){
        const wind=[],axis=[];
        for(const part of parts){part.group.updateWorldMatrix(true,false);const w=part.wind,direction=w.axis.clone().transformDirection(part.group.matrixWorld);wind.push(w.center,w.span,w.phase,w.amplitude);axis.push(direction.x,direction.y,direction.z,w.freeEnd?1:0);}
        geometry.setAttribute('ropeWind',new THREE.InstancedBufferAttribute(new Float32Array(wind),4));geometry.setAttribute('ropeAxis',new THREE.InstancedBufferAttribute(new Float32Array(axis),4));
      }
      const batch=new THREE.InstancedMesh(geometry,material,parts.length);batch.name='under-shelf-relics-'+kind;batch.userData.floorIndex=floorIndex;batch.frustumCulled=false;
      parts.forEach((part,index)=>{part.group.updateWorldMatrix(true,false);this.matrix.multiplyMatrices(part.group.matrixWorld,part.local);batch.setMatrixAt(index,this.matrix);batch.setColorAt(index,part.color);this.dynamic.push({...part,batch,index,visible:true});});
      batch.instanceMatrix.needsUpdate=true;this.scene.add(batch);
      }
    });
    this.parts=null;
  }
  updateWind(dt){this.windTime.value+=Math.max(0,dt);}
  updateDynamic(force=false){
    const batches=new Set();
    for(const part of this.dynamic){
      const visible=part.group.visible;
      if(!force&&visible===part.visible&&(!part.moving||!visible))continue;
      part.visible=visible;
      if(visible){part.group.updateWorldMatrix(true,false);this.matrix.multiplyMatrices(part.group.matrixWorld,part.local);part.batch.parent.updateWorldMatrix(true,false);this.matrix.premultiply(new THREE.Matrix4().copy(part.batch.parent.matrixWorld).invert());}
      else this.matrix.makeScale(0,0,0);
      part.batch.setMatrixAt(part.index,this.matrix);batches.add(part.batch);
    }
    for(const batch of batches)batch.instanceMatrix.needsUpdate=true;
  }
}
