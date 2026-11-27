import * as THREE from 'three';
import {spineAtlas} from './ancient-library.js';
import {applyTowerDepth} from './tower-depth.js';
import {createVisualRandom} from './random-manager.js';
import {SHELF_OUTER_RADIUS,SHELF_HALF_ANGLE} from './game.js';
import {lanternSurfaces,lanternGlow} from './lantern-surfaces.js';
import {pavingTexture} from './stone-stairs.js';

function shadeBackgroundProps(material){
  const previous=material.onBeforeCompile;
  const previousKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,...args){
    previous.call(this,shader,...args);
    shader.vertexShader='varying float propCameraDepth; varying float propBaseHeight;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      propCameraDepth=-mvPosition.z;
      #ifdef USE_INSTANCING
        propBaseHeight=(instanceMatrix*vec4(transformed,1.0)).y;
      #else
        propBaseHeight=transformed.y;
      #endif`);
    shader.fragmentShader='varying float propCameraDepth; varying float propBaseHeight;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
      float propDepthShade=smoothstep(15.0,30.0,propCameraDepth);
      float contactShade=1.0-smoothstep(.05,.68,propBaseHeight);
      gl_FragColor.rgb*=mix(vec3(1.0),vec3(.48,.47,.46),propDepthShade)*mix(vec3(1.0),vec3(.34,.31,.29),contactShade);`);
  };
  material.customProgramCacheKey=()=>previousKey+'-background-prop-depth-contact-v3';
  return material;
}

export function createBackgroundProps(){
  const mat=(color,extra={})=>shadeBackgroundProps(applyTowerDepth(new THREE.MeshStandardMaterial({color,roughness:.85,...extra})));
  const pages=mat('#b9aa87'),brass=mat('#987044',{metalness:.55}),binding=mat('#593c29');
  const wax=mat('#c9b995'),pewter=mat('#8c9292',{metalness:.45,roughness:.48}),ceramic=mat('#676c70'),sand=mat('#c9ae7f');
  const marbleMap=pavingTexture(1),marbleBrick=mat('#b6b9be',{map:marbleMap,bumpMap:marbleMap,bumpScale:.022,roughness:.96});
  const covers=Array.from({length:32},(_,tile)=>{const map=spineAtlas().clone();map.repeat.set(1/8,1/4);map.offset.set(tile%8/8,Math.floor(tile/8)/4);map.needsUpdate=true;return mat('#ffffff',{map});});
  const shapes={box:new THREE.BoxGeometry(1,1,1),roll:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,4),ring:new THREE.TorusGeometry(1,.18,4,12)};
  const arch=new THREE.Shape();arch.moveTo(-.5,0);arch.lineTo(-.5,.38);arch.quadraticCurveTo(-.5,.72,0,1);arch.quadraticCurveTo(.5,.72,.5,.38);arch.lineTo(.5,0);arch.lineTo(.36,0);arch.lineTo(.36,.36);arch.quadraticCurveTo(.36,.60,0,.82);arch.quadraticCurveTo(-.36,.60,-.36,.36);arch.lineTo(-.36,0);arch.closePath();
  shapes.arch=new THREE.ExtrudeGeometry(arch,{depth:.12,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:8});
  const lantern=lanternSurfaces();
  const copyLantern=material=>{const copy=material.clone();copy.onBeforeCompile=material.onBeforeCompile;copy.customProgramCacheKey=material.customProgramCacheKey;return shadeBackgroundProps(copy);};
  const surfaces={metal:copyLantern(lantern.metal),glass:copyLantern(lantern.glass)};
  const groundShadow=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,
    vertexShader:'varying vec2 shadowUV;void main(){shadowUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 shadowUV;void main(){
      float depth=smoothstep(.05,.95,shadowUV.x);
      float ends=smoothstep(0.0,.12,shadowUV.y)*smoothstep(0.0,.12,1.0-shadowUV.y);
      gl_FragColor=vec4(.035,.025,.022,depth*ends*.52);
    }`});
  const shadowGeometry=new THREE.PlaneGeometry(1,1);
  return (parent,section,config={},stone=false)=>{
    const r=createVisualRandom('shelf-props:'+section),types=config.types??['books','scrolls','lantern'];
    if(!types.length||r()>(config.density??1))return null;
    const weights=types.map(type=>config.weights?.[type]??1);
    const totalWeight=weights.reduce((sum,weight)=>sum+weight,0);
    if(totalWeight<=0)return null;
    function pickType(){
      let roll=r()*totalWeight;
      for(let index=0;index<types.length;index++){
        roll-=weights[index];
        if(roll<0)return types[index];
      }
      return types.at(-1);
    }
    const cluster=new THREE.Group();cluster.name='Background props';parent.add(cluster);
    const batches=new Map(),position=new THREE.Vector3(),rotation=new THREE.Euler(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();
    const add=(shape,material,x,y,z,w,h,d,ry=0,rz=0)=>{
      let byMaterial=batches.get(shape);if(!byMaterial)batches.set(shape,byMaterial=new Map());
      let matrices=byMaterial.get(material);if(!matrices)byMaterial.set(material,matrices=[]);
      position.set(x,y,z);rotation.set(0,ry,rz);quaternion.setFromEuler(rotation);scale.set(w,h,d);
      matrices.push(new THREE.Matrix4().compose(position,quaternion,scale));
    };
    const halfWidth=SHELF_OUTER_RADIUS*Math.sin(SHELF_HALF_ANGLE)*.80;
    const count=10+Math.floor(r()*4),anchors=Array.from({length:4},(_,index)=>
      -halfWidth+(index+.3+r()*.4)*(2*halfWidth/4));
    const shadow=new THREE.Mesh(shadowGeometry,groundShadow);
    shadow.position.set(SHELF_OUTER_RADIUS-.58,stone?.085:.045,0);
    shadow.rotation.x=-Math.PI/2;
    shadow.scale.set(1.12,halfWidth*2.1,1);
    shadow.renderOrder=1;cluster.add(shadow);
    for(let i=0;i<count;i++){
      const kind=pickType(),anchor=anchors[i%anchors.length];
      const z=THREE.MathUtils.clamp(anchor+(r()-.5)*.36,-halfWidth,halfWidth);
      const x=SHELF_OUTER_RADIUS-.16-r()*.29,angle=(r()-.5)*.8,size=.55+r()*.75;
      if(kind==='books'){
        let height=.06;
        const upright=r()<.36;
        if(upright){
          const bookHeight=(.38+r()*.40)*size,bookWidth=(.10+r()*.08)*size;
          const cover=covers[Math.floor(r()*covers.length)],lean=(r()-.5)*.24;
          add('box',cover,x,.065+bookHeight/2,z,bookWidth,bookHeight,.38*size,angle,lean);
          add('box',pages,x,.065+bookHeight/2,z,bookWidth*.72,bookHeight*.91,.34*size,angle,lean);
        }else for(let j=0,n=1+Math.floor(r()*5);j<n;j++){
          const w=(.45+r()*.17)*size,d=(.44+r()*.14)*size,h=(.08+r()*.055)*size,cover=covers[Math.floor(r()*covers.length)],turn=angle+(r()-.5)*.22;
          const bookX=x+(r()-.5)*.07,bookZ=z+(r()-.5)*.07;
          add('box',cover,bookX,height,bookZ,w,.025*size,d,turn);add('box',pages,bookX,height+.015*size+h/2,bookZ,w-.035*size,h,d-.035*size,turn);
          add('box',cover,bookX,height+h+.03*size,bookZ,w,.025*size,d,turn);height+=h+.05*size;
        }
      }else if(kind==='scrolls'){
        for(let j=0,n=2+Math.floor(r()*3);j<n;j++){
          const zOffset=(j-(n-1)/2)*.15*size;
          add('roll',pages,x,.13,z+zOffset,.075*size,.53*size,.075*size,angle,Math.PI/2);
          add('roll',binding,x-.20*size,.13,z+zOffset,.081*size,.035*size,.081*size,angle,Math.PI/2);
        }
      }else if(kind==='brick'){
        const brickWidth=(.37+r()*.18)*size,brickDepth=(.25+r()*.12)*size,brickHeight=(.12+r()*.06)*size;
        add('box',marbleBrick,x,.07+brickHeight/2,z,brickWidth,brickHeight,brickDepth,angle,(r()-.5)*.05);
        if(r()<.45)add('box',marbleBrick,x+(r()-.5)*.08,.07+brickHeight*1.5,z+(r()-.5)*.08,brickWidth*.88,brickHeight,brickDepth*.92,angle+(r()-.5)*.2);
      }else if(kind==='urn'){
        add('roll',ceramic,x,.14*size+.07,z,.15*size,.14*size,.15*size);
        add('roll',ceramic,x,.33*size+.07,z,.23*size,.30*size,.23*size);
        add('roll',pewter,x,.50*size+.07,z,.12*size,.055*size,.12*size);
        add('cone',pewter,x,.58*size+.07,z,.11*size,.11*size,.11*size);
      }else if(kind==='hourglass'){
        for(const y of [.09,.53])add('roll',pewter,x,y*size+.06,z,.17*size,.045*size,.17*size);
        for(const sign of [-1,1])add('box',pewter,x+sign*.13*size,.31*size+.06,z,.025*size,.43*size,.025*size);
        add('cone',sand,x,.22*size+.06,z,.105*size,.20*size,.105*size);
        add('cone',sand,x,.39*size+.06,z,.105*size,.20*size,.105*size,0,Math.PI);
      }else if(kind==='candlestick'){
        const candleHeight=(.24+r()*.22)*size;
        add('roll',pewter,x,.09*size+.06,z,.17*size,.06*size,.17*size);
        add('roll',pewter,x,.19*size+.06,z,.045*size,.18*size,.045*size);
        add('roll',wax,x,.28*size+.06+candleHeight/2,z,.07*size,candleHeight,.07*size);
        add('roll',binding,x,.29*size+.06+candleHeight,z,.009*size,.04*size,.009*size);
      }else if(kind==='arch'){
        const height=(.38+r()*.32)*size,width=(.42+r()*.22)*size;
        add('arch',marbleEdge,x,.07,z,width,height,size,Math.PI/2+angle*.2,(r()-.5)*.07);
        add('box',marble,x,.09,z,.18*size,.10*size,width*1.12,angle);
      }else if(kind==='stone'){
        const height=(.20+r()*.45)*size;
        add('box',marble,x,.07+height/2,z,.26*size,height,.24*size,angle);
        add('box',marbleEdge,x,.08+height,z,.33*size,.06*size,.31*size,angle);
        if(r()<.5)add('cone',marbleEdge,x,.15+height,z,.17*size,.18*size,.17*size,angle);
      }else if(kind==='candles'){
        for(let j=0,n=1+Math.floor(r()*3);j<n;j++){
          const candleHeight=(.16+r()*.24)*size,candleZ=z+(j-(n-1)/2)*.12*size;
          add('roll',wax,x,.07+candleHeight/2,candleZ,.045*size,candleHeight,.045*size);
          add('roll',binding,x,.075+candleHeight,candleZ,.008*size,.035*size,.008*size);
        }
      }else if(kind==='lantern'){
        add('box',surfaces.metal,x,.13,z,.31*size,.06*size,.31*size,angle);
        add('box',surfaces.glass,x,.35*size+.09,z,.23*size,.40*size,.23*size,angle);
        for(const dx of [-.14,.14])for(const dz of [-.14,.14])add('box',surfaces.metal,x+dx*size,.35*size+.09,z+dz*size,.025*size,.48*size,.025*size,angle);
        add('box',surfaces.metal,x,.61*size+.09,z,.35*size,.06*size,.35*size,angle);
        add('cone',surfaces.metal,x,.71*size+.09,z,.21*size,.15*size,.21*size,angle);
        const halo=lanternGlow(parent.getWorldPosition(new THREE.Vector3()).y,1.1);halo.position.set(x,.36*size+.09,z);cluster.add(halo);
      }
    }
    for(const [shape,materials] of batches)for(const [material,matrices] of materials){
      const mesh=new THREE.InstancedMesh(shapes[shape],material,matrices.length);
      matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();cluster.add(mesh);
    }
    return cluster;
  };
}
