import * as THREE from 'three';
import { BeastVitralBurst } from './beast-vitral-burst.js';
import { createVisualRandom } from './visual-random.js';
import {ENEMY_CONFIG,enemyStats} from './enemy-config.js';
import {clearBossFlash} from './boss-flash.js';
const random=createVisualRandom('beast-smoke');

// Unlit black stays black even in the sunset and in the rabbit's point light.
const fur = new THREE.MeshBasicMaterial({ color: ENEMY_CONFIG.appearance.bodyColor, fog: false });
const red = new THREE.MeshBasicMaterial({ color: ENEMY_CONFIG.appearance.eyeColor, fog: false, toneMapped: false });
const eyeCore = new THREE.MeshBasicMaterial({ color: ENEMY_CONFIG.appearance.eyeCore, fog: false, toneMapped: false });
const sphere = new THREE.SphereGeometry(1, 16, 12);
let smokeTexture, circleTexture,eyeGlowTexture;
function textures() {
  if (smokeTexture) return;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');
  for(let i=0;i<6;i++){
    const x=32+Math.cos(i*2.4)*10,y=32+Math.sin(i*2.4)*9;
    const gradient=ctx.createRadialGradient(x,y,0,x,y,23);
    gradient.addColorStop(0,'rgba(255,255,255,.45)');gradient.addColorStop(.45,'rgba(255,255,255,.24)');gradient.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  }
  smokeTexture=new THREE.CanvasTexture(canvas);
  const circle=document.createElement('canvas');circle.width=circle.height=32;
  const c=circle.getContext('2d');c.fillStyle='white';c.beginPath();c.arc(16,16,14,0,Math.PI*2);c.fill();
  circleTexture=new THREE.CanvasTexture(circle);
  const glow=document.createElement('canvas');glow.width=glow.height=64;
  const g=glow.getContext('2d'),radial=g.createRadialGradient(32,32,0,32,32,32);
  radial.addColorStop(0,'rgba(255,255,255,1)');radial.addColorStop(.16,'rgba(255,255,255,.8)');radial.addColorStop(.45,'rgba(255,255,255,.25)');radial.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=radial;g.fillRect(0,0,64,64);eyeGlowTexture=new THREE.CanvasTexture(glow);
}
function ellipsoid(parent, material, position, scale) {
  const mesh=new THREE.Mesh(sphere,material);mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;
}
export const BEAST_KINDS = ENEMY_CONFIG.enemies.filter(enemy=>enemy.profile==='animal').map(enemy=>enemy.model);
export function createShadowBeast(kind = 'cat') {
  textures();
  const o=new THREE.Group();
  const eyeGlows=[];
  const hare=kind==='hare',wolf=kind==='wolf',fox=kind==='fox';
  ellipsoid(o,fur,[0,.8,-.1],[hare?.39:wolf?.52:.43,hare?.51:.46,hare?.6:wolf?1:.88]);
  ellipsoid(o,fur,[0,.98,.48],[.4,.5,.44]);
  const head=new THREE.Group();head.position.set(0,1.23,.79);o.add(head);
  ellipsoid(head,fur,[0,0,0],[.38,.33,.36]);
  ellipsoid(head,fur,[-.12,-.13,.27],[.19,.15,.19]);
  ellipsoid(head,fur,[.12,-.13,.27],[.19,.15,.19]);
  if(wolf||fox){
    ellipsoid(head,fur,[0,-.09,.4],[wolf?.22:.16,.15,wolf?.4:.34]);
    ellipsoid(head,fur,[0,-.06,.69],[.13,.1,.1]);
    if(wolf)ellipsoid(o,fur,[0,1.07,.42],[.52,.56,.47]);
  }
  for(const side of [-1,1]){
    if(hare){
      const ear=ellipsoid(head,fur,[side*.18,.63,-.05],[.115,.65,.105]);ear.rotation.z=-side*.13;
    }else{
      const ear=new THREE.Mesh(new THREE.ConeGeometry(fox?.28:.22,fox?.76:wolf?.4:.56,3),fur);
      ear.position.set(side*.26,fox?.46:.39,-.05);ear.rotation.z=-side*.18;ear.rotation.y=Math.PI/6;head.add(ear);
    }
    const eye=ellipsoid(head,red,[side*.19,.055,.292],[.105,.065,.054]);eye.rotation.z=-side*.2;
    ellipsoid(head,eyeCore,[side*.19,.06,.34],[.023,.043,.012]);
    for(let layer=0;layer<2;layer++){
      const material=new THREE.SpriteMaterial({map:eyeGlowTexture,color:layer?'#ff482a':'#ff071d',transparent:true,opacity:layer?.9:.55,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,fog:false,toneMapped:false});
      const glow=new THREE.Sprite(material);glow.position.set(side*.19,.06,.365);
      glow.scale.set(layer?.26:.68,layer?.19:.5,1);head.add(glow);eyeGlows.push(glow);
    }
  }
  const legs=[];
  for(const z of [-.62,.55])for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.32,.75,z);o.add(leg);
    ellipsoid(leg,fur,[0,-.2,-.03],[hare&&z<0?.26:.15,.34,hare&&z<0?.3:.17]);
    ellipsoid(leg,fur,[0,-.48,.04],[.11,.25,.11]);
    ellipsoid(leg,fur,[0,-.66,.15],[.19,.13,hare?.4:.29]);
    legs.push(leg);
  }
  const paw=legs[3];
  const tail=new THREE.Group();tail.position.set(0,.86,-.82);o.add(tail);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.1,.25,-.45),new THREE.Vector3(.45,.7,-.9),new THREE.Vector3(.2,1.13,-1.15),new THREE.Vector3(-.13,1.04,-1.05)]);
  if(hare)ellipsoid(tail,fur,[0,.13,-.12],[.24,.24,.24]);
  else if(fox){
    const bush=ellipsoid(tail,fur,[0,-.02,-.65],[.27,.3,.85]);bush.rotation.x=-.3;
  }else if(wolf){
    const brush=ellipsoid(tail,fur,[0,-.13,-.65],[.2,.23,.75]);brush.rotation.x=-.4;
  }else tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.09,7,false),fur));
  // Each emitter owns a fixed pool; no allocations or new materials per frame.
  const smoke=Array.from({length:18},(_,i)=>{
    const material=new THREE.SpriteMaterial({map:smokeTexture,color:'#000000',transparent:true,depthWrite:false,fog:false,opacity:0});
    const sprite=new THREE.Sprite(material);o.add(sprite);
    return {sprite,phase:random(),life:1.9+random()*.9,angle:random()*Math.PI*2};
  });
  const circles=Array.from({length:3},(_,i)=>{
    const material=new THREE.SpriteMaterial({map:circleTexture,color:'#000000',transparent:true,depthWrite:false,fog:false,opacity:0});
    const sprite=new THREE.Sprite(material);o.add(sprite);return {sprite,phase:random()*5.1};
  });
  const meshes=[];o.traverse(child=>{if(child.isMesh)meshes.push(child);});
  const dissolve={value:-10};
  const deathDirection={value:1};
  const deathCenter={value:new THREE.Vector3()};
  const vitralBurst=new BeastVitralBurst(o,smokeTexture);
  const deathColors={value:Array.from({length:6},()=>new THREE.Color('#ffffff'))};
  const deathFur=fur.clone();deathFur.transparent=true;
  deathFur.onBeforeCompile=shader=>{
    shader.uniforms.dissolveHeight=dissolve;
    shader.uniforms.deathDirection=deathDirection;shader.uniforms.deathColors=deathColors;shader.uniforms.deathCenter=deathCenter;
    shader.vertexShader='varying vec3 vBeastLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBeastLocal = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader='uniform float dissolveHeight;uniform float deathDirection;uniform vec3 deathColors[6];uniform vec3 deathCenter;\nvarying vec3 vBeastLocal;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat grain = fract(sin(dot(floor(vBeastLocal.xz * 35.0), vec2(12.9898,78.233))) * 43758.5453);\nfloat dissolveDistance=deathDirection<0.0?length(vBeastLocal-deathCenter)-dissolveHeight:vBeastLocal.y-dissolveHeight; if(dissolveDistance < (grain-.5)*.22) discard;').replace('#include <opaque_fragment>','if(deathDirection<0.0){float edge=1.0-smoothstep(0.0,.5,abs(length(vBeastLocal-deathCenter)-dissolveHeight));int cell=int(mod(abs(floor(vBeastLocal.x*5.0)+floor(vBeastLocal.z*5.0)),6.0));outgoingLight=mix(outgoingLight,deathColors[cell]*3.5,edge);}\n#include <opaque_fragment>');
  };
  return {o,paw,legs,tail,head,smoke,circles,eyeGlows,meshes,deathFur,dissolve,deathDirection,deathColors,deathCenter,vitralBurst,kind,stompTop:hare?1.03:wolf?1.15:1.02,dead:false,deathAge:0};
}

