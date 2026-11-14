import {createRabbitTraveler} from './rabbit-model.js';
import {flashRunStart} from './start-flash.js';
import {VitralEntryEffects} from './vitral-entry-effects.js';
import {ArenaShelfVisibility} from './arena-shelf-visibility.js';
import {Springboards,bounceVelocity} from './springboards.js';
import {VICTORY_BONUS} from './progression-balance.js';
import {initializeMainMenu} from './main-menu.js';
import {FloorArenas} from './floor-arenas.js';
import {BossHitEffects} from './boss-hit-effects.js';
import {LandingEffects} from './landing-effects.js';
import {playImpact} from './impact-audio.js';
import {PlatformerMotion} from './platformer-motion.js';
import {arenaInput,ARENA_RADIUS} from './arena-state.js';
import * as THREE from 'three';
import {CatcherAura} from './catcher-aura.js';
import {spiralEnemyAt} from './enemy-config.js';
import {createEnemy,damageEnemy} from './enemy-factory.js';
import {nextRunURL} from './run-navigation.js';
import {FrameClock} from './frame-clock.js';
import {fadeToNextRun,revealNextRun} from './run-transition.js';
import { createVisualRandom } from './visual-random.js';
import { END, FLOOR_COUNT, TOWER_TOP, gaps, clamp, isGap, lightStep, route, cameraAnchor, turnTowards, floorAt, depthLight, canStomp, SHELF_HALF_ANGLE, SHELF_INNER_RADIUS, SHELF_OUTER_RADIUS, MOVEMENT_LANE_LIMIT, JUMP_SPEED, advanceJump } from './game.js';
import { cameraPose, smoothCameraAnchor } from './camera.js';
import { PickupEffects } from './pickup-effects.js';
import { ShadowEffects } from './shadow-effects.js';
import { animateShadowBeast, resetShadowBeast, animateBeastDeath } from './shadow-beast.js';
import { createWindowLight, SUN_RAY_DIRECTION } from './window-light.js';
import { createGlassTextures } from './stained-glass.js';
import { softShadowMaterial, GroundShadowSmoke } from './ground-shadows.js';
import { TowerMist } from './tower-mist.js';
import { applyTowerDepth } from './tower-depth.js';
import { RabbitAnimation } from './rabbit-animation.js';
import { hpBrightness } from './game.js';
import { shelfInnerRadius } from './game.js';
import { VitralGlow } from './vitral-glow.js';
import { ThreatType, ThreatInfo, createThreats, updateThreats, resetThreats, consumeThreatHit, hasShelfSupport,platformPassenger,carryPlatformPassenger } from './threats.js';
import { ThreatVisuals } from './threat-visuals.js';
import {RabbitState,RabbitMode,traceVitralPath} from './rabbit-state.js';
import {FallingShadows} from './falling-shadows.js';
import {createStairMaterials,createEnchantedStep} from './enchanted-stairs.js';
import {Abilities,AbilityType,AbilityInfo,applySpiralPhase,phaseHitsTarget} from './abilities.js';
import {PhaseTrail} from './phase-trail.js';
import {createAncientLibrary} from './ancient-library.js';
import {FloorGates} from './floor-gates.js';
import {RUN_UPGRADES,progression} from './progression.js';
import {SkillTree} from './skill-tree.js';
import {BeastVitralBurst} from './beast-vitral-burst.js';
import { CatcherRay } from './catcher-ray.js';
import {createShelfDecorations} from './shelf-decorations.js';
import {FloatingParchment} from './floating-parchment.js';
import {BeastKnockback} from './beast-knockback.js';
import {AtmosphericFocus} from './atmospheric-focus.js';
import {UnderShelfRelics} from './under-shelf-relics.js';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#000000');
scene.fog = new THREE.FogExp2('#303849', .015);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' }); }
catch { $('intro').innerHTML = '<h1>Нужен WebGL</h1><p>Открой игру в браузере с аппаратным ускорением.</p>'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor('#000000',1);
renderer.clear();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const towerMist=new TowerMist(scene);
const floatingParchment=new FloatingParchment(scene);
const atmosphericFocus=new AtmosphericFocus();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 240);
const ambient=new THREE.HemisphereLight('#a1bdcc', '#5a3849', 2.1);scene.add(ambient);
const sun = new THREE.DirectionalLight('#ffcf87', 4.1);sun.target.position.set(0,TOWER_TOP,0);sun.position.copy(sun.target.position).addScaledVector(SUN_RAY_DIRECTION,-40);
scene.add(sun,sun.target);
const warm = new THREE.PointLight('#ffa769', 140, 65, 1.2); warm.position.set(0, TOWER_TOP-5, -12); scene.add(warm);
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
mesh(new THREE.CylinderGeometry(19,19,132+(TOWER_TOP-100),64,1,true), mat('#38404d',{side:THREE.BackSide}),0,65+(TOWER_TOP-100)/2,0);
for(let i=0;i<16;i++) {
  const a=i*Math.PI/8;
  mesh(new THREE.CylinderGeometry(.26,.38,130+(TOWER_TOP-100),7),wood,18.5*Math.cos(a),65+(TOWER_TOP-100)/2,18.5*Math.sin(a));
}
for(let level=0;level<FLOOR_COUNT;level++) {
  const y=TOWER_TOP-level*7;
  ring(18.6,y,.14,edgeMat);
}
createAncientLibrary(scene);
// Tall jewel windows, lead lattice and sunset beyond the panes.
const glassTextures=createGlassTextures();
const glassGlowPalette=glassTextures.palette.map(color=>new THREE.Color(color));
const glassMats=[...glassTextures.mosaics,...glassTextures.wideMosaics].map((texture,i)=>{const material=mat('#ffffff',{map:texture,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.65,transparent:true,opacity:.94,side:THREE.DoubleSide});material.userData.beamColor=new THREE.Color(['#f52c9e','#7244ff','#22bfff','#ffcf38'][i%4]);return material;});
const roseMat=new THREE.MeshBasicMaterial({map:glassTextures.rose,transparent:true,side:THREE.DoubleSide,depthWrite:false});
for(const glass of glassMats)glass.userData.glowPalette=glassGlowPalette;
const windowPanes=[];
for(let i=0;i<8;i++) {
  const a=i*Math.PI/4+.18; const group=new THREE.Group(); group.position.set(Math.cos(a)*18.2,TOWER_TOP+6,Math.sin(a)*18.2);group.rotation.y=-a+Math.PI/2;scene.add(group);
  box(3.7,11,.22,edgeMat,0,0,0,group);
  for(let x=0;x<3;x++) for(let y=0;y<6;y++) {
    windowPanes.push(box(1.02,1.63,.28,glassMats[(x+y+i)%4],(x-1)*1.14,(y-2.5)*1.76,-.05,group));
  }
  const crown=mesh(new THREE.TorusGeometry(1.83,.13,6,24,Math.PI),edgeMat,0,5.5,0,group);
  crown.rotation.z=0;
  mesh(new THREE.CircleGeometry(1.65,48),roseMat,0,6.1,-.18,group);
}
for(let y=10;y<TOWER_TOP-5;y+=16)for(let i=0;i<8;i++){
  const a=i*Math.PI/4+.18,window=new THREE.Group();window.position.set(Math.cos(a)*18.1,y,Math.sin(a)*18.1);window.rotation.y=-a+Math.PI/2;scene.add(window);
  box(2.3,5.8,.2,edgeMat,0,0,0,window);
  for(let j=0;j<4;j++)windowPanes.push(box(1.95,1.25,.24,glassMats[4+(i+j)%4],0,(j-1.5)*1.38,-.1,window));
}
const catcher=new THREE.Group();catcher.position.set(12,TOWER_TOP+7,0);scene.add(catcher);
const catcherGold=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffe2a0').multiplyScalar(1.65),fog:false,toneMapped:false});
const catcherRing=mesh(new THREE.TorusGeometry(1.65,.055,8,64),catcherGold,0,0,0,catcher);
const catcherGems=[],catcherGlows=[];
for(let i=0;i<7;i++) {
  const a=i*Math.PI*2/7; const gem=mesh(new THREE.OctahedronGeometry(.35),new THREE.MeshBasicMaterial({map:glassMats[i%4].map,color:new THREE.Color(2.8,2.8,2.8),fog:false,toneMapped:false}),Math.cos(a)*1.3,Math.sin(a)*1.3,0,catcher);gem.rotation.z=a;
  gem.material.userData.beamColor=glassMats[i%4].userData.beamColor;
  catcherGems.push(gem);
  box(.025,1.8,.025,catcherGold,Math.cos(a)*1.3,Math.sin(a)*1.3-1.2,0,catcher);
}
catcher.traverse(object=>object.layers.set(2));
const lipGeo = new THREE.CylinderGeometry(SHELF_OUTER_RADIUS+.05,SHELF_OUTER_RADIUS+.05,.1,12,1,true,Math.PI/2-SHELF_HALF_ANGLE,SHELF_HALF_ANGLE*2);
const hazards=[], glints=[], bottles=[], beasts=[], books=[];
const reservedThreatShelves=new Set(Array.from({length:END},(_,s)=>s).filter(s=>(s>4&&s%RUN_UPGRADES.glintSpacing===0)||(s>6&&s%11===0)||!!spiralEnemyAt(s,0)||(s>20&&s%29===23)||(s>10&&s%27===13)));
for(let section=0;section<=END;section++)if(section%14>=11)reservedThreatShelves.add(section);
const threats=createThreats(gaps,END,reservedThreatShelves);
const springboards=new Springboards(scene,threats);
for(const threat of threats)if(threat.type===ThreatType.THORNS)threat.lane=0;
const movingPlatforms=threats.filter(threat=>threat.type===ThreatType.MOVING_PLATFORM);
const walkableFloors=[];
const shadowMat=softShadowMaterial();
const glintMat=new THREE.MeshBasicMaterial({color:'#ffe4a0'});
const stairMaterials=createStairMaterials();
const shelfRelics=new UnderShelfRelics(scene);
const decorateShelf=createShelfDecorations();
// Each shelf has a stable, slightly different inward reach.
function shelfSegment(s) {
  const p=route(s); const group=new THREE.Group();group.position.y=p.y;group.rotation.y=-p.theta;scene.add(group);
  const floor=createEnchantedStep(group,s,stairMaterials);floor.userData={s,theta:p.theta,y:p.y-.02};walkableFloors.push(floor);
  const platform=movingPlatforms.find(threat=>threat.s===s);
  shelfRelics.addShelf(group,s,!!platform);
  if(platform){
    platform.group=group;
    platform.indicator=mesh(lipGeo,new THREE.MeshBasicMaterial({color:'#ff8750',transparent:true,opacity:0,depthWrite:false}),0,.015,0,group);
    platform.indicator.visible=false;
  }
  decorateShelf(group,s);
}
for(let s=0;s<=END+1;s++) {
  if(!gaps.includes(s)) shelfSegment(s);
  if(s>4 && s%RUN_UPGRADES.glintSpacing===0 && !isGap(s)) {
    const p=route(s,(s%3-1)*.7); const o=mesh(new THREE.OctahedronGeometry(.22),glintMat,p.x,p.y+.65,p.z);glints.push({s,lane:(s%3-1)*.7,o,taken:false});
  }
  if(s>6 && s%11===0 && !isGap(s)) {
    const lane=0,p=route(s,lane);
    const o=mesh(new THREE.PlaneGeometry(3,3),shadowMat,p.x,p.y+.06,p.z);o.rotation.x=-Math.PI/2;
    hazards.push({s,lane,o});
  }
  if(s>10 && s%27===13 && s%14<11) {
    const lane=0,p=route(s,lane);const o=new THREE.Group();o.position.set(p.x,p.y+.55,p.z);scene.add(o);
    const bm=mat('#a39ae4',{transparent:true,opacity:.7,metalness:.2,roughness:.15,emissive:'#55477c',emissiveIntensity:.5});
    mesh(new THREE.SphereGeometry(.45,12,10),bm,0,0,0,o);mesh(new THREE.CylinderGeometry(.13,.18,.48,8),bm,0,.48,0,o);mesh(new THREE.CylinderGeometry(.16,.16,.13,8),edgeMat,0,.75,0,o);
    bottles.push({s,lane,o,cooldown:0});
  }
  const enemyId=spiralEnemyAt(s,beasts.length);
  if(enemyId) {
    const enemy=createEnemy(enemyId,{s});scene.add(enemy.o);beasts.push(enemy);
  }
  if(s>20 && s%29===23) {
    const o=box(1.9,.35,1.25,mat('#79597c'),0,0,0);const p=route(s);const warning=mesh(new THREE.CircleGeometry(1.25,24),new THREE.MeshBasicMaterial({color:'#e8a570',transparent:true,opacity:.3,side:THREE.DoubleSide}),p.x,p.y+.05,p.z);warning.rotation.x=-Math.PI/2;
    books.push({s,o,warning,phase:s*.4});
  }
}
shelfRelics.build();
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
const arenaShelfVisibility=new ArenaShelfVisibility(walkableFloors);
windowLight.setDepthSource(towerMist.depthTarget.depthTexture,towerMist.material.uniforms.resolution.value,towerMist.material.uniforms.cameraRange.value);
const groundSmoke=new GroundShadowSmoke(scene,hazards.map(h=>({...route(h.s,h.lane),gap:false})));
// Shared soft texture for VFX and the rabbit's small emissive halo.
const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
const ctx=glowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,244,195,1)');gradient.addColorStop(.15,'rgba(255,219,129,.7)');gradient.addColorStop(.5,'rgba(255,193,82,.13)');gradient.addColorStop(1,'rgba(255,193,82,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
const glowTexture=new THREE.CanvasTexture(glowCanvas);
for(const [i,gem] of catcherGems.entries()){
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:glassGlowPalette[i%glassGlowPalette.length],transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));
  halo.position.copy(gem.position);halo.scale.setScalar(2.65);halo.layers.set(2);catcher.add(halo);catcherGlows.push(halo);
}
const catcherAura=new CatcherAura(catcher,glowTexture);
const floorGates=new FloorGates(scene,glowTexture,glassGlowPalette);
const arenas=new FloorArenas(scene,stairMaterials,glassGlowPalette);
const arenaForward=new THREE.Vector3(),arenaFacing={x:0,z:1};
let arenaCameraReturn=0;
const pickupEffects=new PickupEffects(scene,glowTexture);
const vitralEntryEffects=new VitralEntryEffects(scene);
const bossHitEffects=new BossHitEffects(scene,glowTexture);
const landingEffects=new LandingEffects(scene,glowTexture);
let hitStop=0;
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
const rabbitMat=new THREE.MeshStandardMaterial({color:'#fff1bc',emissive:'#ffe4a0',emissiveIntensity:1,roughness:1});
const rabbitHPFade={value:1};
const rabbitDissolve={value:0};
rabbitMat.onBeforeCompile=shader=>{
  shader.uniforms.rabbitHPFade=rabbitHPFade;
  shader.uniforms.rabbitDissolve=rabbitDissolve;
  shader.fragmentShader='uniform float rabbitHPFade;uniform float rabbitDissolve;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat dissolveGrain=fract(sin(dot(floor(gl_FragCoord.xy*.35),vec2(12.9898,78.233)))*43758.5453);if(dissolveGrain<rabbitDissolve)discard;').replace('#include <fog_fragment>','#include <fog_fragment>\ngl_FragColor.rgb *= rabbitHPFade;');
};
const rabbitGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:'#ffe7ac',transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));
rabbitGlow.position.y=.45;rabbitGlow.scale.set(1.3,1.55,1);rabbitVisual.add(rabbitGlow);
const eyeMat=new THREE.MeshBasicMaterial({color:'#252137',fog:false});
const eyeSparkMat=new THREE.MeshBasicMaterial({color:'#fff9e8',fog:false});
const eyeBaseColor=eyeMat.color.clone(),eyeSparkBaseColor=eyeSparkMat.color.clone();
const traveler=createRabbitTraveler(rabbitVisual,rabbitMat,eyeMat,eyeSparkMat);
const rabbitEars=traveler.ears,rabbitPaws=traveler.paws,rabbitTail=traveler.coat;
const rabbitAnimation=new RabbitAnimation(rabbitVisual,rabbitEars,rabbitPaws,rabbitTail,traveler.arms,traveler.head);
const vitralGlow=new VitralGlow(rabbitVisual,glowTexture);
const abilities=new Abilities(RUN_UPGRADES),phaseTrail=new PhaseTrail(scene),phaseTrailColor=new THREE.Color();
const flareBurst=new BeastVitralBurst(scene,glowTexture);
let flareAge=2,flareQueued=false,flareFrame=false,rescueUsed=false,rescueInvul=0;
const phaseGlowZone={palette:glassGlowPalette};
let phaseQueued=false,phasingFrame=false,phaseGlowWasActive=false,railFacing=1;
const rabbitState=new RabbitState(RUN_UPGRADES);
const fallingShadows=new FallingShadows(scene,glowTexture);
const fallCameraOffset=new THREE.Vector3();
mesh(new THREE.CylinderGeometry(18.6,18.6,.5,64),stone,0,-.25,0);
const crystalGroup=new THREE.Group(); const end=route(END+1);crystalGroup.position.set(end.x,end.y,end.z);scene.add(crystalGroup);
mesh(new THREE.CylinderGeometry(1.5,1.9,.5,8),stone,0,0,0,crystalGroup);
const crystalMat=mat('#b7dfdd',{metalness:.4,roughness:.12,emissive:'#62cfca',emissiveIntensity:.5});
const crystal=mesh(new THREE.OctahedronGeometry(1.15),crystalMat,0,1.7,0,crystalGroup);crystal.scale.y=1.8;
const crystalLight=new THREE.PointLight('#a2ffeb',20,35,1.3);crystalLight.position.copy(crystalGroup.position).add(new THREE.Vector3(0,3,0));scene.add(crystalLight);
ring(4,14,.07,edgeMat);
const dustCount=650,dustArray=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){const a=dustRandom()*Math.PI*2,r=4+dustRandom()*13;dustArray[i*3]=Math.cos(a)*r;dustArray[i*3+1]=dustRandom()*(TOWER_TOP+22);dustArray[i*3+2]=Math.sin(a)*r;}
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustArray,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#f8d8a1',size:.065,transparent:true,opacity:.65,depthWrite:false}));scene.add(dust);

