import * as THREE from 'three';
import {mergeGeometries,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
import {attachStairCollision,stairWedge} from './enchanted-stairs.js';
import {SHELF_HALF_ANGLE,SHELF_OUTER_RADIUS,shelfInnerRadius} from './game.js';
import {applyTowerDepth} from './tower-depth.js';
import {createVisualRandom} from './random-manager.js';

function stoneTexture(columns=0,courses=4){
  const size=256,canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);
  const hash=(x,y)=>((Math.imul(x+37,73856093)^Math.imul(y+19,19349663))>>>0)%101/100;
  const fract=value=>value-Math.floor(value);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;
    const weather=Math.sin(u*2*Math.PI+Math.sin(v*4*Math.PI))*10+Math.cos((u+v)*6*Math.PI)*6;
    const grain=(hash(x,y)-.5)*22;
    const vein=Math.pow(1-Math.abs(Math.sin((u+v*.61)*Math.PI*6+Math.sin(v*15+u*8)*.85+Math.cos(u*27)*.22)),13);
    let tone=183+weather+grain*.65-vein*39;
    if(columns){
      const course=Math.floor(v*courses),column=u*columns+(course%2)*.5;
      const joint=Math.min(Math.min(fract(column),1-fract(column))/columns,Math.min(fract(v*courses),1-fract(v*courses))/courses)*size;
      const edge=joint+(hash(x,y)-.5)*1.5;
      tone+=40*(hash(Math.floor(column)%columns,course)-.5);
      if(edge<1.6)tone-=18;
      else if(edge<3.7)tone+=edge<2.6?-8:13;
    }
    const i=(y*size+x)*4;
    pixels.data.set([tone,tone,tone,255],i);
  }
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=4;
  return texture;
}

export function pavingTexture(variant){
  const size=256,canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);
  const hash=(x,y)=>{
    let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(variant,1442695041);
    h=Math.imul(h^(h>>>15),2246822519);
    h=Math.imul(h^(h>>>13),3266489917);
    return ((h^(h>>>16))>>>0)/4294967296;
  };
  const mix=THREE.MathUtils.lerp;
  function noise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
    const a=u*u*(3-2*u),b=v*v*(3-2*v);
    return mix(mix(hash(ix,iy),hash(ix+1,iy),a),mix(hash(ix,iy+1),hash(ix+1,iy+1),a),b);
  }
  const jointY=.32+hash(11,2)*.36,jointX=.27+hash(18,2)*.48;
  const secondJoint=.23+hash(19,2)*.52;
  const stains=Array.from({length:1+Math.floor(hash(17,41)*3)},(_,i)=>({
    x:hash(i,31),y:hash(i,32),width:.10+hash(i,33)*.33,height:.08+hash(i,34)*.28,
    angle:hash(i,35)*Math.PI,strength:.42+hash(i,36)*.58
  })).map(s=>({...s,cos:Math.cos(s.angle),sin:Math.sin(s.angle)}));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/(size-1),v=y/(size-1);
    const broad=noise(u*4,v*4),patch=noise(u*10+2,v*10),fine=noise(u*40,v*40);
    let stain=0;
    for(const mark of stains){
      const dx=u-mark.x,dy=v-mark.y;
      const distance=Math.hypot((dx*mark.cos-dy*mark.sin)/mark.width,(dx*mark.sin+dy*mark.cos)/mark.height);
      stain=Math.max(stain,(1-THREE.MathUtils.smoothstep(distance+(patch-.5)*.7,.08,1.12))*mark.strength);
    }
    const frontWear=(1-THREE.MathUtils.smoothstep(v,0,.23))*(.45+.55*patch);
    const course=v-jointY-.022*(patch-.5);
    const crossJoint=u-(course>0?jointX:secondJoint)-.015*(fine-.5);
    const joint=Math.min(Math.abs(course),Math.abs(crossJoint));
    const age=THREE.MathUtils.smoothstep(patch,.26,.68);
    const seam=(1-THREE.MathUtils.smoothstep(joint,.002,.011))*(.45+.55*age);
    const chippedEdge=THREE.MathUtils.smoothstep(joint,.003,.009)*(1-THREE.MathUtils.smoothstep(joint,.011,.023))*fine;
    const rimDistance=Math.min(v,1-v,u*.8,(1-u)*.8);
    const carvedLine=1-THREE.MathUtils.smoothstep(Math.abs(rimDistance-.045+.005*(fine-.5)),.002,.008);
    const raisedLip=(1-THREE.MathUtils.smoothstep(rimDistance,.023,.044))*(.5+fine*.5);
    const pits=THREE.MathUtils.smoothstep(noise(u*70,v*70),.68,.96);
    const grain=noise(u*124,v*124)-.5;
    const veinPhase=(u+v*.72)*Math.PI*6+variant*.69+1.6*noise(u*6,v*6)+.4*noise(u*21,v*21);
    const vein=Math.pow(1-Math.abs(Math.sin(veinPhase)),13);
    const tone=178+broad*33+fine*17+grain*13-stain*25-frontWear*8-seam*12+chippedEdge*19-carvedLine*11+raisedLip*21-pits*12-vein*49;
    const i=(y*size+x)*4;
    pixels.data[i]=tone-2;
    pixels.data[i+1]=tone;
    pixels.data[i+2]=tone+3;
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  // Small inlaid flags repeat the shape of the pointed stonework below.
  const center=72+hash(25,8)*112;
  for(const offset of (variant%3===0?[-21,0,21]:[-11,11])){
    const x=center+offset,y=31+Math.abs(offset)*.21;
    ctx.beginPath();ctx.moveTo(x,y-12);
    ctx.quadraticCurveTo(x+5,y-4,x+8,y);
    ctx.quadraticCurveTo(x+5,y+4,x,y+12);
    ctx.quadraticCurveTo(x-5,y+4,x-8,y);
    ctx.quadraticCurveTo(x-5,y-4,x,y-12);ctx.closePath();
    ctx.fillStyle='rgba(177,172,156,.46)';ctx.fill();
    ctx.lineWidth=1.5;ctx.strokeStyle='rgba(75,72,67,.68)';ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
}