export function createShadowReaper(){
  // Retain the shared eyes, smoke, damage and dissolve systems.
  const beast=createShadowBeast('wolf'),{o,head}=beast;
  for(const mesh of beast.meshes)if(mesh.material===fur)mesh.removeFromParent();
  for(const leg of beast.legs)leg.removeFromParent();beast.tail.removeFromParent();
  head.position.set(0,2.12,.05);
  ellipsoid(o,fur,[0,1.65,0],[.48,.65,.30]);
  const hood=new THREE.Mesh(new THREE.ConeGeometry(.49,.92,12),fur);hood.position.set(0,.19,-.05);head.add(hood);
  ellipsoid(head,fur,[0,-.04,-.04],[.43,.40,.32]);
  const points=[],uvs=[],indices=[],segments=40,levels=12;
  for(let row=0;row<=levels;row++)for(let j=0;j<=segments;j++){
    const t=row/levels,angle=j/segments*Math.PI*2;
    const radius=.34+(1-t)*.38+Math.sin(angle*9+t*2)*.045;
    const hem=(1-t)**5*(.11+Math.sin(angle*7)*.10+Math.sin(angle*13)*.06);
    points.push(Math.cos(angle)*radius,.13+t*1.9+hem,Math.sin(angle)*radius*.72);
    uvs.push(j/segments,t);
    if(row<levels&&j<segments){const a=row*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const robeGeometry=new THREE.BufferGeometry();robeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));robeGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));robeGeometry.setIndex(indices);robeGeometry.computeVertexNormals();
  const robe=new THREE.Mesh(robeGeometry,fur);robe.frustumCulled=false;o.add(robe);
  robeGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  beast.cloak={geometry:robeGeometry,rest:new Float32Array(points),motion:0,lastTime:null};
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.41,1.94,0);o.add(arm);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(side*.24,-.30,.02),new THREE.Vector3(side*.38,-.72,.15),new THREE.Vector3(side*.46,-1.03,.23)]);
    arm.add(new THREE.Mesh(new THREE.TubeGeometry(curve,16,.105,7,false),fur));
    ellipsoid(arm,fur,[side*.46,-1.03,.23],[.14,.18,.10]);
    for(let finger=0;finger<4;finger++){
      const x=side*.46+(finger-1.5)*.07;
      const claw=new THREE.CatmullRomCurve3([new THREE.Vector3(x,-1.10,.25),new THREE.Vector3(x+side*.035,-1.27,.28),new THREE.Vector3(x+side*.06,-1.31,.38)]);
      arm.add(new THREE.Mesh(new THREE.TubeGeometry(claw,8,.025,4,false),fur));
    }
    for(let i=0;i<4;i++){const shred=new THREE.Mesh(new THREE.ConeGeometry(.14,.65,3),fur);shred.position.set(side*.13,-.15-i*.14,-.03);shred.rotation.z=Math.PI+side*.35;arm.add(shred);}
    arms.push(arm);
  }
  beast.legs=arms;beast.paw=arms[1];beast.tail=new THREE.Group();o.add(beast.tail);
  beast.kind='reaper';beast.stompTop=enemyStats('reaper').stats.stompTop;
  beast.meshes=[];o.traverse(child=>{if(child.isMesh)beast.meshes.push(child);});
  return beast;
}

