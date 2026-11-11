import * as THREE from 'three';
import './style.css';
import './gothic-ui.css';
import './pixel-ui.css';
import './paper-ui.css';
import { createVisualRandom } from './visual-random.js';
import { END, gaps, clamp, isGap, lightStep, route, cameraAnchor, turnTowards, floorAt, depthLight, canStomp, SHELF_HALF_ANGLE, SHELF_INNER_RADIUS, SHELF_OUTER_RADIUS, LANE_LIMIT, JUMP_SPEED, advanceJump } from './game.js';
import { cameraPose, smoothCameraAnchor } from './camera.js';
import { PickupEffects } from './pickup-effects.js';
import { ShadowEffects } from './shadow-effects.js';
import { createShadowBeast, animateShadowBeast, BEAST_KINDS, killShadowBeast, resetShadowBeast, animateBeastDeath } from './shadow-beast.js';
import { createWindowLight, SUN_RAY_DIRECTION } from './window-light.js';
import { createGlassTextures } from './stained-glass.js';
import { softShadowMaterial, GroundShadowSmoke } from './ground-shadows.js';
import { TowerMist } from './tower-mist.js';
import { applyTowerDepth } from './tower-depth.js';
import { RabbitAnimation } from './rabbit-animation.js';
import { hpBrightness } from './game.js';
import { shelfInnerRadius } from './game.js';
import { VitralGlow } from './vitral-glow.js';
import { ThreatType, ThreatInfo, createThreats, updateThreats, resetThreats, consumeThreatHit, unsupportedThreat } from './threats.js';
import { ThreatVisuals } from './threat-visuals.js';
import { CatcherRay } from './catcher-ray.js';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#303849');
scene.fog = new THREE.FogExp2('#303849', .015);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' }); }
catch { $('intro').innerHTML = '<h1>Нужен WebGL</h1><p>Открой игру в браузере с аппаратным ускорением.</p>'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const towerMist=new TowerMist(scene);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 240);
const ambient=new THREE.HemisphereLight('#a1bdcc', '#5a3849', 2.1);scene.add(ambient);
const sun = new THREE.DirectionalLight('#ffcf87', 4.1);sun.target.position.set(0,100,0);sun.position.copy(sun.target.position).addScaledVector(SUN_RAY_DIRECTION,-40);
scene.add(sun,sun.target);
const warm = new THREE.PointLight('#ffa769', 140, 65, 1.2); warm.position.set(0, 95, -12); scene.add(warm);
const mat = (color, extra = {}) => applyTowerDepth(new THREE.MeshStandardMaterial({ color, roughness: .75, ...extra }));
const wood = mat('#66534b'), edgeMat = mat('#b39469', { metalness: .5, roughness: .4 });
const stone = mat('#454c5a'), dark = mat('#20212e');
const colors = ['#92785f','#4f7378','#877490','#8b4f56','#b59a69','#53627b'];
const bookMats=colors.map(c=>mat(c));
const random=createVisualRandom('decoration');
const dustRandom=createVisualRandom('dust');
const sunRandom=createVisualRandom('hud-sun');
function mesh(geo, material, x=0, y=0, z=0, parent=scene) {
  const o = new THREE.Mesh(geo, material); o.position.set(x,y,z); parent.add(o); return o;
}
function box(w,h,d,m,x,y,z,parent) { return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent); }
function ring(radius,y,thickness,color) {
  const o = mesh(new THREE.TorusGeometry(radius,thickness,8,96),color,0,y,0); o.rotation.x = Math.PI/2; return o;
}
// The tower is open at its heart: all architecture is genuine 3D geometry.
mesh(new THREE.CylinderGeometry(19,19,132,64,1,true), mat('#38404d',{side:THREE.BackSide}),0,65,0);
for(let i=0;i<16;i++) {
  const a=i*Math.PI/8;
  mesh(new THREE.CylinderGeometry(.26,.38,130,7),stone,18.5*Math.cos(a),65,18.5*Math.sin(a));
}
for(let level=0;level<12;level++) {
  const y=100-level*7;
  ring(18.6,y,.14,edgeMat);
  for(let i=0;i<16;i++) {
    const a=i*Math.PI/8;
    const g=new THREE.Group(); g.position.set(18.6*Math.cos(a),y+1.1,18.6*Math.sin(a)); g.rotation.y=-a; scene.add(g);
    box(.8,1.8,3.7,wood,0,0,0,g);
    for(let b=0;b<6;b++) box(.86,.6+random()*.9,.25,bookMats[(random()*6)|0],-.1,.15,b*.5-1.25,g);
  }
}
// Tall jewel windows, lead lattice and sunset beyond the panes.
const glassTextures=createGlassTextures();
const glassGlowPalette=glassTextures.palette.map(color=>new THREE.Color(color));
const glassMats=[...glassTextures.mosaics,...glassTextures.wideMosaics].map((texture,i)=>{const material=mat('#ffffff',{map:texture,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.65,transparent:true,opacity:.94,side:THREE.DoubleSide});material.userData.beamColor=new THREE.Color(['#f52c9e','#7244ff','#22bfff','#ffcf38'][i%4]);return material;});
const roseMat=new THREE.MeshBasicMaterial({map:glassTextures.rose,transparent:true,side:THREE.DoubleSide,depthWrite:false});
for(const glass of glassMats)glass.userData.glowPalette=glassGlowPalette;
const windowPanes=[];
for(let i=0;i<8;i++) {
  const a=i*Math.PI/4+.18; const group=new THREE.Group(); group.position.set(Math.cos(a)*18.2,106,Math.sin(a)*18.2);group.rotation.y=-a+Math.PI/2;scene.add(group);
  box(3.7,11,.22,edgeMat,0,0,0,group);
  for(let x=0;x<3;x++) for(let y=0;y<6;y++) {
    windowPanes.push(box(1.02,1.63,.28,glassMats[(x+y+i)%4],(x-1)*1.14,(y-2.5)*1.76,-.05,group));
  }
  const crown=mesh(new THREE.TorusGeometry(1.83,.13,6,24,Math.PI),edgeMat,0,5.5,0,group);
  crown.rotation.z=0;
  mesh(new THREE.CircleGeometry(1.65,48),roseMat,0,6.1,-.18,group);
}
for(let y=10;y<95;y+=16)for(let i=0;i<8;i++){
  const a=i*Math.PI/4+.18,window=new THREE.Group();window.position.set(Math.cos(a)*18.1,y,Math.sin(a)*18.1);window.rotation.y=-a+Math.PI/2;scene.add(window);
  box(2.3,5.8,.2,edgeMat,0,0,0,window);
  for(let j=0;j<4;j++)windowPanes.push(box(1.95,1.25,.24,glassMats[4+(i+j)%4],0,(j-1.5)*1.38,-.1,window));
}
const catcher=new THREE.Group();catcher.position.set(12,107,0);scene.add(catcher);
const catcherRing=mesh(new THREE.TorusGeometry(1.65,.055,8,64),edgeMat,0,0,0,catcher);
const catcherGems=[];
for(let i=0;i<7;i++) {
  const a=i*Math.PI*2/7; const gem=mesh(new THREE.OctahedronGeometry(.35),glassMats[i%4],Math.cos(a)*1.3,Math.sin(a)*1.3,0,catcher);gem.rotation.z=a;
  catcherGems.push(gem);
  box(.025,1.8,.025,edgeMat,Math.cos(a)*1.3,Math.sin(a)*1.3-1.2,0,catcher);
}
const lipGeo = new THREE.CylinderGeometry(SHELF_OUTER_RADIUS+.05,SHELF_OUTER_RADIUS+.05,.1,12,1,true,Math.PI/2-SHELF_HALF_ANGLE,SHELF_HALF_ANGLE*2);
const hazards=[], glints=[], bottles=[], beasts=[], books=[];
const reservedThreatShelves=new Set(Array.from({length:END},(_,s)=>s).filter(s=>(s>4&&s%5===0)||(s>6&&s%11===0)||(s>12&&s%28===16)||(s>20&&s%29===23)||(s>10&&s%27===13)));
const threats=createThreats(gaps,END,reservedThreatShelves);
const movingPlatforms=threats.filter(threat=>threat.type===ThreatType.MOVING_PLATFORM);
const walkableFloors=[];
const shadowMat=softShadowMaterial();
const glintMat=new THREE.MeshBasicMaterial({color:'#ffe4a0'});
// Each shelf has a stable, slightly different inward reach.
function shelfSegment(s) {
  const p=route(s); const group=new THREE.Group();group.position.y=p.y;group.rotation.y=-p.theta;scene.add(group);
  const shape=new THREE.Shape();const a=SHELF_HALF_ANGLE;
  shape.absarc(0,0,SHELF_OUTER_RADIUS,-a,a,false);shape.absarc(0,0,shelfInnerRadius(s),a,-a,true);shape.closePath();
  const shelfThickness=.7;
  const geo=new THREE.ExtrudeGeometry(shape,{depth:shelfThickness,bevelEnabled:false,curveSegments:5});geo.rotateX(-Math.PI/2);
  const floor=mesh(geo,wood,0,-shelfThickness-.02,0,group);floor.userData={s,theta:p.theta,y:p.y-.02};walkableFloors.push(floor);
  const lip=mesh(lipGeo,edgeMat,0,-.12,0,group);
  const platform=movingPlatforms.find(threat=>threat.s===s);
  if(platform){
    platform.group=group;
    platform.indicator=mesh(lipGeo,new THREE.MeshBasicMaterial({color:'#ff8750',transparent:true,opacity:0,depthWrite:false}),0,.015,0,group);
    platform.indicator.visible=false;
  }
  if(s%4===0) {
    const support=box(.18,1.5,1.4,edgeMat,SHELF_OUTER_RADIUS-.6,-.9,0,group);support.rotation.z=-.6;
    for(let b=0;b<3;b++) {const book=box(.6,.35+random()*.4,.95,bookMats[(s+b)%6],SHELF_OUTER_RADIUS-.75,-.05+b*.22,.3,group);book.rotation.y=random()*.4;}
  }
}
for(let s=0;s<=END+1;s++) {
  if(!gaps.includes(s)) shelfSegment(s);
  if(s>4 && s%5===0 && !isGap(s)) {
    const p=route(s,(s%3-1)*.7); const o=mesh(new THREE.OctahedronGeometry(.22),glintMat,p.x,p.y+.65,p.z);glints.push({s,lane:(s%3-1)*.7,o,taken:false});
  }
  if(s>6 && s%11===0 && !isGap(s)) {
    const lane=s%2 ? -.75 : .75,p=route(s,lane);
    const o=mesh(new THREE.PlaneGeometry(2.4,2.4),shadowMat,p.x,p.y+.06,p.z);o.rotation.x=-Math.PI/2;
    hazards.push({s,lane,o});
  }
  if(s>10 && s%27===13) {
    const lane=s%2 ? 1 : -1,p=route(s,lane);const o=new THREE.Group();o.position.set(p.x,p.y+.55,p.z);scene.add(o);
    const bm=mat('#a39ae4',{transparent:true,opacity:.7,metalness:.2,roughness:.15,emissive:'#55477c',emissiveIntensity:.5});
    mesh(new THREE.SphereGeometry(.45,12,10),bm,0,0,0,o);mesh(new THREE.CylinderGeometry(.13,.18,.48,8),bm,0,.48,0,o);mesh(new THREE.CylinderGeometry(.16,.16,.13,8),edgeMat,0,.75,0,o);
    bottles.push({s,lane,o,cooldown:0});
  }
  if(s>12 && s%28===16) {
    const beast=createShadowBeast(BEAST_KINDS[beasts.length%BEAST_KINDS.length]);scene.add(beast.o);
    beasts.push({s,lane:0,...beast});
  }
  if(s>20 && s%29===23) {
    const o=box(1.9,.35,1.25,mat('#79597c'),0,0,0);const p=route(s);const warning=mesh(new THREE.CircleGeometry(1.25,24),new THREE.MeshBasicMaterial({color:'#e8a570',transparent:true,opacity:.3,side:THREE.DoubleSide}),p.x,p.y+.05,p.z);warning.rotation.x=-Math.PI/2;
    books.push({s,o,warning,phase:s*.4});
  }
}
// Thousands of decorative books are rendered in six instanced draw calls.
scene.updateMatrixWorld(true);
for(const material of bookMats){
  const batch=[];scene.traverse(o=>{if(o.isMesh&&o.material===material)batch.push(o);});
  const instances=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,batch.length);
  batch.forEach((o,i)=>{const {width,height,depth}=o.geometry.parameters;instances.setMatrixAt(i,o.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(width,height,depth)));o.removeFromParent();o.geometry.dispose();});
  instances.instanceMatrix.needsUpdate=true;scene.add(instances);
}
scene.updateMatrixWorld(true);
const shadowShelves=new Set([...hazards,...beasts,...books,...threats].map(object=>object.s));
const threatVisuals=new ThreatVisuals(scene,threats);
const windowLight=createWindowLight(windowPanes,walkableFloors,shadowShelves);scene.add(windowLight.group);
windowLight.setDepthSource(towerMist.depthTarget.depthTexture,towerMist.material.uniforms.resolution.value,towerMist.material.uniforms.cameraRange.value);
const groundSmoke=new GroundShadowSmoke(scene,hazards.map(h=>({...route(h.s,h.lane),gap:false})));
// Shared soft texture for VFX and the rabbit's small emissive halo.
const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
const ctx=glowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,244,195,1)');gradient.addColorStop(.15,'rgba(255,219,129,.7)');gradient.addColorStop(.5,'rgba(255,193,82,.13)');gradient.addColorStop(1,'rgba(255,193,82,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
const glowTexture=new THREE.CanvasTexture(glowCanvas);
const pickupEffects=new PickupEffects(scene,glowTexture);
const shadowEffects=new ShadowEffects(scene,glowTexture,$('shadow-vfx'),matchMedia('(prefers-reduced-motion: reduce)').matches);
const rabbit=new THREE.Group();scene.add(rabbit);
const catcherRay=new CatcherRay(scene,catcherGems);
const rabbitVisual=new THREE.Group();rabbit.add(rabbitVisual);
const rabbitShadowCanvas=document.createElement('canvas');rabbitShadowCanvas.width=rabbitShadowCanvas.height=128;
const rabbitShadowContext=rabbitShadowCanvas.getContext('2d');
const rabbitShadowGradient=rabbitShadowContext.createRadialGradient(64,64,3,64,64,64);
rabbitShadowGradient.addColorStop(0,'rgba(12,8,15,.78)');rabbitShadowGradient.addColorStop(.38,'rgba(12,8,15,.62)');rabbitShadowGradient.addColorStop(.72,'rgba(12,8,15,.24)');rabbitShadowGradient.addColorStop(1,'rgba(12,8,15,0)');
rabbitShadowContext.fillStyle=rabbitShadowGradient;rabbitShadowContext.fillRect(0,0,128,128);
const rabbitShadowTexture=new THREE.CanvasTexture(rabbitShadowCanvas);
const rabbitShadowMaterial=new THREE.MeshBasicMaterial({map:rabbitShadowTexture,color:'#fff',transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide,fog:false,polygonOffset:true,polygonOffsetFactor:-1});
const rabbitShadow=mesh(new THREE.PlaneGeometry(1,1),rabbitShadowMaterial,0,0,0);
rabbitShadow.rotation.x=-Math.PI/2;rabbitShadow.scale.set(1.35,.92,1);rabbitShadow.renderOrder=1;
const shadowRaycaster=new THREE.Raycaster(),shadowRayOrigin=new THREE.Vector3(),shadowRayDown=new THREE.Vector3(0,-1,0);
const rabbitEars=[],rabbitPaws=[];
const rabbitMat=new THREE.MeshStandardMaterial({color:'#fff1bc',emissive:'#ffe4a0',emissiveIntensity:1,roughness:1});
const rabbitHPFade={value:1};
rabbitMat.onBeforeCompile=shader=>{
  shader.uniforms.rabbitHPFade=rabbitHPFade;
  shader.fragmentShader='uniform float rabbitHPFade;\n'+shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\ngl_FragColor.rgb *= rabbitHPFade;');
};
const rabbitGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:'#ffe7ac',transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));
rabbitGlow.position.y=.45;rabbitGlow.scale.set(1.3,1.55,1);rabbitVisual.add(rabbitGlow);
mesh(new THREE.SphereGeometry(.28,16,12),rabbitMat,0,.27,0,rabbitVisual).scale.set(1,1,.8);
mesh(new THREE.SphereGeometry(.2,12,10),rabbitMat,0,.49,.14,rabbitVisual);
const eyeMat=new THREE.MeshBasicMaterial({color:'#252137',fog:false});
const eyeSparkMat=new THREE.MeshBasicMaterial({color:'#fff9e8',fog:false});
const eyeBaseColor=eyeMat.color.clone(),eyeSparkBaseColor=eyeSparkMat.color.clone();
for(const x of [-.085,.085]){
  const eye=mesh(new THREE.SphereGeometry(.046,12,10),eyeMat,x,.535,.316,rabbitVisual);
  eye.scale.set(.84,1.12,.55);
  mesh(new THREE.SphereGeometry(.012,8,6),eyeSparkMat,x-.009,.55,.339,rabbitVisual);
}
for(const x of [-.11,.11]) {const ear=mesh(new THREE.SphereGeometry(.08,12,8),rabbitMat,x,.79,.12,rabbitVisual);ear.scale.y=2.5;ear.rotation.z=-x*1.5;rabbitEars.push(ear);}
for(const x of [-.13,.13]){const paw=mesh(new THREE.SphereGeometry(1,12,8),rabbitMat,x,.065,.12,rabbitVisual);paw.scale.set(.1,.065,.16);rabbitPaws.push(paw);}
const rabbitTail=mesh(new THREE.SphereGeometry(.13,10,8),rabbitMat,0,.3,-.26,rabbitVisual);
const rabbitAnimation=new RabbitAnimation(rabbitVisual,rabbitEars,rabbitPaws,rabbitTail);
const vitralGlow=new VitralGlow(rabbitVisual,glowTexture);
const crystalGroup=new THREE.Group(); const end=route(END+1);crystalGroup.position.set(end.x,end.y,end.z);scene.add(crystalGroup);
mesh(new THREE.CylinderGeometry(1.5,1.9,.5,8),stone,0,0,0,crystalGroup);
const crystalMat=mat('#b7dfdd',{metalness:.4,roughness:.12,emissive:'#62cfca',emissiveIntensity:.5});
const crystal=mesh(new THREE.OctahedronGeometry(1.15),crystalMat,0,1.7,0,crystalGroup);crystal.scale.y=1.8;
const crystalLight=new THREE.PointLight('#a2ffeb',20,35,1.3);crystalLight.position.copy(crystalGroup.position).add(new THREE.Vector3(0,3,0));scene.add(crystalLight);
ring(4,14,.07,edgeMat);
const dustCount=650,dustArray=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){const a=dustRandom()*Math.PI*2,r=4+dustRandom()*13;dustArray[i*3]=Math.cos(a)*r;dustArray[i*3+1]=dustRandom()*122;dustArray[i*3+2]=Math.sin(a)*r;}
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustArray,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#f8d8a1',size:.065,transparent:true,opacity:.65,depthWrite:false}));scene.add(dust);