let state='intro',s=0,lane=0,height=0,velocity=0,light=RUN_UPGRADES.maxHP,collected=0,invert=0,slow=0,time=0,toastTime=0,currentVitralZone=null;
let facing=-.5,facingTarget=-.5,moveSpeed=0;
const beastKnockback=new BeastKnockback();
const motion=new PlatformerMotion();
initializeMainMenu();
const keys=new Set();let jumpQueued=false;let audio=null,muted=true;
const skillTree=new SkillTree(()=>{progression.save();const button=skillTree.element.querySelector('#tree-next');button.disabled=true;button.textContent='Готовим забег…';fadeToNextRun(()=>location.assign(nextRunURL(location.href)));});
function tone(freq=660,length=.15){if(muted)return;audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(.055,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+length);}
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;toastTime=4;}
function beginRabbitFall(outward,message,launched=true){
  motion.reset();
  const p=route(s,lane);rabbitState.startFall({x:p.x,y:p.y+.12+height,z:p.z},outward,launched);
  rabbitAnimation.reset();rabbit.rotation.z=0;
  fallCameraOffset.copy(camera.position).sub(rabbit.position);fallCameraOffset.y=0;fallCameraOffset.setLength(7);fallCameraOffset.y=5;
  abilities.reset();phasingFrame=false;phaseQueued=false;keys.clear();jumpQueued=false;moveSpeed=0;currentVitralZone=null;vitralGlow.reset();shadowEffects.setDamage(false);shadowEffects.hit();tone(110,.4);toast(message);$('effect').textContent='Падение';
}
function reset(){springboards.reset();motion.reset();arenas.reset();$('arena-controls').hidden=true;$('movement-mode').textContent='по спирали';for(const button of document.querySelectorAll('.arena-touch'))button.hidden=true;arenaCameraReturn=0;beastKnockback.reset();windowLight.reset();flareQueued=false;flareFrame=false;flareAge=2;flareBurst.reset();rescueUsed=false;rescueInvul=0;railFacing=1;floorGates.reset();abilities.reset();phaseTrail.reset();phaseQueued=false;phasingFrame=false;phaseGlowWasActive=false;rabbitState.reset();fallingShadows.reset();rabbitDissolve.value=0;rabbit.rotation.z=0;rabbit.visible=true;rabbitVisual.scale.setScalar(1);resetThreats(threats);vitralGlow.reset();rabbitAnimation.reset();moveSpeed=0;shadowEffects.clear();pickupEffects.clear();facing=0;facingTarget=0;viewAnchor=0;cameraNeedsReset=true;s=0;lane=0;height=0;velocity=0;light=RUN_UPGRADES.maxHP;collected=0;currentVitralZone=null;invert=0;slow=0;time=0;keys.clear();jumpQueued=false;for(const g of glints){g.taken=false;g.o.visible=true;g.o.scale.setScalar(1);}for(const b of bottles)b.cooldown=0;for(const b of beasts){resetShadowBeast(b);}crystalMat.emissiveIntensity=.5;crystalLight.intensity=20;sun.intensity=4.1;scene.background.set('#303849');scene.fog.color.set('#303849');for(const m of glassMats)m.emissiveIntensity=.65;}
function start(){frameClock.reset();skillTree.element.hidden=true;reset();state='playing';$('intro').hidden=true;$('hud').hidden=false;$('modal').hidden=true;document.body.classList.add('playing');toastTime=0;$('toast').style.opacity=0;tone(523,.4);requestAnimationFrame(()=>{if(state==='playing')flashRunStart();});}
function showModal(kicker,title,text,button){$('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-text').textContent=text;$('resume').textContent=button;$('modal').hidden=false;}
function pause(){if(state==='playing'){state='paused';keys.clear();showModal('','Пауза','','Продолжить');$('resume').focus({preventScroll:true});}else if(state==='paused'){state='playing';$('modal').hidden=true;}}
function finish(won){if(state==='won'||state==='lost')return;if(won)progression.award(VICTORY_BONUS);state=won?'won':'lost';keys.clear();phaseQueued=jumpQueued=flareQueued=false;$('modal').hidden=true;tone(won?1046:164,won?1.8:.6);skillTree.open(won,collected,won?VICTORY_BONUS:0);}
$('start').onclick=start;$('restart').onclick=start;$('resume').onclick=()=>state==='paused'?pause():start();
$('main-menu').onclick=()=>{reset();state='intro';$('modal').hidden=true;$('hud').hidden=true;$('intro').hidden=false;document.body.classList.remove('playing');toastTime=0;$('toast').style.opacity=0;};
$('reset-progress').onclick=()=>{progression.reset();const url=new URL(location.href);url.searchParams.delete('sunny-run');url.searchParams.set('sunny-reset',String(Date.now()));location.assign(url.href);};
$('sound').onclick=()=>{muted=!muted;$('sound').textContent='Звук: '+(muted?'выкл.':'вкл.')+' · debug';$('sound').setAttribute('aria-label',muted?'Включить звук':'Выключить звук');tone(784,.3);};
const supported=new Set(['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyE','Escape','ShiftLeft','ShiftRight']);
addEventListener('keydown',e=>{if(state==='lost'||state==='won'||state==='loading')return;if(!supported.has(e.code))return;e.preventDefault();if(e.code==='Escape'&&!e.repeat)pause();if(e.code==='Space'&&!e.repeat&&state==='playing')jumpQueued=true;if(e.code==='KeyE'&&!e.repeat&&state==='playing')flareQueued=true;if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&!e.repeat&&state==='playing'&&rabbitState.mode!==RabbitMode.FALLING)phaseQueued=true;keys.add(e.code);});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
for(const button of document.querySelectorAll('[data-key]')){button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);if(button.dataset.key==='Space')jumpQueued=true;if(button.dataset.key==='KeyE')flareQueued=true;if(button.dataset.key==='ShiftLeft')phaseQueued=true;};button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.key);}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function updateHUD(){
  $('arena-controls').hidden=!arenas.active;$('movement-mode').textContent=arenas.active?'по арене':'по спирали';
  for(const button of document.querySelectorAll('.arena-touch'))button.hidden=!arenas.active;
  const lightPercent=clamp(light/RUN_UPGRADES.maxHP*100,0,100);
  $('light-value').innerHTML=Math.ceil(lightPercent)+'<small>%</small>';$('light-value').title=Math.ceil(light)+' / '+RUN_UPGRADES.maxHP+' HP';
  const lightFill=$('light-fill');lightFill.style.width=lightPercent+'%';lightFill.dataset.empty=String(light<=0);
  const lightSun=$('light-sun');lightSun.style.left=lightPercent+'%';lightSun.hidden=light<=0;
  lightFill.parentElement.style.setProperty('--sun-position',lightPercent+'%');
  lightFill.parentElement.style.setProperty('--sun-power',light>0?'1':'0');
  $('progress').style.width=s/END*100+'%';$('floor').textContent='Этаж '+floorAt(s)+' / '+FLOOR_COUNT;$('shards').textContent='Блики: '+collected+' · ✦ '+progression.state.points;
}
function updateArena(dt){
  time+=dt;invert=slow=0;
  const active=arenas.active,old={...arenas.player},previousHeight=height;
  camera.getWorldDirection(arenaForward);const direction=arenaInput(keys,arenaForward);
  const entering=active.stage==='entering';
  const movable=!active.collapse&&(active.stage==='fighting'||active.stage==='cleared');
  if(movable){
    if(Math.hypot(direction.x,direction.z)>.01){arenaFacing.x=direction.x;arenaFacing.z=direction.z;}
    const grounded=height<=.001;motion.ground(grounded);if(grounded)abilities.land();
    const jumpVelocity=motion.tryJump(abilities,height,grounded,Math.hypot(motion.x,motion.z)/(4.8*RUN_UPGRADES.speed));
    if(jumpVelocity){velocity=jumpVelocity;rabbitAnimation.jump(jumpVelocity,Math.max(Math.hypot(motion.x,motion.z),Math.hypot(direction.x,direction.z)*4.8*RUN_UPGRADES.speed));tone(470,.1);}
    if(phaseQueued&&abilities.use(AbilityType.PHASING,{direction:arenaFacing,distance:AbilityInfo.phasing.arenaDistance*RUN_UPGRADES.phaseDistance})){
      phaseTrail.reset();tone(950,.15);
    }
  }
  jumpQueued=phaseQueued=false;
  const dash=abilities.advance(dt);phasingFrame=entering||(movable&&!!dash);
  if(movable){const jump=motion.jumpStep(height,velocity,dt,keys.has('Space'));height=jump.height;velocity=jump.velocity;}
  let flare=false;if(movable&&flareQueued&&abilities.use(AbilityType.FLARE)){flare=true;flareAge=0;flareBurst.start(new THREE.Vector3(old.x,old.y+height+.5,old.z),glassGlowPalette);}flareQueued=false;
  const movement=movable?motion.arenaStep(direction,4.8*RUN_UPGRADES.speed,height>.025,dt):{x:0,z:0};
  const result=arenas.update(dt,time,{direction:movement,dash:movable?dash:null,height,previousHeight,velocity,speed:4.8*RUN_UPGRADES.speed,flare,chargedPalette:rabbitState.lightCharge>0?rabbitState.chargeZone?.palette:null});
  const p=arenas.player,dx=p.x-old.x,dz=p.z-old.z;moveSpeed=result.teleported?0:Math.hypot(dx,dz)/Math.max(.0001,dt);
  if(Math.hypot(dx,dz)>.0001)facingTarget=Math.atan2(dx,dz);
  if(result.bounce){height=Math.max(height,result.bounce);velocity=result.jumpRebound?Math.max(velocity,7):bounceVelocity(keys.has('Space'),RUN_UPGRADES.jump);rabbitAnimation.jump(velocity,moveSpeed);motion.cuttable=false;if(!result.jumpRebound)abilities.land();}
  rabbitState.setVitral(null);currentVitralZone=null;
  light=rabbitState.updateLight(light,dt,false,{passive:false});
  if(result.damage){light=Math.max(0,light-result.damage*RUN_UPGRADES.damageScale);shadowEffects.hit();tone(140,.18);}
  if(result.phaseKill){light=Math.min(RUN_UPGRADES.maxHP,light+RUN_UPGRADES.phaseHeal*result.kills);if(RUN_UPGRADES.resonance)abilities.cooldowns.phasing=Math.max(0,abilities.cooldowns.phasing-.5);}
  if(result.hits){
    hitStop=result.kills?.065:.045;
    if(!muted){audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();playImpact(audio,!!result.kills);}
    if(result.impact)bossHitEffects.hit(result.impact,result.impactPalette);
  }
  if(result.reward){scene.attach(result.reward);pickupEffects.collect(result.reward);light=Math.min(RUN_UPGRADES.maxHP,light+RUN_UPGRADES.shardHeal);collected++;progression.award(result.rewardPoints);height=velocity=0;abilities.phase=null;tone(1200,.3);toast('+'+result.rewardPoints+' очков древа');}
  if(result.returning)phasingFrame=true;
  if(result.teleported){s=result.returnedS;lane=0;height=velocity=0;abilities.phase=null;phasingFrame=false;cameraNeedsReset=true;floorGates.arriveAt(s);}
  if(result.cleared){tone(1046,.35);toast('Арена пройдена');}
  shadowEffects.setDamage(false);
  const boss=active.enemies.find(b=>b.boss);
  $('effect').textContent=active.cleared?'Арена пройдена':boss?'Страж · '+Math.max(0,boss.hp)+' / '+boss.maxHP+' · Врагов: '+active.living:'Арена';
  if(light<=0&&RUN_UPGRADES.lastLight&&!rescueUsed){rescueUsed=true;light=RUN_UPGRADES.maxHP*.3;}
  if(light<=0)finish(false);
  if(result.returnedS!==undefined&&!result.teleported){
    motion.reset();
    s=result.returnedS;lane=0;height=velocity=0;abilities.phase=null;phasingFrame=false;arenaCameraReturn=.8;cameraNeedsReset=true;
    if(s>=END-.1&&light>0)finish(true);
  }
  updateHUD();
}
function activateSpring(spring){
  height=Math.max(height,.09);velocity=bounceVelocity(keys.has('Space'),RUN_UPGRADES.jump)*1.15;
  rabbitAnimation.jump(velocity,moveSpeed);
  motion.cuttable=false;motion.jumpBuffer=0;abilities.land();
  landingEffects.land(new THREE.Vector3(spring.p.x,spring.p.y+.07,spring.p.z),.75);tone(keys.has('Space')?880:640,.16);
}
function update(dt){
  motion.tick(dt,jumpQueued);jumpQueued=false;
  if(arenas.active){updateArena(dt);return;}
  if(rabbitState.mode===RabbitMode.FALLING){
    time+=dt;const fall=rabbitState.updateFall(dt);
    if(fall.wallHit&&!fall.wallEffect){fall.wallEffect=true;shadowEffects.hit();tone(95,.2);}
    if(fall.done){light=0;$('light-value').innerHTML='0<small>%</small>';$('light-fill').style.width='0%';$('light-sun').hidden=true;finish(false);}
    return;
  }
  const previousFoot=route(s,lane).y+height+.12;
  rescueInvul=Math.max(0,rescueInvul-dt);flareFrame=false;
  const gatePreviousS=s,gatePreviousLane=lane;
  const passenger=platformPassenger(threats,s,lane,height,motion.jumpBuffer>0||phaseQueued||!!abilities.phase),previousOffset=passenger?.offset;
  time+=dt;invert=Math.max(0,invert-dt);slow=Math.max(0,slow-dt);
  updateThreats(threats,time);
  if(passenger){const carried=carryPlatformPassenger(passenger,s,lane,previousOffset);s=carried.s;lane=carried.lane;}
  for(const platform of movingPlatforms)if(platform.warning&&!platform.notified&&Math.abs(s-platform.s)<2){platform.notified=true;toast('Полка сдвигается! Она несёт тебя к центру — следи за краями.');tone(240,.12);}
  const forward=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const direction=invert>0?-1:1;
  if(forward)railFacing=Math.sign(forward*direction);
  const beforeMoveS=s,beforeMove=route(s,lane);
  const knocked=beastKnockback.advance(dt);
  if(phaseQueued&&!knocked){
    const dashDirection={x:railFacing,z:0};
    if(abilities.use(AbilityType.PHASING,{direction:dashDirection,distance:(SHELF_OUTER_RADIUS-shelfInnerRadius(Math.max(0,Math.round(s))))*AbilityInfo.phasing.distanceScale*RUN_UPGRADES.phaseDistance})){phaseTrail.reset();phaseTrail.update(0,new THREE.Vector3(beforeMove.x,beforeMove.y+.12+height,beforeMove.z),true,camera,rabbitMat.color.clone().multiplyScalar(hpBrightness(light/RUN_UPGRADES.maxHP*100)));tone(950,.15);}
  }
  phaseQueued=false;
  const dash=abilities.advance(dt);phasingFrame=!!dash;
  if(knocked){s=knocked.s;motion.rail=0;}
  else if(dash){const moved=applySpiralPhase(s,lane,dash.x);s=moved.s;lane=moved.lane;}
  else{
    const travel=motion.railStep(forward*direction,(slow>0?.65:1.6)*RUN_UPGRADES.speed,height>.025,dt);
    s=Math.min(END,s+travel*dt);if(!passenger&&height<=.001)lane=THREE.MathUtils.damp(lane,0,12,dt);
  }
  const enteredArena=arenas.enter(beforeMoveS,s,route(beforeMoveS,lane));
  if(enteredArena){motion.reset();s=enteredArena.s;lane=0;height=velocity=0;abilities.phase=null;phasingFrame=true;phaseTrail.reset();floorGates.arriveAt(enteredArena.s);phaseQueued=jumpQueued=false;beastKnockback.reset();rabbitState.setVitral(null);currentVitralZone=null;shadowEffects.setDamage(false);updateHUD();return;}
  if(!knocked&&!dash&&height<.4&&velocity<=0)for(const beast of beasts){
    if(beast.dead||Math.abs(lane-beast.lane)>=beast.stats.laneRadius)continue;
    const side=Math.sign(beforeMoveS-beast.s)||-railFacing;
    if((s-beast.s)*side<beast.stats.blockSection&&(beforeMoveS-beast.s)*side>=0)s=beast.s+side*beast.stats.blockSection;
  }
  const afterMove=route(s,lane),dx=afterMove.x-beforeMove.x,dz=afterMove.z-beforeMove.z;
  moveSpeed=Math.hypot(dx,dz)/Math.max(dt,.0001);
  if(dx*dx+dz*dz>1e-10)facingTarget=Math.atan2(dx,dz);
  const grounded=height<=.001&&hasShelfSupport(threats,s,lane);
  motion.ground(grounded);if(grounded)abilities.land();
  const spring=!knocked&&!dash?springboards.contact(s,lane,height,velocity):null;
  if(spring)activateSpring(spring);
  else if(!knocked){const jumpVelocity=motion.tryJump(abilities,height,grounded,Math.abs(motion.rail)/(1.6*RUN_UPGRADES.speed));if(jumpVelocity){velocity=jumpVelocity;rabbitAnimation.jump(jumpVelocity,Math.max(moveSpeed,Math.abs(forward)));tone(470,.1);}}
  const jump=motion.jumpStep(height,velocity,dt,keys.has('Space'));height=jump.height;velocity=jump.velocity;
  const landedSpring=!knocked&&!dash?springboards.contact(s,lane,height,velocity):null;
  if(landedSpring)activateSpring(landedSpring);
  if(knocked){height=knocked.height;velocity=0;}
  if(flareQueued&&abilities.use(AbilityType.FLARE)){flareFrame=true;flareAge=0;flareBurst.start(new THREE.Vector3(afterMove.x,afterMove.y+height+.5,afterMove.z),glassGlowPalette);tone(1150,.3);}flareQueued=false;
  for(const threat of threats)if(ThreatInfo[threat.type]&&!threat.introduced&&Math.abs(s-threat.s)<2.3){threat.introduced=true;toast(ThreatInfo[threat.type].hint);tone(320,.16);}
  const threatHit=phasingFrame||rescueInvul>0?null:consumeThreatHit(threats,{s,lane,height},time);
  if(threatHit){
    if(threatHit.type===ThreatType.PENDULUM){
      beginRabbitFall(Math.cos((time+threatHit.phase)*Math.PI*2/3.6)>0,'Колокол сбил тебя с полки…');return;
    }
    light=Math.max(0,light-ThreatInfo[threatHit.type].damage*RUN_UPGRADES.damageScale);shadowEffects.hit();tone(170,.15);toast(ThreatInfo[threatHit.type].name+' · −'+ThreatInfo[threatHit.type].damage+' света');
  }
  let inShadow=false;
  for(const h of hazards){const p=route(h.s,h.lane),player=route(s,lane);if(Math.hypot(player.x-p.x,player.z-p.z)<1.12&&Math.abs(player.y+height-p.y)<.8&&height<.8)inShadow=true;}
  if(!phasingFrame&&!hasShelfSupport(threats,s,lane)&&height===0&&velocity<=0&&motion.coyote<=0){beginRabbitFall(lane>2.5,'Под лапами больше нет полки…',false);return;}
  for(const g of glints)if(!g.taken&&Math.abs(s-g.s)<RUN_UPGRADES.magnet&&Math.abs(lane-g.lane)<1.15&&height<1.8){g.taken=true;pickupEffects.collect(g.o);light=clamp(light+RUN_UPGRADES.shardHeal,0,RUN_UPGRADES.maxHP);collected++;progression.award();tone(800+collected%4*90);toast('+'+RUN_UPGRADES.shardHeal+' света · +1 очко древа');}
  for(const b of bottles){b.cooldown=Math.max(0,b.cooldown-dt);if(!phasingFrame&&Math.abs(s-b.s)<.65&&Math.abs(lane-b.lane)<.7&&height<1&&b.cooldown===0){b.cooldown=7;if(b.s%2){invert=2.5*RUN_UPGRADES.potionScale;toast('Преломление! Управление отражено на 2,5 секунды');}else{slow=3*RUN_UPGRADES.potionScale;toast('Густой свет · замедление на 3 секунды');}tone(270,.2);}}
  for(const b of beasts){
    if(b.dead){animateBeastDeath(b,dt);continue;}
    b.hurt=Math.max(0,b.hurt-dt);
    if(Math.abs(s-b.s)<b.stats.trackRange)b.lane=THREE.MathUtils.damp(b.lane,lane,b.stats.trackRate,dt);
    const leap=Math.max(0,Math.sin(time*b.stats.hopSpeed+b.s)),p=route(b.s,b.lane),prey=route(s,lane);
    b.o.position.set(p.x,p.y+leap*b.stats.hopHeight,p.z);
    const yaw=Math.abs(s-b.s)<6?Math.atan2(prey.x-p.x,prey.z-p.z):-p.theta;
    b.o.rotation.y=turnTowards(b.o.rotation.y,yaw,dt);
    animateShadowBeast(b,time,leap);
    if(b.hurt>0)continue;
    if(flareFrame&&Math.hypot(p.x-afterMove.x,p.z-afterMove.z)<3&&Math.abs(p.y+leap*b.stats.hopHeight-afterMove.y-height)<2){damageEnemy(b,glassGlowPalette);continue;}
    if(phasingFrame&&phaseHitsTarget({x:beforeMove.x,y:previousFoot+.33,z:beforeMove.z},{x:afterMove.x,y:afterMove.y+height+.45,z:afterMove.z},{x:p.x,y:p.y+leap*b.stats.hopHeight+.65,z:p.z})){
      if(!damageEnemy(b,currentVitralZone?.palette??glassGlowPalette))continue;
      light=Math.min(RUN_UPGRADES.maxHP,light+RUN_UPGRADES.phaseHeal);if(RUN_UPGRADES.resonance)abilities.cooldowns.phasing=Math.max(0,abilities.cooldowns.phasing-.5);
      tone(640,.2);toast('Витражный прорыв · тень рассеяна!');continue;
    }
    const top=p.y+leap*b.stats.hopHeight+b.stompTop,foot=route(s,lane).y+height+.12;
    const overlaps=Math.abs(s-b.s)<b.stats.stompSection&&Math.abs(lane-b.lane)<b.stats.stompLaneRadius;
    if(!phasingFrame&&canStomp(previousFoot,foot,b.lastTop??top,top,velocity,overlaps)){
      const killed=damageEnemy(b,(rabbitState.lightCharge>0?rabbitState.chargeZone?.palette:null)??currentVitralZone?.palette??(vitralGlow.strength>.01?vitralGlow.palette:null));height=Math.max(height,top-route(s,lane).y+.03);velocity=bounceVelocity(keys.has('Space'),RUN_UPGRADES.jump);rabbitAnimation.jump(velocity,moveSpeed);motion.cuttable=false;abilities.land();
      tone(360,.25);if(killed)toast('Тень рассеяна!');continue;
    }
    b.lastTop=top;
    if(!phasingFrame&&Math.abs(s-b.s)<b.stats.contactSection&&Math.abs(lane-b.lane)<b.stats.laneRadius&&height<b.stats.contactHeight){
      inShadow=true;
      if(beastKnockback.start(s,b.s,railFacing)){height=Math.max(height,.06);velocity=0;phaseQueued=jumpQueued=false;shadowEffects.hit();tone(140,.18);}
    }
  }
  for(const b of books){const cycle=(time+b.phase)%5;const p=route(b.s);b.o.position.set(p.x,p.y+(cycle<3?6:Math.max(.25,6-(cycle-3)*8)),p.z);b.o.rotation.set(cycle*.3,cycle,.25);b.warning.visible=cycle>2.2;b.warning.material.opacity=.2+Math.sin(time*12)*.1;if(cycle>3.6&&Math.abs(s-b.s)<.65&&height<.8)inShadow=true;}
  const wasInVitral=!!currentVitralZone,lightPosition=route(s,lane);
  const lightSteps=Math.max(1,Math.ceil(Math.abs(s-beforeMoveS)/.08));
  for(let i=1;i<=lightSteps;i++){
    const point=route(beforeMoveS+(s-beforeMoveS)*i/lightSteps,lane);
    const zone=windowLight.sampleLight(new THREE.Vector3(point.x,point.y,point.z),height);
    vitralEntryEffects.sample({x:point.x,y:point.y+height,z:point.z},zone);
  }
  if(phasingFrame&&RUN_UPGRADES.rayEntryHeal)traceVitralPath(rabbitState,beforeMoveS,s,lane,height,(point,h)=>windowLight.sampleLight(new THREE.Vector3(point.x,point.y,point.z),h));
  currentVitralZone=windowLight.sampleLight(new THREE.Vector3(lightPosition.x,lightPosition.y,lightPosition.z),height);
  if(currentVitralZone&&!wasInVitral){tone(1100,.3);toast('Свет витража · лечение ускоряется, пока ты в свете');}
  rabbitState.setVitral(currentVitralZone,phasingFrame,height>.025||velocity>0);
  if(phasingFrame||rescueInvul>0)inShadow=false;
  light=rabbitState.updateLight(light,dt,inShadow);
  if(RUN_UPGRADES.rayEntryHeal){
    for(const zone of rabbitState.entryHealedZones)if(!zone.extinguished)windowLight.extinguish(zone);
    if(currentVitralZone?.extinguished&&currentVitralZone.lightStrength<=0){currentVitralZone=null;rabbitState.setVitral(null);if(rabbitState.lightCharge<=0)vitralGlow.reset();}
  }
  shadowEffects.setDamage(inShadow);
  $('effect').textContent=inShadow?'Тень забирает свет!':currentVitralZone?(RUN_UPGRADES.rayEntryHeal?'Витраж · импульсное лечение':'Витраж · +'+(Math.min(50,rabbitState.vitralTime*12.5)*RUN_UPGRADES.regen).toFixed(0)+'/с'):invert>0?'Управление отражено':slow>0?'Преломление замедляет':'В свете заката';
  if(height<3.8){const gate=floorGates.check(gatePreviousS,s,gatePreviousLane,lane);if(gate){tone(880,.35);toast(gate.plank===END?'Последняя арка · кристалл рядом':'Переход на этаж '+gate.nextFloor);}}
  if(light<=0&&RUN_UPGRADES.lastLight&&!rescueUsed){rescueUsed=true;rescueInvul=1;light=RUN_UPGRADES.maxHP*.3;flareAge=0;flareBurst.start(new THREE.Vector3(afterMove.x,afterMove.y+.5,afterMove.z),glassGlowPalette);toast('Последний огонёк · свет вернулся!');}
  if(light<=0)finish(false);else if(s>=END-.1)finish(true);
  updateHUD();
}
const frameClock=new FrameClock();
let visualTime=0,viewAnchor=0,smoothAnchor=0,anchorVelocity=0;
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
function frame(now){requestAnimationFrame(frame);const realDt=frameClock.step(now);if(!skillTree.element.hidden)return;visualTime+=realDt;
  const stopped=state==='playing'&&hitStop>0,dt=stopped?0:realDt;
  hitStop=state==='playing'?Math.max(0,hitStop-realDt):0;
  const previousJumpHeight=height,landingVelocity=velocity;
  if(state==='playing'&&!stopped)update(dt);
  if(state==='playing'&&previousJumpHeight>.025&&height<=.025&&rabbitState.mode!==RabbitMode.FALLING&&!arenas.active?.collapse){
    const p=arenas.active?arenas.player:route(s,lane);
    landingEffects.land(new THREE.Vector3(p.x,p.y+.05,p.z),clamp(Math.abs(landingVelocity)/9,.35,1));
  }
  landingEffects.update(state==='paused'?0:dt);
  vitralEntryEffects.update(state==='playing'?dt:0);
  if(state==='intro'||state==='lost'||state==='won'||rabbitState.mode===RabbitMode.FALLING)vitralEntryEffects.reset();
  if(state==='intro'||state==='lost'||state==='won')landingEffects.reset();
  const arenaView=arenas.active&&!arenas.active.collapse&&['fighting','cleared'].includes(arenas.active.stage)?{y:arenas.active.y,radius:ARENA_RADIUS}:null;
  threatVisuals.update(time);
  arenaShelfVisibility.update(arenas.active);
  shelfRelics.updateDynamic();
  springboards.update(state==='paused'?0:dt,time);
  floatingParchment.update(state==='paused'?0:dt,arenaView);
  arenas.updateRemnants(state==='paused'?0:dt);
  bossHitEffects.update(state==='paused'?0:realDt);
  if(state==='intro'||state==='lost'||state==='won')bossHitEffects.reset();
  floorGates.update(state==='paused'?0:dt);
  if(state!=='paused'&&flareAge<1.8){flareAge+=dt;flareBurst.update(flareAge);}
  $('phase-status').textContent=abilities.cooldowns.phasing>.05?'Phasing '+abilities.cooldowns.phasing.toFixed(1)+'с':'Phasing';
  const sunMoving=state==='playing'&&Math.abs(light-previousSunLight)>dt*.01;
  previousSunLight=light;
  sunMotion=THREE.MathUtils.damp(sunMotion,sunMoving?1:0,sunMoving?7:9,dt);
  sunOrbit+=dt*(2.4+.8*Math.sin(visualTime*.73)+.35*Math.sin(visualTime*1.31))*sunMotion;
  const sunRadius=2.5*sunMotion*(.75+.25*Math.sin(sunOrbit*1.37));
  $('light-sun').style.setProperty('--sun-x',(Math.cos(sunOrbit)*sunRadius).toFixed(3)+'px');
  $('light-sun').style.setProperty('--sun-y',(Math.sin(sunOrbit)*sunRadius).toFixed(3)+'px');
  const sunHealth=clamp(light/RUN_UPGRADES.maxHP,0,1);
  $('light-sun').style.setProperty('--sun-health',sunHealth.toFixed(3));
  $('light-sun').style.setProperty('--sun-sunset',Math.pow(1-sunHealth,.8).toFixed(3));
  $('light-sun').style.setProperty('--sun-glow-color',`hsl(${8+sunHealth*38} 85% ${24+sunHealth*43}%)`);
  $('light-sun').style.setProperty('--sun-glow',(3+sunHealth*14).toFixed(2)+'px');
  const sunRegenerating=state==='playing'&&((rabbitState.mode===RabbitMode.VITRAL&&!RUN_UPGRADES.rayEntryHeal)||rabbitState.healPulse>0);
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
  towerMist.update(state==='intro'?visualTime:time,state==='won',arenaView);
  shadowMat.uniforms.clock.value=time;groundSmoke.update(time,innerHeight*renderer.getPixelRatio());
  if(state==='playing'||state==='won'||state==='lost')pickupEffects.update(dt);
  if(state!=='won'){
    const daylight=depthLight(rabbitState.mode===RabbitMode.FALLING?clamp((TOWER_TOP-rabbitState.fall.y)*2,0,END):s);
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
  const p=arenas.active?arenas.player:route(s,lane);rabbit.position.set(p.x,p.y+.12+height,p.z);
  const falling=rabbitState.mode===RabbitMode.FALLING;
  if(falling){const fall=rabbitState.fall;rabbit.position.set(fall.x,fall.y,fall.z);if(state==='playing'){fallingShadows.update(dt,rabbit.position,.45+fall.dissolve*.55);rabbitAnimation.updateFall(dt);}}
  arenas.setFallHidden(falling);
  rabbitDissolve.value=falling?rabbitState.fall.dissolve:0;
  rabbitVisual.scale.setScalar(falling?1-rabbitState.fall.dissolve*.75:1);
  const hasFloor=!!arenas.active||hasShelfSupport(threats,s,lane);
  let shadowSurface=null;
  if(arenas.active){shadowSurface={point:new THREE.Vector3(p.x,p.y,p.z)};}
  else if(hasFloor){
    shadowRayOrigin.set(p.x,rabbit.position.y+3,p.z);
    shadowRaycaster.set(shadowRayOrigin,shadowRayDown);shadowRaycaster.far=18;
    const nearbyFloors=walkableFloors.filter(floor=>Math.abs(floor.userData.s-s)<1.2);
    for(const floor of nearbyFloors)floor.updateWorldMatrix(true,false);
    shadowSurface=shadowRaycaster.intersectObjects(nearbyFloors,false)[0]??null;
  }
  const shadowHeight=shadowSurface?Math.max(0,rabbit.position.y-shadowSurface.point.y-.12):0;
  rabbitShadow.visible=!!shadowSurface&&state!=='won'&&!falling;
  if(shadowSurface)rabbitShadow.position.set(p.x,shadowSurface.point.y+.012,p.z);
  rabbitShadow.scale.set(1.35+shadowHeight*.14,.92+shadowHeight*.1,1);
  rabbitShadowMaterial.opacity=.9*(1-THREE.MathUtils.smoothstep(shadowHeight,0,2.5)*.72);
  shadowEffects.setVisible(state==='playing');
  if(state==='playing')shadowEffects.update(dt,rabbit.position);
  if(state==='playing')facing=turnTowards(facing,facingTarget,dt*(phasingFrame?4.5:1));
  rabbit.rotation.y=facing;
  if(state==='playing'&&!falling)rabbitAnimation.update(dt,{speed:moveSpeed,height,velocity,dashing:phasingFrame,skidding:!arenas.active&&motion.skidding,turn:Math.atan2(Math.sin(facingTarget-facing),Math.cos(facingTarget-facing))});
  const brightness=hpBrightness(light/RUN_UPGRADES.maxHP*100)*(falling?1-rabbitState.fall.dissolve:1);rabbitHPFade.value=brightness;
  rabbitMat.color.setRGB(1,.98,.94);
  rabbitMat.emissive.setRGB(.48,.46,.42);
  eyeMat.color.copy(eyeBaseColor).multiplyScalar(brightness);eyeSparkMat.color.copy(eyeSparkBaseColor).multiplyScalar(brightness);
  rabbitGlow.material.opacity=.2*brightness;
  rabbitGlow.material.color.set('#ffe7ac');
  if(state==='playing'){
    const heldCharge=rabbitState.lightCharge>0?rabbitState.chargeZone:null;
    if(phaseGlowWasActive&&!phasingFrame&&!currentVitralZone&&!heldCharge)vitralGlow.reset();
    vitralGlow.update(dt,heldCharge??(phasingFrame?phaseGlowZone:currentVitralZone),brightness,time);
    phaseGlowWasActive=phasingFrame;
  }
  else if(state==='lost'||state==='won')vitralGlow.reset();
  if(vitralGlow.strength>0){
    rabbitMat.color.lerp(vitralGlow.bodyColor,vitralGlow.strength*.7);
    rabbitMat.emissive.lerp(vitralGlow.bodyColor,vitralGlow.strength*.85);
    rabbitGlow.material.color.lerp(vitralGlow.bodyColor,vitralGlow.strength);
  }
  if(state==='playing'&&shadowEffects.active){const dim=1-shadowEffects.intensity*.25;rabbitMat.color.multiplyScalar(dim);rabbitMat.emissive.multiplyScalar(dim);rabbitGlow.material.opacity*=dim;}
  for(const hem of traveler.hemMaterials){hem.color.copy(rabbitMat.color);hem.emissive.copy(rabbitMat.emissive);hem.emissiveIntensity=rabbitMat.emissiveIntensity*3;}
  for(const g of glints)if(!g.taken){g.o.rotation.y=visualTime;g.o.rotation.z=visualTime*.7;g.o.position.y=route(g.s).y+.7+Math.sin(visualTime*2+g.s)*.15;}
  catcher.rotation.y=Math.sin(visualTime*.3)*.4;crystal.rotation.y=visualTime*.3;dust.rotation.y=visualTime*.004;
  catcherGlows.forEach((halo,i)=>halo.material.opacity=1.05+Math.sin(visualTime*1.6+i)*.06);
  if(falling){
    rabbit.visible=rabbitState.fall.dissolve<1;
    desired.copy(rabbit.position).add(fallCameraOffset);camera.position.lerp(desired,1-Math.exp(-dt*7));
    target.lerp(rabbit.position.clone().add(new THREE.Vector3(0,.3,0)),1-Math.exp(-dt*10));
  }
  else if(arenas.active){
    const a=arenas.active,zoom=Math.max(1,1.4/camera.aspect);
    desired.set(Math.cos(a.theta-.35)*14*zoom,a.y+12*zoom,Math.sin(a.theta-.35)*14*zoom);
    camera.position.lerp(desired,1-Math.exp(-dt*4));target.lerp(new THREE.Vector3(0,a.y+.5,0),1-Math.exp(-dt*5));
  }
  else if(state==='intro') {viewAnchor=0;desired.set(3+Math.sin(visualTime*.09)*1.5,TOWER_TOP+4,16);target.copy(rabbit.position).add(new THREE.Vector3(0,.45,0));camera.position.lerp(desired,1-Math.exp(-dt*2));}
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
    if(arenaCameraReturn>0){arenaCameraReturn=Math.max(0,arenaCameraReturn-dt);camera.position.lerp(desired,1-Math.exp(-dt*7));target.lerp(nextTarget,1-Math.exp(-dt*7));}
    else{camera.position.copy(desired);target.copy(nextTarget);}
    cameraNeedsReset=false;
  }
  const desiredFov=58;
  camera.fov=THREE.MathUtils.damp(camera.fov,desiredFov,6,dt);camera.updateProjectionMatrix();
  camera.lookAt(target);
  catcherAura.update(visualTime,camera,$('vignette'),innerWidth,innerHeight);
  phaseTrailColor.copy(rabbitMat.color).multiplyScalar(brightness);
  phaseTrail.update(state==='paused'?0:dt,rabbit.position,state==='playing'&&phasingFrame&&!falling,camera,phaseTrailColor);
  if(state==='playing')shadowEffects.applyShake(camera);
  if(state==='playing')bossHitEffects.applyShake(camera);
  windowLight.setArenaMask(arenaView,camera);
  towerMist.renderDepth(renderer,scene,camera);
  catcherRay.update(dt,visualTime,rabbit,state!=='won'&&state!=='lost'&&!falling,camera);
  const fallFade=falling?Math.min(.94,(1-Math.exp(-rabbitState.fall.time*1.2))*.48+rabbitState.fall.dissolve*.46):0;
  atmosphericFocus.render(renderer,scene,camera,rabbit.position,depthLight(s),towerMist.depthTarget.depthTexture,fallFade,arenaView);
}
$('flare-hint').hidden=!RUN_UPGRADES.flare;$('flare-touch').hidden=!RUN_UPGRADES.flare;
camera.position.set(3,TOWER_TOP+4,16);
const runURL=new URL(location.href);
if(runURL.searchParams.has('sunny-reset')){runURL.searchParams.delete('sunny-reset');history.replaceState(history.state,'',runURL.href);}
if(runURL.searchParams.has('sunny-run')){
  start();update(0);state='loading';runURL.searchParams.delete('sunny-run');
  history.replaceState(history.state,'',runURL.href);
}else try{if(sessionStorage.getItem('sunny.next-run')==='1'){sessionStorage.removeItem('sunny.next-run');start();}}catch{}
requestAnimationFrame(frame);
requestAnimationFrame(()=>revealNextRun(()=>{if(state==='loading'){keys.clear();frameClock.reset();state='playing';flashRunStart();}}));