export function killShadowBeast(beast,palette=null){
  beast.dead=true;beast.deathAge=0;beast.deathY=beast.o.position.y;
  for(const glow of beast.eyeGlows)glow.visible=false;
  beast.vitralDeath=!!palette?.length;beast.deathDirection.value=beast.vitralDeath?-1:1;
  if(beast.vitralDeath){
    const bounds=new THREE.Box3();for(const mesh of beast.meshes)bounds.union(new THREE.Box3().setFromObject(mesh));
    beast.deathTop=bounds.max.y+.15;beast.deathBottom=bounds.min.y-.15;
    bounds.getCenter(beast.deathCenter.value);
    beast.dissolve.value=0;
    beast.vitralBurst.start(beast.o.worldToLocal(beast.deathCenter.value.clone()),palette);
    beast.deathColors.value.forEach((color,i)=>color.copy(palette[i%palette.length]));
    beast.smoke.forEach((mote,i)=>{mote.sprite.material.map=circleTexture;mote.sprite.material.color.copy(palette[i%palette.length]);mote.sprite.material.blending=THREE.AdditiveBlending;mote.sprite.material.needsUpdate=true;});
  }
  for(const mesh of beast.meshes){if(mesh.material===fur)mesh.material=beast.deathFur;else mesh.visible=false;}
  // Capture columns at the kill position: the dissolve travels strictly upward.
  beast.deathMotes=beast.smoke.map((mote,i)=>({x:Math.sin(i*2.4)*(.25+i%3*.13),z:Math.cos(i*2.4)*(.3+i%4*.15)}));
}
export function resetShadowBeast(beast){
  clearBossFlash(beast);
  beast.dead=false;beast.deathAge=0;if(beast.maxHP!==undefined)beast.hp=beast.maxHP;beast.hurt=0;beast.lastTop=null;beast.o.visible=true;beast.lane=0;
  beast.dissolve.value=-10;
  beast.deathDirection.value=1;beast.vitralDeath=false;
  beast.vitralBurst.reset();
  if(beast.cloak){beast.cloak.motion=0;beast.cloak.lastTime=null;beast.moveSpeed=0;beast.cloak.geometry.attributes.position.array.set(beast.cloak.rest);beast.cloak.geometry.attributes.position.needsUpdate=true;}
  for(const glow of beast.eyeGlows)glow.visible=true;
  for(const mote of beast.smoke){mote.sprite.material.map=smokeTexture;mote.sprite.material.color.set('#000000');mote.sprite.material.blending=THREE.NormalBlending;mote.sprite.material.opacity=0;mote.sprite.material.needsUpdate=true;}
  for(const mesh of beast.meshes){if(mesh.material===beast.deathFur)mesh.material=fur;mesh.visible=true;}
}
export function animateBeastDeath(beast,dt){
  beast.deathAge+=dt;const t=beast.deathAge;
  beast.dissolve.value=beast.vitralDeath?t*3.2:beast.deathY-.2+t*3.1;
  if(beast.vitralDeath)beast.vitralBurst.update(t);
  beast.smoke.forEach((mote,i)=>{
    const age=Math.max(0,t-i*.018),column=beast.deathMotes[i];
    mote.sprite.position.set(column.x,.15+age*3.2,column.z);
    mote.sprite.scale.set(.45+age*.16,.8+age*.85,1);
    mote.sprite.material.opacity=Math.min(1,age*9)*Math.max(0,1-t/1.65)*.85;
    if(beast.vitralDeath){
      mote.sprite.position.set(column.x,beast.deathTop-beast.deathY-age*2.5,column.z);
      mote.sprite.scale.setScalar((.12+(i%3)*.05)*Math.max(0,1-t/1.7));
      mote.sprite.material.opacity=Math.min(1,age*12)*Math.max(0,1-t/1.7);
    }
  });
  for(const dot of beast.circles)dot.sprite.visible=false;
  if(t>1.7)beast.o.visible=false;
}