let state='intro',s=0,lane=0,height=0,velocity=0,light=100,collected=0,invert=0,slow=0,lastSafe=0,time=0,toastTime=0,currentVitralZone=null;
let facing=-.5,facingTarget=-.5,moveSpeed=0;
const keys=new Set();let jumpQueued=false;let audio=null,muted=true;
function tone(freq=660,length=.15){if(muted)return;audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(.055,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+length);}
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;toastTime=4;}
function reset(){resetThreats(threats);vitralGlow.reset();rabbitAnimation.reset();moveSpeed=0;shadowEffects.clear();pickupEffects.clear();facing=0;facingTarget=0;viewAnchor=0;cameraNeedsReset=true;s=0;lane=0;height=0;velocity=0;light=100;collected=0;currentVitralZone=null;invert=0;slow=0;lastSafe=0;time=0;keys.clear();jumpQueued=false;for(const g of glints){g.taken=false;g.o.visible=true;g.o.scale.setScalar(1);}for(const b of bottles)b.cooldown=0;for(const b of beasts)resetShadowBeast(b);crystalMat.emissiveIntensity=.5;crystalLight.intensity=20;sun.intensity=4.1;scene.background.set('#303849');scene.fog.color.set('#303849');for(const m of glassMats)m.emissiveIntensity=.65;}
function start(){reset();state='playing';$('intro').hidden=true;$('hud').hidden=false;$('modal').hidden=true;document.body.classList.add('playing');toast('D / → — к кристаллу. Перепрыгивай разрывы, собирай блики.');tone(523,.4);}
function showModal(kicker,title,text,button){$('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-text').textContent=text;$('resume').innerHTML=button+' <span>↗</span>';$('modal').hidden=false;}
function pause(){if(state==='playing'){state='paused';keys.clear();showModal('ТИШИНА В БАШНЕ','Маленькая пауза','Свет подождёт тебя.','Продолжить');}else if(state==='paused'){state='playing';$('modal').hidden=true;}}
function finish(won){state=won?'won':'lost';keys.clear();if(won){tone(1046,1.8);showModal('ПОСЛЕДНИЙ ЛУЧ СОХРАНЁН','Свет останется.','Снаружи наступила ночь. Но в окнах башни снова мерцает магия. Собрано бликов: '+collected+'.','Ещё одно лето');}else{tone(164,.6);showModal('ДАЖЕ СОЛНЦУ НУЖЕН ОТДЫХ','Свет погас…','Тени оказались сильнее. Собирай блики и перепрыгивай тёмные участки.','Зажечься снова');}}
$('start').onclick=start;$('pause').onclick=pause;$('restart').onclick=start;$('resume').onclick=()=>state==='paused'?pause():start();
$('sound').onclick=()=>{muted=!muted;$('sound').textContent='Звук: '+(muted?'выкл.':'вкл.');tone(784,.3);};
const supported=new Set(['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Escape']);
addEventListener('keydown',e=>{if(!supported.has(e.code))return;e.preventDefault();if(e.code==='Escape'&&!e.repeat)pause();if(e.code==='Space'&&!e.repeat&&state==='playing')jumpQueued=true;keys.add(e.code);});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
for(const button of document.querySelectorAll('[data-key]')){button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);if(button.dataset.key==='Space')jumpQueued=true;};button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.key);}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function update(dt){
  const previousFoot=route(s,lane).y+height+.12;
  time+=dt;invert=Math.max(0,invert-dt);slow=Math.max(0,slow-dt);
  updateThreats(threats,time);
  for(const platform of movingPlatforms)if(platform.warning&&!platform.notified&&Math.abs(s-platform.s)<2){platform.notified=true;toast('Полка сдвигается! Прыгай или держись внутреннего края.');tone(240,.12);}
  const forward=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const radial=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const direction=invert>0?-1:1;
  const beforeMove=route(s,lane);
  s=clamp(s+forward*direction*(slow>0?.65:1.45)*dt,0,END);
  lane=clamp(lane+radial*direction*2.6*dt,-LANE_LIMIT,LANE_LIMIT);
  const afterMove=route(s,lane),dx=afterMove.x-beforeMove.x,dz=afterMove.z-beforeMove.z;
  moveSpeed=Math.hypot(dx,dz)/Math.max(dt,.0001);
  if(dx*dx+dz*dz>1e-10)facingTarget=Math.atan2(dx,dz);
  if(jumpQueued&&height<=.001){velocity=JUMP_SPEED;tone(470,.1);}jumpQueued=false;
  const jump=advanceJump(height,velocity,dt);height=jump.height;velocity=jump.velocity;
  for(const threat of threats)if(ThreatInfo[threat.type]&&!threat.introduced&&Math.abs(s-threat.s)<2.3){threat.introduced=true;toast(ThreatInfo[threat.type].hint);tone(320,.16);}
  const threatHit=consumeThreatHit(threats,{s,lane,height},time);
  if(threatHit){light=Math.max(0,light-ThreatInfo[threatHit.type].damage);shadowEffects.hit();tone(170,.15);toast(ThreatInfo[threatHit.type].name+' · −'+ThreatInfo[threatHit.type].damage+' света');}
  let inShadow=false;
  for(const h of hazards)if(Math.abs(s-h.s)<.65&&Math.abs(lane-h.lane)<.85&&height<.8)inShadow=true;
  const missingSupport=unsupportedThreat(threats,s,lane);
  if(missingSupport&&height===0&&velocity<=0){shadowEffects.hit();light=Math.max(0,light-14);s=lastSafe;velocity=JUMP_SPEED;height=.2;toast(missingSupport.type===ThreatType.HOLE?'Провал поглотил часть света. Прыгай чуть раньше.':'Полка ушла из-под ног! Держись ближе к центру башни.');}
  else if(!missingSupport&&height===0&&!movingPlatforms.some(platform=>Math.round(s)===platform.s))lastSafe=s;
  for(const g of glints)if(!g.taken&&Math.abs(s-g.s)<.65&&Math.abs(lane-g.lane)<1&&height<1.8){g.taken=true;pickupEffects.collect(g.o);light=clamp(light+22,0,100);collected++;tone(800+collected%4*90);toast('+22 света · осколок заката');}
  for(const b of bottles){b.cooldown=Math.max(0,b.cooldown-dt);if(Math.abs(s-b.s)<.65&&Math.abs(lane-b.lane)<.7&&height<1&&b.cooldown===0){b.cooldown=7;if(b.s%2){invert=2.5;toast('Преломление! Управление отражено на 2,5 секунды');}else{slow=3;toast('Густой свет · замедление на 3 секунды');}tone(270,.2);}}
  for(const b of beasts){
    if(b.dead){animateBeastDeath(b,dt);continue;}
    if(Math.abs(s-b.s)<3)b.lane=THREE.MathUtils.damp(b.lane,lane,1.6,dt);
    const leap=Math.max(0,Math.sin(time*2.7+b.s)),p=route(b.s,b.lane),prey=route(s,lane);
    b.o.position.set(p.x,p.y+leap*.8,p.z);
    const yaw=Math.abs(s-b.s)<6?Math.atan2(prey.x-p.x,prey.z-p.z):-p.theta;
    b.o.rotation.y=turnTowards(b.o.rotation.y,yaw,dt);
    animateShadowBeast(b,time,leap);
    const top=p.y+leap*.8+b.stompTop,foot=route(s,lane).y+height+.12;
    const overlaps=Math.abs(s-b.s)<.58&&Math.abs(lane-b.lane)<.78;
    if(canStomp(previousFoot,foot,b.lastTop??top,top,velocity,overlaps)){
      killShadowBeast(b,currentVitralZone?.palette??(vitralGlow.strength>.01?vitralGlow.palette:null));height=Math.max(height,top-route(s,lane).y+.03);velocity=5.5;
      tone(360,.25);toast('Тень рассеяна!');continue;
    }
    b.lastTop=top;
    if(Math.abs(s-b.s)<.75&&Math.abs(lane-b.lane)<1&&height<1.2)inShadow=true;
  }
  for(const b of books){const cycle=(time+b.phase)%5;const p=route(b.s);b.o.position.set(p.x,p.y+(cycle<3?6:Math.max(.25,6-(cycle-3)*8)),p.z);b.o.rotation.set(cycle*.3,cycle,.25);b.warning.visible=cycle>2.2;b.warning.material.opacity=.2+Math.sin(time*12)*.1;if(cycle>3.6&&Math.abs(s-b.s)<.65&&height<.8)inShadow=true;}
  const wasInVitral=!!currentVitralZone,lightPosition=route(s,lane);
  currentVitralZone=windowLight.sampleLight(new THREE.Vector3(lightPosition.x,lightPosition.y,lightPosition.z),height);
  if(currentVitralZone&&!wasInVitral){tone(1100,.3);toast('Свет витража · восстановление ×2');}
  light=lightStep(light,dt,{shadow:inShadow,vitral:!!currentVitralZone});
  shadowEffects.setDamage(inShadow);
  $('effect').textContent=inShadow?'Тень забирает свет!':currentVitralZone?'Витраж · восстановление ×2':invert>0?'Управление отражено':slow>0?'Преломление замедляет':'В свете заката';
  if(light<=0)finish(false);else if(s>=END-.1)finish(true);
  $('light-value').innerHTML=Math.ceil(light)+'<small>%</small>';
  const lightFill=$('light-fill');lightFill.style.width=clamp(light,0,100)+'%';lightFill.dataset.empty=String(light<=0);
  const lightSun=$('light-sun');lightSun.style.left=clamp(light,0,100)+'%';lightSun.hidden=light<=0;
  lightFill.parentElement.style.setProperty('--sun-position',clamp(light,0,100)+'%');
  lightFill.parentElement.style.setProperty('--sun-power',light>0?'1':'0');
  $('progress').style.width=s/END*100+'%';$('floor').textContent='Этаж '+floorAt(s)+' / 12';$('shards').textContent='Блики: '+collected;
}
let previous=performance.now(),visualTime=0,viewAnchor=0,smoothAnchor=0,anchorVelocity=0;
let previousSunLight=100,sunMotion=0,sunOrbit=0,sunWasRegenerating=false;
const sunParticleColors=['#ff95db','#ad98ff','#7de4ff','#9affca','#fff09a'];
const sunDisc=document.createElement('span');sunDisc.className='sun-disc';$('light-sun').prepend(sunDisc);
for(let i=0;i<18;i++){
  const particle=document.createElement('i');particle.className='sun-particle';
  const angle=sunRandom()*Math.PI*2,distance=24+sunRandom()*20;
  particle.style.setProperty('--particle-x',Math.cos(angle)*distance+'px');
  particle.style.setProperty('--particle-y',Math.sin(angle)*distance-10+'px');
  particle.style.setProperty('--particle-color',sunParticleColors[Math.floor(sunRandom()*sunParticleColors.length)]);
  particle.style.setProperty('--particle-delay',(sunRandom()*.3)+'s');
  $('light-sun').appendChild(particle);
}
const target=new THREE.Vector3(),desired=new THREE.Vector3();
function emitSunParticle(particle,initial=false){
  const angle=sunRandom()*Math.PI*2,distance=24+sunRandom()*20;
  const x=Math.cos(angle)*distance,y=Math.sin(angle)*distance-10;
  const duration=2200+sunRandom()*650;
  particle.style.setProperty('--particle-color',sunParticleColors[Math.floor(sunRandom()*sunParticleColors.length)]);
  const animation=particle.animate([
    {transform:'translate(0px,0px) scale(0)',opacity:0,offset:0,easing:'cubic-bezier(.2,0,.4,1)'},
    {transform:`translate(${x*.65}px,${y*.65}px) scale(.7)`,opacity:.85,offset:550/duration,easing:'ease-out'},
    {transform:`translate(${x}px,${y}px) scale(.65)`,opacity:.85,offset:1-360/duration,easing:'cubic-bezier(.2,0,.4,1)'},
    {transform:'translate(0px,0px) scale(0)',opacity:0,offset:1},
  ],{duration,delay:sunRandom()*(initial?300:160)});
  animation.onfinish=()=>{if(sunWasRegenerating)emitSunParticle(particle);};
}
let cameraNeedsReset=true;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.04);previous=now;visualTime+=dt;
  if(state==='playing')update(dt);
  threatVisuals.update(time);
  const sunMoving=state==='playing'&&Math.abs(light-previousSunLight)>dt*.01;
  previousSunLight=light;
  sunMotion=THREE.MathUtils.damp(sunMotion,sunMoving?1:0,sunMoving?7:9,dt);
  sunOrbit+=dt*(2.4+.8*Math.sin(visualTime*.73)+.35*Math.sin(visualTime*1.31))*sunMotion;
  const sunRadius=2.5*sunMotion*(.75+.25*Math.sin(sunOrbit*1.37));
  $('light-sun').style.setProperty('--sun-x',(Math.cos(sunOrbit)*sunRadius).toFixed(3)+'px');
  $('light-sun').style.setProperty('--sun-y',(Math.sin(sunOrbit)*sunRadius).toFixed(3)+'px');
  const sunHealth=clamp(light/100,0,1);
  $('light-sun').style.setProperty('--sun-health',sunHealth.toFixed(3));
  const sunValue=.2+.8*sunHealth;
  $('light-sun').style.setProperty('--sun-multiply',`rgb(${Math.round(255*sunValue)},${Math.round(255*sunValue*(.47+.53*sunHealth))},${Math.round(255*sunValue*sunHealth)})`);
  $('light-sun').style.setProperty('--sun-glow',(3+sunHealth*14).toFixed(2)+'px');
  const sunRegenerating=state==='playing'&&!!currentVitralZone;
  if(sunRegenerating!==sunWasRegenerating){
    for(const particle of $('light-sun').querySelectorAll('.sun-particle')){
      const current=getComputedStyle(particle),transform=current.transform,opacity=current.opacity;
      for(const animation of particle.getAnimations())animation.cancel();
      if(sunRegenerating){
        emitSunParticle(particle,true);
      }
      else{
        particle.style.animation='none';
        particle.animate([
          {transform,opacity,offset:0},
          {transform:'translate(0px,0px) scale(.15)',opacity,offset:.88},
          {transform:'translate(0px,0px) scale(0)',opacity:0,offset:1},
        ],{duration:360,easing:'cubic-bezier(.2,0,.4,1)',fill:'forwards'});
      }
    }
    sunWasRegenerating=sunRegenerating;
  }
  $('light-sun').classList.toggle('vitral-sun',sunRegenerating);
  towerMist.update(state==='intro'?visualTime:time,state==='won');
  shadowMat.uniforms.clock.value=time;groundSmoke.update(time,innerHeight*renderer.getPixelRatio());
  if(state==='playing'||state==='won'||state==='lost')pickupEffects.update(dt);
  if(state!=='won'){
    const daylight=depthLight(s);
    ambient.intensity=.16+daylight*1.94;sun.intensity=.1+daylight*4;
    warm.intensity=4+daylight*136;
    scene.background.copy(new THREE.Color('#080c17').lerp(new THREE.Color('#303849'),daylight));
    scene.fog.density=.017+(1-daylight)*.018;
    scene.fog.color.set('#111827').lerp(new THREE.Color('#a18b72'),daylight*.7);
    for(const glass of glassMats)glass.emissiveIntensity=.035+daylight*.615;
    windowLight.update(.22+daylight*.78,visualTime);
  }
  else windowLight.update(0);
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0;}
  const p=route(s,lane);rabbit.position.set(p.x,p.y+.12+height,p.z);
  const hasFloor=!unsupportedThreat(threats,s,lane);
  let shadowSurface=null;
  if(hasFloor){
    shadowRayOrigin.set(p.x,rabbit.position.y+3,p.z);
    shadowRaycaster.set(shadowRayOrigin,shadowRayDown);shadowRaycaster.far=18;
    const nearbyFloors=walkableFloors.filter(floor=>Math.abs(floor.userData.s-s)<1.2);
    for(const floor of nearbyFloors)floor.updateWorldMatrix(true,false);
    shadowSurface=shadowRaycaster.intersectObjects(nearbyFloors,false)[0]??null;
  }
  const shadowHeight=shadowSurface?Math.max(0,rabbit.position.y-shadowSurface.point.y-.12):0;
  rabbitShadow.visible=!!shadowSurface&&state!=='won';
  if(shadowSurface)rabbitShadow.position.set(p.x,shadowSurface.point.y+.012,p.z);
  rabbitShadow.scale.set(1.35+shadowHeight*.14,.92+shadowHeight*.1,1);
  rabbitShadowMaterial.opacity=.9*(1-THREE.MathUtils.smoothstep(shadowHeight,0,2.5)*.72);
  shadowEffects.setVisible(state==='playing');
  if(state==='playing')shadowEffects.update(dt,rabbit.position);
  if(state==='playing')facing=turnTowards(facing,facingTarget,dt);
  rabbit.rotation.y=facing;
  if(state==='playing')rabbitAnimation.update(dt,{speed:moveSpeed,height,velocity,turn:Math.atan2(Math.sin(facingTarget-facing),Math.cos(facingTarget-facing))});
  const brightness=hpBrightness(light);rabbitHPFade.value=brightness;
  rabbitMat.color.setRGB(1,.91,.64);
  rabbitMat.emissive.setRGB(.62,.47,.2);
  eyeMat.color.copy(eyeBaseColor).multiplyScalar(brightness);eyeSparkMat.color.copy(eyeSparkBaseColor).multiplyScalar(brightness);
  rabbitGlow.material.opacity=.2*brightness;
  rabbitGlow.material.color.set('#ffe7ac');
  if(state==='playing')vitralGlow.update(dt,currentVitralZone,brightness,time);
  else if(state==='lost'||state==='won')vitralGlow.reset();
  if(vitralGlow.strength>0){
    rabbitMat.color.lerp(vitralGlow.bodyColor,vitralGlow.strength*.7);
    rabbitMat.emissive.lerp(vitralGlow.bodyColor,vitralGlow.strength*.85);
    rabbitGlow.material.color.lerp(vitralGlow.bodyColor,vitralGlow.strength);
  }
  if(state==='playing'&&shadowEffects.active){const dim=1-shadowEffects.intensity*.25;rabbitMat.color.multiplyScalar(dim);rabbitMat.emissive.multiplyScalar(dim);rabbitGlow.material.opacity*=dim;}
  for(const g of glints)if(!g.taken){g.o.rotation.y=visualTime;g.o.rotation.z=visualTime*.7;g.o.position.y=route(g.s).y+.7+Math.sin(visualTime*2+g.s)*.15;}
  catcher.rotation.y=Math.sin(visualTime*.3)*.4;crystal.rotation.y=visualTime*.3;dust.rotation.y=visualTime*.004;
  if(state==='intro') {viewAnchor=0;desired.set(3+Math.sin(visualTime*.09)*1.5,104,16);target.copy(rabbit.position).add(new THREE.Vector3(0,.45,0));camera.position.lerp(desired,1-Math.exp(-dt*2));}
  else if(state==='won'){desired.set(end.x*.38,end.y+8,end.z*.38);target.copy(crystalGroup.position).add(new THREE.Vector3(0,2,0));camera.position.lerp(desired,1-Math.exp(-dt*.9));sun.intensity=THREE.MathUtils.damp(sun.intensity,.08,.7,dt);scene.background.lerp(new THREE.Color('#0d152a'),dt*.4);scene.fog.color.copy(scene.background);crystalMat.emissiveIntensity=THREE.MathUtils.damp(crystalMat.emissiveIntensity,5,1,dt);crystalLight.intensity=THREE.MathUtils.damp(crystalLight.intensity,250,1,dt);for(const m of glassMats)m.emissiveIntensity=2+Math.sin(visualTime*2)*.6;rabbit.visible=false;}
  else {
    rabbit.visible=true;
    // Position and focus stay fixed while the player crosses the visible arc.
    viewAnchor=cameraAnchor(s,viewAnchor,camera.aspect);
    if(cameraNeedsReset){smoothAnchor=s;anchorVelocity=0;}
    const motion=smoothCameraAnchor(smoothAnchor,anchorVelocity,viewAnchor,dt);
    smoothAnchor=motion.value;anchorVelocity=motion.velocity;
    const pose=cameraPose(smoothAnchor,camera.aspect);
    desired.set(pose.position.x,pose.position.y,pose.position.z);
    const nextTarget=new THREE.Vector3(pose.target.x,pose.target.y,pose.target.z);
    camera.position.copy(desired);
    target.copy(nextTarget);
    cameraNeedsReset=false;
  }
  camera.lookAt(target);
  if(state==='playing')shadowEffects.applyShake(camera);
  towerMist.renderDepth(renderer,scene,camera);
  catcherRay.update(dt,visualTime,rabbit,state!=='won'&&state!=='lost',camera);
  renderer.render(scene,camera);
}
camera.position.set(3,104,16);requestAnimationFrame(frame);