function shadeStoneDepth(material,lowerArch=false){
  const previous=material.onBeforeCompile;
  const cacheKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,...args){
    previous.call(this,shader,...args);
    shader.vertexShader='varying vec3 stoneLocalPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      stoneLocalPosition=position;`);
    const archTint=lowerArch?`
      float archShade=smoothstep(.65,2.8,-stoneLocalPosition.y);
      gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*vec3(.43,.32,.27),archShade*.62);`:'';
    shader.fragmentShader='varying vec3 stoneLocalPosition;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
      float stoneDepth=smoothstep(13.15,16.85,length(stoneLocalPosition.xz));
      float lowerShade=smoothstep(.7,2.8,-stoneLocalPosition.y);
      gl_FragColor.rgb*=mix(vec3(1.10,1.12,1.14),vec3(.40,.45,.53),stoneDepth)*(1.0-.40*lowerShade);${archTint}`);
  };
  material.customProgramCacheKey=()=>cacheKey+(lowerArch?'-stone-depth-arch-v3':'-stone-depth-v2');
  return material;
}

function mapTread(geometry,inner,outer,span,section,mirror){
  const position=geometry.attributes.position,uv=geometry.attributes.uv;
  const caps=geometry.groups[0];
  for(let i=0;i<position.count;i++){
    const across=position.getZ(i)/span+.5;
    const along=(position.getX(i)-inner)/(outer-inner);
    if(i>=caps.start&&i<caps.start+caps.count)uv.setXY(i,mirror?1-across:across,1-along);
    else uv.setXY(i,across+(section%4)*.11,-position.getY(i)*.4+.13);
  }
}

// The lancet opening and its projecting moulding share the same profile.
function lancet(width,height){
  const shape=new THREE.Shape(),spring=height*.34;
  shape.moveTo(-width,0);
  shape.lineTo(-width,spring);
  shape.quadraticCurveTo(-width,height*.70,0,height);
  shape.quadraticCurveTo(width,height*.70,width,spring);
  shape.lineTo(width,0);
  shape.closePath();
  return shape;
}

function openLancet(width,height,innerWidth,innerHeight){
  const shape=new THREE.Shape();
  shape.moveTo(-width,0);shape.lineTo(-width,height*.34);
  shape.quadraticCurveTo(-width,height*.70,0,height);
  shape.quadraticCurveTo(width,height*.70,width,height*.34);shape.lineTo(width,0);
  shape.lineTo(innerWidth,0);shape.lineTo(innerWidth,innerHeight*.34);
  shape.quadraticCurveTo(innerWidth,innerHeight*.70,0,innerHeight);
  shape.quadraticCurveTo(-innerWidth,innerHeight*.70,-innerWidth,innerHeight*.34);
  shape.lineTo(-innerWidth,0);shape.closePath();
  return shape;
}

export function createStoneStairs(){
  const masonry=stoneTexture(3),wornStone=stoneTexture();
  const material=(color,map=wornStone,bumpScale=.035)=>applyTowerDepth(new THREE.MeshStandardMaterial({
    color,map,bumpMap:map,bumpScale,roughness:.96
  }));
  const profiles=['gallery','portal','split','corbels'];
  const treads=Object.fromEntries(profiles.map((profile,index)=>[profile,[0,1].map(variant=>material(
    ['#b6b9be','#c0c2c6','#adb2b9','#babdc3'][index],pavingTexture(index*2+variant+1),.022
  ))]));
  const treadSide=material('#aeb3bc',masonry,.028);
  const body=material('#a9afb8',masonry);
  const edge=material('#bfc4cd');
  const rib=material('#b2b8c2');
  const shadowStone=material('#969eaa');
  const sillStone=shadeStoneDepth(material('#b5bbc4'),true);
  for(const finish of [...Object.values(treads).flat(),treadSide])shadeStoneDepth(finish);
  for(const finish of [body,edge,rib,shadowStone])shadeStoneDepth(finish,true);
  const block=new THREE.BoxGeometry(1,1,1).toNonIndexed();
  const iron=shadeStoneDepth(applyTowerDepth(new THREE.MeshPhysicalMaterial({
    color:'#c2ae8f',metalness:.68,roughness:.27,
    emissive:'#3b3022',emissiveIntensity:.18,
    clearcoat:.65,clearcoatRoughness:.18
  })));
  const link=new THREE.TorusGeometry(.075,.019,5,10).toNonIndexed().scale(2.84,1.30,1);
  const eye=new THREE.TorusGeometry(.086,.025,5,10).toNonIndexed();
  const round=new THREE.CylinderGeometry(1,1,1,8).toNonIndexed();
  const random=createVisualRandom();
  let previousProfile;
  return function build(parent,section,style){
    const inner=shelfInnerRadius(section),outer=SHELF_OUTER_RADIUS,angle=SHELF_HALF_ANGLE;
    const width=2*inner*Math.sin(angle);
    const available=profiles.filter(profile=>profile!==previousProfile);
    const profile=style==='plain'?'corbels':available[Math.floor(random()*available.length)];
    previousProfile=profile;
    const collision=stairWedge(inner,outer,angle,.3,.035);
    const cornerCut=.27+(section%3)*.055;
    const tread=stairWedge(inner+.075,outer-.075,angle-.005,.27,.11,5,.065,cornerCut);
    toCreasedNormals(tread,Math.PI/3);
    mapTread(tread,inner,outer,2*outer*Math.sin(angle),section,random()<.5);
    const floor=new THREE.Mesh(tread,[treads[profile][Math.floor(random()*2)],treadSide]);
    floor.name='Gothic stone paving';
    floor.position.y=-.355;
    parent.add(floor);
    attachStairCollision(floor,collision);
    floor.userData.lightProjectionLift=.11;

    const stonework=new Map();
    function add(geometry,finish){
      if(!stonework.has(finish))stonework.set(finish,[]);
      stonework.get(finish).push(geometry);
    }

    // Staggered paving sits on the tread mesh, with its own bevel and relief.
    const pavingInner=inner+.18,pavingOuter=outer-.18;
    const middle=THREE.MathUtils.lerp(pavingInner,pavingOuter,.40+random()*.19);
    const pavingAngle=angle-.013;
    for(const [row,[from,to]] of [[pavingInner,middle],[middle,pavingOuter]].entries()){
      const stagger=(.13+random()*.23)*(row===0?-1:1)*pavingAngle;
      const joins=row===0?[-pavingAngle,stagger,pavingAngle]:[-pavingAngle,stagger-pavingAngle*.58,stagger+pavingAngle*.46,pavingAngle];
      for(let i=1;i<joins.length;i++){
        const halfAngle=(joins[i]-joins[i-1])*.5-.0025;
        const tile=stairWedge(from+.022,to-.022,halfAngle,.075,.035,2,.023,.08+random()*.08);
        tile.rotateY(-(joins[i]+joins[i-1])*.5);
        mapTread(tile,from,to,2*outer*Math.sin(angle),section,row===1);
        tile.translate(0,-.110+random()*.065,0);
        toCreasedNormals(tile,Math.PI/3);
        add(tile,treads[profile][(row+i+section)%2]);
      }
    }
    function carved(shape,depth,bevel){
      return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:9});
    }
    function front(shape,depth,radius,y,z,finish,bevel=.026){
      const geometry=carved(shape,depth,bevel);
      geometry.rotateY(-Math.PI/2);
      geometry.translate(radius,y,z);
      add(geometry,finish);
    }
    function piece(geometry,x,y,z,w,h,d,finish){
      add(geometry.clone().scale(w,h,d).translate(x,y,z),finish);
    }

    if(style!=='plain'&&random()<.78){
      const span=width*(.30+random()*.08),drop=.28+random()*.32;
      const left=-.78-random()*.13,right=-.78-random()*.25;
      const chainX=inner-.035;
      for(const [z,y] of [[-span,left],[span,right]]){
        piece(block,inner+.13,y+.05,z,.42,.21,.21,rib);
        add(eye.clone().rotateY(Math.PI/2).translate(chainX-.035,y,z),iron);
      }
      const count=Math.max(3,Math.round(2*span/.29));
      for(let i=0;i<=count;i++){
        const t=i/count,y=THREE.MathUtils.lerp(left,right,t)-drop*Math.sin(Math.PI*t);
        const slope=(right-left-drop*Math.PI*Math.cos(Math.PI*t))/(2*span);
        add(link.clone().rotateX(i%2*Math.PI/2).rotateY(-Math.PI/2).rotateX(-Math.atan(slope))
          .translate(chainX-.035,y,(2*t-1)*span),iron);
      }
    }

    // Short decorative screens sit just inside the exposed rim.
    if(style!=='plain'&&profile!=='corbels'){
      const halfSpan=Math.min(.35,width*.13);
      const z=(section%2===0?1:-1)*width*.22;
      const screen=lancet(halfSpan,.31);
      screen.holes.push(new THREE.Path(lancet(halfSpan-.075,.20).getPoints(10).map(p=>new THREE.Vector2(p.x,p.y+.043))));
      front(screen,.13,inner+.25,-.025,z,rib,.017);
      for(const sign of [-1,1]){
        piece(block,inner+.19,.075,z+sign*halfSpan,.21,.20,.12,body);
        piece(block,inner+.19,.185,z+sign*halfSpan,.24,.055,.17,edge);
      }
    }

    // A projecting coping caps a darker, stepped stone cornice.
    const bands=style==='plain'||profile==='corbels'?[[.07,.16,-.49,body],[.16,.12,-.58,rib]]:[
      [.025,.13,-.46,edge],[.09,.18,-.57,body],[.07,.08,-.63,rib],[.19,.17,-.77,shadowStone]
    ];
    for(const [inset,depth,height,finish] of bands){
      const band=stairWedge(inner+inset,outer-inset,angle-inset*.025,depth,.045,3,.035,cornerCut);
      toCreasedNormals(band,Math.PI/3);
      band.translate(0,height,0);
      add(band,finish);
    }

    const usable=width*(.81+random()*.09);
    const base=(profile==='portal'?-2.18:profile==='corbels'?-1.42:-1.75)-random()*.25;
    const mirror=random()<.5?-1:1;
    const openings=profile==='gallery'?[[-.25,.15,1],[.25,.15,1]]:profile==='portal'?[[0,.34,1]]:profile==='split'?[[mirror*-.18,.23,1],[mirror*.32,.095,.69]]:[];
    const pillars=profile==='gallery'?[-.5,0,.5]:profile==='portal'?[-.47,.47]:profile==='split'?[-.49,mirror*.115,.49]:[mirror*-.31,mirror*.27];
    const facade=new THREE.Shape();
    facade.moveTo(-usable/2,base);facade.lineTo(usable/2,base);
    facade.lineTo(usable/2,-.61);facade.lineTo(-usable/2,-.61);facade.closePath();
    for(const [offset,openingWidth,heightScale] of openings){
      const center=offset*usable;
      const span=openingWidth*usable,height=(-base-.82)*heightScale;
      const opening=lancet(span,height);
      facade.holes.push(new THREE.Path(opening.getPoints(12).map(p=>new THREE.Vector2(p.x+center,p.y+base+.09))));
      const surround=openLancet(span+.08,height+.10,span-.014,height-.022);
      front(surround,.11,inner+.12,base+.09,center,edge,.012);
      if(style!=='plain'){
        const bead=openLancet(span+.135,height+.165,span+.091,height+.105);
        front(bead,.06,inner+.06,base+.07,center,rib,.010);
      }
      if(random()<.67){
        const sillHeight=.055+random()*.10;
        const sillY=base+.10+random()*height*.22;
        const sill=block.clone().scale(.25+random()*.11,sillHeight,span*2+.09);
        sill.rotateX((random()-.5)*.10).translate(inner+.22,sillY,center);
        add(sill,sillStone);
      }
    }
    if(openings.length)front(facade,.32,inner+.47,0,0,body,.022);
    if(profile==='corbels'){
      const shield=new THREE.Shape();
      shield.moveTo(-.32,0);shield.lineTo(.32,0);shield.lineTo(.30,-.26);
      shield.quadraticCurveTo(.27,-.52,0,-.66);shield.quadraticCurveTo(-.27,-.52,-.30,-.26);shield.closePath();
      front(shield,.16,inner+.15,-.48,mirror*.15,edge);
    }

    // Pilasters and stepped corbels carry the span down and back toward the wall.
    for(const [i,offset] of pillars.entries()){
      const z=usable*offset,low=base-.36-random()*.3;
      const thickness=profile==='corbels'?.46+i*.09:.30;
      const corbel=new THREE.Shape();
      corbel.moveTo(inner+.13,-.65);corbel.lineTo(outer-.44,-.65);
      corbel.lineTo(outer-.51,low-.39);corbel.lineTo(inner+1.18,low-.39);
      corbel.quadraticCurveTo(inner+.5,low-.38,inner+.18,low+.16);corbel.closePath();
      const stone=carved(corbel,thickness,.048);
      stone.translate(0,0,z-thickness/2);
      add(stone,shadowStone);
      piece(round,inner+.17,(-.75+low)/2,z,.13,-.75-low,.13,rib);
      piece(block,inner+.20,-.79,z,.48,.19,.39,edge);
      piece(block,inner+.22,low+.03,z,.46,.18,.38,rib);
      piece(block,inner+.41,low-.20,z,.61,.17,.34,body);
    }
    for(const [finish,parts] of stonework){
      parent.add(new THREE.Mesh(mergeGeometries(parts,false),finish));
      for(const geometry of parts)geometry.dispose();
    }
    return floor;
  };
}