export function animateShadowBeast(beast,time,leap) {
  if(beast.cloak){
    const cloth=beast.cloak,dt=cloth.lastTime===null?0:Math.max(0,Math.min(.1,time-cloth.lastTime));cloth.lastTime=time;
    cloth.motion=THREE.MathUtils.damp(cloth.motion,THREE.MathUtils.clamp((beast.moveSpeed??0)/5,0,1),5,dt);
    const position=cloth.geometry.attributes.position,rest=cloth.rest,motion=cloth.motion;
    for(let i=0;i<position.count;i++){
      const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
      const loose=Math.pow(THREE.MathUtils.clamp(1-y/2.03,0,1),1.6);
      const back=THREE.MathUtils.smoothstep(-z,-.04,.42);
      const wave=Math.sin(time*(3.2+motion*3)-y*5+x*4)+Math.sin(time*5.1-y*8-z*5)*.35;
      position.setXYZ(i,x+wave*loose*back*(.045+motion*.18),y+loose*back*motion*(.22+wave*.09),z-loose*back*motion*1.25+wave*loose*(.025+motion*.06));
    }
    position.needsUpdate=true;
  }
  beast.eyeGlows.forEach((glow,i)=>{glow.material.opacity=(i%2?.88:.55)+Math.sin(time*2.6+beast.s)*.055;});
  beast.tail.rotation.z=Math.sin(time*1.8+beast.s)*.22;
  beast.head.rotation.x=-.08+Math.sin(time*2+beast.s)*.045;
  beast.legs.forEach((leg,i)=>{
    leg.rotation.x=Math.sin(time*2.7+beast.s+(i%2)*Math.PI)*.2-leap*.3;
  });
  beast.paw.rotation.x-=leap*.6;
  for(const mote of beast.smoke){
    const t=(time/mote.life+mote.phase)%1;
    const radius=.25+t*.65,angle=mote.angle+t*.9;
    mote.sprite.position.set(Math.cos(angle)*radius,.4+t*2.35,Math.sin(angle)*radius-.25-t*.4);
    mote.sprite.scale.set(.5+t*.95,.65+t*1.55,1);
    mote.sprite.material.rotation=angle*.3+t;
    mote.sprite.material.opacity=Math.sin(Math.PI*t)*.52;
  }
  for(const dot of beast.circles){
    const t=(time+dot.phase+beast.s*.17)%4.8;
    const life=1.25,u=t/life;
    dot.sprite.visible=t<life;
    if(!dot.sprite.visible)continue;
    dot.sprite.position.set(Math.sin(dot.phase*3+u)*(.4+u*.35),.7+u*1.8,-.3+Math.cos(dot.phase*4)*.55);
    dot.sprite.scale.setScalar(.045+Math.sin(u*Math.PI)*.065);
    dot.sprite.material.opacity=Math.sin(u*Math.PI)*.9;
  }
}
