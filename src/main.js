import {runResources,releaseRunResources} from './run-resources.js';
import {rebuildFloorLayout} from './floor-config.js';
import {refreshRunGeometry} from './game.js';
import {preparationStep} from './preparation.js';
import {UIPreparation,decodeUIImages} from './ui-preparation.js';
import {PropBatches} from './prop-batches.js';
import {StairBatches} from './stair-batches.js';
import {RenderCulling,freezeStaticKit} from './render-culling.js';
import {createPerformanceProbe} from './performance-probe.js';
import {debugOptions,initializeDebugOptions} from './debug-options.js';
let generatedDebugOptions=debugOptions();
import {runHistory} from './run-history.js';
import {RunStatistics} from './run-statistics.js';
import {runTelemetry} from './run-telemetry.js';
import {RunSummary} from './run-summary.js';
import {Combo} from './combo.js';
import {renderLocalized} from './localized-text.js';
import './localized-text.css';
import {RunItems} from './run-items.js';
import runItemConfig from './run-items.json' with {type:'json'};
import {RunItemUI} from './run-item-ui.js';
import {PauseItems} from './pause-items.js';
import {chestBounce} from './chest-bounce.js';
import {wallBayCenter,windowSteps} from './wall-layout.js';
import {createChestModel} from './chest-model.js';
import {ComboHUD} from './combo-hud.js';
import {TowerDescentHUD} from './tower-descent-hud.js';
import {addBrokenStairEdges} from './broken-stair-edge.js';
import {tr,onLanguageChange,localizeDOM} from './i18n.js';
import {InputManager} from './input/input-manager.js';
import {FocusIndicator} from './input/focus-indicator.js';
import {BrowserInput} from './input/browser-input.js';
import INPUT from './input/input-actions.json' with {type:'json'};
import {ACTION_CODES} from './settings-store.js';
import {preferences,initializeSettings,t,keyName} from './settings.js';
import {secretTransition} from './secret-transition.js';
import {GrassExitParticles} from './grass-exit-particles.js';
import {SecretDirtParticles} from './secret-dirt-particles.js';
import {VineLeafParticles} from './vine-leaf-particles.js';
import {showLevelDiagnostics} from './level-diagnostics.js';
import './level-diagnostics.css';
import {RandomManager,randomManager,createVisualRandom,freshRunSeed} from './random-manager.js';
import {chestTier,chooseChestTier,rollChestRewards,ChestRewardDispatcher} from './chest-rewards.js';
import {ShelfTravel,sweepShelfLanding,shelfSupport} from './shelf-travel.js';
import {FLOOR_CONFIG,FLOORS,LEVEL_DIAGNOSTICS,TOTAL_SECTIONS,floorForSection,placementAt,stepAt} from './floor-config.js';
import {TowerHierarchy} from './tower-hierarchy.js';
import {updateFoliagePlayer} from './foliage-response.js';
import {warmupFirstActions} from './first-action-warmup.js';
import {SecretLevels} from './secret-levels.js';
import {ShardCounter} from './shard-counter.js';
import './gameplay-hud.css';
import {createGemPickable,COLLECTIBLES} from './collectibles.js';
import INTERACTABLES from './interactables.json' with {type:'json'};
import {LanternLighting} from './lantern-surfaces.js';
import {playVitralAbsorb} from './vitral-absorb-audio.js';
import {RabbitShadowForm} from './rabbit-shadow-form.js';
import {RabbitHitEffects} from './rabbit-hit-effects.js';
import {LightBarRecovery} from './light-bar-recovery.js';
import {createRabbitTraveler} from './rabbit-model.js';
import {flashRunStart} from './start-flash.js';
import {VitralEntryEffects} from './vitral-entry-effects.js';
import {ArenaShelfVisibility} from './arena-shelf-visibility.js';
import {ArenaCameraCutaway} from './arena-camera-cutaway.js';
import {Springboards,bounceVelocity} from './springboards.js';
import {VICTORY_BONUS} from './progression-balance.js';
import {initializeMainMenu} from './main-menu.js';
import {FloorArenas} from './floor-arenas.js';
import {BossHitEffects} from './boss-hit-effects.js';
import {LandingEffects} from './landing-effects.js';
import {playImpact} from './impact-audio.js';
import {PlatformerMotion,heightAboveSurface} from './platformer-motion.js';
import {arenaInput,ARENA_RADIUS} from './arena-state.js';
import * as THREE from 'three';
import {CatcherAura} from './catcher-aura.js';
import {spiralEnemyAt} from './enemy-config.js';
import {createEnemy,damageEnemy as applyEnemyDamage} from './enemy-factory.js';

import {FrameClock} from './frame-clock.js';
import {fadeToNextRun,revealNextRun} from './run-transition.js';
import { END, FLOOR_COUNT, TOWER_TOP, gaps, clamp, isGap, lightStep, route, cameraAnchor, turnTowards, depthLight, canStomp, SHELF_HALF_ANGLE, SHELF_INNER_RADIUS, SHELF_OUTER_RADIUS, MOVEMENT_LANE_LIMIT, JUMP_SPEED, advanceJump } from './game.js';
import { cameraPose, smoothCameraAnchor, railCameraHeight, LandingCameraBlend } from './camera.js';
import { PickupEffects } from './pickup-effects.js';
import { ShadowEffects } from './shadow-effects.js';
import { animateShadowBeast, resetShadowBeast, animateBeastDeath } from './shadow-beast.js';
import { createWindowLight, SUN_RAY_DIRECTION } from './window-light.js';
import { createGlassTextures } from './stained-glass.js';
import { softShadowMaterial, contactShadowMaterial, GroundShadowSmoke } from './ground-shadows.js';
import { TowerMist } from './tower-mist.js';
import { applyTowerDepth } from './tower-depth.js';
import { RabbitAnimation } from './rabbit-animation.js';
import { SHADOW_LIGHT_THRESHOLD } from './game.js';
import { shelfInnerRadius,ROUTE_ANGLE } from './game.js';
import { VitralGlow } from './vitral-glow.js';
import { ThreatType, ThreatInfo, updateThreats, resetThreats, consumeThreatHit, hasShelfSupport,unsupportedThreat,platformPassenger,carryPlatformPassenger } from './threats.js';
import { ThreatVisuals } from './threat-visuals.js';
import {RabbitState,RabbitMode} from './rabbit-state.js';
import {FallingShadows} from './falling-shadows.js';
import {createStairMaterials,createEnchantedStep} from './enchanted-stairs.js';
import {createStoneStairs} from './stone-stairs.js';
import {Abilities,AbilityType,AbilityInfo,applySpiralPhase,phaseHitsTarget} from './abilities.js';
import {PhaseTrail} from './phase-trail.js';
import {createAncientLibrary} from './ancient-library.js';
import {FloorGates} from './floor-gates.js';
import {RUN_UPGRADES,progression,skillStats} from './progression.js';
import {SkillTree} from './skill-tree.js';
import {BeastVitralBurst} from './beast-vitral-burst.js';
import { CatcherRay } from './catcher-ray.js';
import {createBackgroundProps} from './background-props.js';
import {FloatingParchment} from './floating-parchment.js';
import {BeastKnockback,canDamageDashCancel} from './beast-knockback.js';
import {AtmosphericFocus} from './atmospheric-focus.js';
import {UnderShelfRelics} from './under-shelf-relics.js';

const $ = id => document.getElementById(id);
const menuScene=new THREE.Scene();menuScene.background=new THREE.Color('#000000');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#000000');
scene.fog = new THREE.FogExp2('#303849', .015);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' }); }
catch { $('intro').innerHTML = `<h1>${tr("WebGL required")}</h1><p>${tr("Open the game in a browser with hardware acceleration enabled.")}</p>`; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor('#000000',1);
renderer.clear();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const atmosphericFocus=new AtmosphericFocus();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 240);
const mat = (color, extra = {}) => applyTowerDepth(new THREE.MeshStandardMaterial({ color, roughness: .75, ...extra }));
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
function shelfSegment(s) {
  const p=route(s); const group=new THREE.Group();group.position.y=p.y;group.rotation.y=-p.theta;scene.add(group);
  const tier=floorForSection(s),step=stepAt(s),stone=tier.stairTheme==='stone';
  const floor=stone?buildStoneStair(group,s,step.style):createEnchantedStep(group,s,stairMaterials);
  addBrokenStairEdges(group,s,gaps,{stone,woodMaterial:stairMaterials.wood,sectionGeometry:floor.geometry});
  group.userData.floorIndex=tier.index;Object.assign(floor.userData,{s,theta:p.theta,y:p.y-.02});walkableFloors.push(floor);
  const platform=movingPlatforms.find(threat=>threat.s===s);
  if(!stone)shelfRelics.addShelf(group,s,!!platform);
  if(platform){
    platform.group=group;
    platform.indicator=mesh(lipGeo,new THREE.MeshBasicMaterial({color:'#ff8750',transparent:true,opacity:0,depthWrite:false}),0,.015,0,group);
    platform.indicator.visible=false;
  }
  if(step.decorations!==false)decorateShelf(group,s,tier.backgroundProps,stone);
  freezeStaticKit(group);
}
// Run-owned scene objects are replaced; renderer, postprocessing and UI stay alive.
let towerMist,floatingParchment,lanternLighting,ambient,sun,warm,edgeMat,wood,dark,stone,colors,bookMats,towerHierarchy,glassTextures,glassGlowPalette,glassMats,roseMat,windowPanes,catcher,catcherGold,catcherRing,catcherGlows,catcherGems,architecture,lipGeo,chests,books,beasts,bottles,glints,hazards,threats,springboards,movingPlatforms,walkableFloors,chestShadowMaterial,chestShadowGeometry,shadowMat,glintMat,stairMaterials,buildStoneStair,shelfRelics,decorateShelf,shadowShelves,threatVisuals,windowLight,arenaShelfVisibility,arenaCameraCutaway,floorSmoke,groundSmoke,glowCanvas,ctx,gradient,glowTexture,catcherAura,floorGates,arenas,secretLevels,vineLeaves,grassExitParticles,secretDirtParticles,arenaFacing,arenaForward,arenaCameraReturn,landingCamera,pickupEffects,pickupSpace,vitralEntryEffects,bossHitEffects,landingEffects,hitStop,shadowEffects,rabbit,catcherRay,rabbitVisual,rabbitShadowCanvas,rabbitShadowContext,rabbitShadowGradient,rabbitShadowTexture,rabbitShadowMaterial,rabbitShadow,shadowRayDown,shadowRayOrigin,shadowRaycaster,rabbitMat,rabbitHPFade,rabbitDissolve,rabbitGlow,eyeMat,eyeSparkMat,eyeSparkBaseColor,eyeBaseColor,traveler,rabbitHitEffects,rabbitShadowForm,rabbitTail,rabbitPaws,rabbitEars,rabbitAnimation,vitralGlow,phaseTrailHead,phaseTrailColor,phaseTrail,abilities,flareBurst,rescueInvul,rescueUsed,flareFrame,flareQueued,flareAge,damageInputLocked,railFacing,phasingFrame,phaseQueued,rabbitState,fallingShadows,fallCameraOffset,crystalGroup,end,crystalMat,crystal,crystalLight,dustArray,dustCount,dustGeo,dust;
async function buildRunWorld(){
scene.matrixWorldAutoUpdate=true;LanternLighting.resetRegistry();
towerMist=new TowerMist(scene);
floatingParchment=new FloatingParchment(scene);


lanternLighting=new LanternLighting(scene);
ambient=new THREE.HemisphereLight('#a1bdcc', '#5a3849', 2.1);scene.add(ambient);
sun=new THREE.DirectionalLight('#ffcf87', 4.1);sun.target.position.set(0,TOWER_TOP,0);sun.position.copy(sun.target.position).addScaledVector(SUN_RAY_DIRECTION,-40);
scene.add(sun,sun.target);
warm=new THREE.PointLight('#ffa769', 140, 65, 1.2); warm.position.set(0, TOWER_TOP-5, -12); scene.add(warm);

wood=mat('#66534b');edgeMat=mat('#b39469', { metalness: .5, roughness: .4 });
stone=mat('#454c5a');dark=mat('#20212e');
colors=['#92785f','#4f7378','#877490','#8b4f56','#b59a69','#53627b'];
bookMats=colors.map(c=>mat(c));






// The tower is open at its heart: all architecture is genuine 3D geometry.
mesh(new THREE.CylinderGeometry(19,19,132+(TOWER_TOP-100),64,1,true), mat('#38404d',{side:THREE.BackSide}),0,65+(TOWER_TOP-100)/2,0);
for(let i=0;i<16;i++) {
  const a=i*Math.PI/8;
  mesh(new THREE.CylinderGeometry(.26,.38,130+(TOWER_TOP-100),7),wood,18.5*Math.cos(a),65+(TOWER_TOP-100)/2,18.5*Math.sin(a));
}
for(let level=0;level<FLOOR_COUNT;level++) {
  const y=TOWER_TOP-FLOORS[level].start*.5;
  ring(18.6,y,.14,edgeMat).userData.floorIndex=level;
}
towerHierarchy=new TowerHierarchy(scene);
for(const floor of FLOORS){await preparationStep('library');const library=createAncientLibrary(scene,{minY:floor.index===FLOORS.length-1?-Infinity:TOWER_TOP-(floor.end+1)*.5,maxY:floor.index===0?Infinity:TOWER_TOP-floor.start*.5});towerHierarchy.add(library,floor.index);freezeStaticKit(library);}
// Tall jewel windows, lead lattice and sunset beyond the panes.
glassTextures=createGlassTextures();
glassGlowPalette=glassTextures.palette.map(color=>new THREE.Color(color));
glassMats=[...glassTextures.mosaics,...glassTextures.wideMosaics].map((texture,i)=>{const material=mat('#303030',{map:texture,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.9,fog:false,transparent:true,opacity:1,side:THREE.DoubleSide});material.userData.beamColor=new THREE.Color(['#f52c9e','#7244ff','#22bfff','#ffcf38'][i%4]);return material;});
roseMat=new THREE.MeshBasicMaterial({map:glassTextures.rose,transparent:true,side:THREE.DoubleSide,depthWrite:false});
for(const glass of glassMats)glass.userData.glowPalette=glassGlowPalette;
windowPanes=[];
for(const floor of FLOORS)for(const {item,section} of windowSteps(floor)){
  const p=route(section),angle=wallBayCenter(item.angleDegrees===undefined?p.theta:item.angleDegrees*Math.PI/180);
  const window=new THREE.Group();window.position.set(Math.cos(angle)*18.1,p.y+(item.heightAboveShelf??floor.windows.heightAboveShelf??4),Math.sin(angle)*18.1);window.rotation.y=-angle+Math.PI/2;scene.add(window);
  window.userData.floorIndex=floor.index;window.userData.targetSection=section;
  const width=item.width??floor.windows.width??2.3,height=item.height??floor.windows.height??5.8,columns=item.columns??floor.windows.columns??1,rows=item.rows??floor.windows.rows??4;
  box(width,height,.2,edgeMat,0,0,0,window);
  for(let x=0;x<columns;x++)for(let j=0;j<rows;j++)windowPanes.push(box((width-.3)/columns-.1,height/rows-.13,.24,glassMats[(columns>1?0:4)+(floor.index+x+j)%4],(x-(columns-1)/2)*(width-.3)/columns,(j-(rows-1)/2)*height/rows,-.1,window));
  if(columns>1){mesh(new THREE.TorusGeometry(width*.49,.13,6,24,Math.PI),edgeMat,0,height*.5,0,window);mesh(new THREE.CircleGeometry(width*.44,48),roseMat,0,height*.5+.6,-.18,window);}
}
catcher=new THREE.Group();catcher.position.set(12,TOWER_TOP+7,0);scene.add(catcher);
catcherGold=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffe2a0').multiplyScalar(1.65),fog:false,toneMapped:false});
catcherRing=mesh(new THREE.TorusGeometry(1.65,.055,8,64),catcherGold,0,0,0,catcher);
catcherGems=[];catcherGlows=[];
for(let i=0;i<7;i++) {
  const a=i*Math.PI*2/7; const gem=mesh(new THREE.OctahedronGeometry(.35),new THREE.MeshBasicMaterial({map:glassMats[i%4].map,color:new THREE.Color(2.8,2.8,2.8),fog:false,toneMapped:false}),Math.cos(a)*1.3,Math.sin(a)*1.3,0,catcher);gem.rotation.z=a;
  gem.material.userData.beamColor=glassMats[i%4].userData.beamColor;
  catcherGems.push(gem);
  box(.025,1.8,.025,catcherGold,Math.cos(a)*1.3,Math.sin(a)*1.3-1.2,0,catcher);
}
catcher.traverse(object=>object.layers.set(2));
architecture=[...scene.children];
lipGeo=new THREE.CylinderGeometry(SHELF_OUTER_RADIUS+.05,SHELF_OUTER_RADIUS+.05,.1,12,1,true,Math.PI/2-SHELF_HALF_ANGLE,SHELF_HALF_ANGLE*2);
hazards=[];glints=[];bottles=[];beasts=[];books=[];chests=[];
threats=FLOORS.flatMap(f=>f.placements.threats.map(item=>({type:item.id,s:item.s,lane:item.lane??0,offset:0,phase:item.phase??item.s*.371,lastHit:-Infinity,introduced:false,notified:false})));
updateThreats(threats,0);
springboards=new Springboards(scene,threats);
for(const threat of threats)if(threat.type===ThreatType.THORNS)threat.lane=0;
movingPlatforms=threats.filter(threat=>threat.type===ThreatType.MOVING_PLATFORM);
walkableFloors=[];
chestShadowMaterial=contactShadowMaterial();
chestShadowGeometry=new THREE.PlaneGeometry(1,1);
shadowMat=softShadowMaterial();
glintMat=new THREE.MeshBasicMaterial({color:'#ffe4a0'});
stairMaterials=createStairMaterials();
buildStoneStair=FLOORS.some(floor=>floor.stairTheme==='stone')?createStoneStairs():null;
shelfRelics=new UnderShelfRelics(scene);
decorateShelf=createBackgroundProps();
// Each shelf has a stable, slightly different inward reach.

for(const floor of FLOORS){
  for(const id of [...(floor.loot.pool??[]),...floor.placements.loot.map(p=>p.id).filter(Boolean)])if(!COLLECTIBLES.variants.some(v=>v.id===id))throw new Error('floors.json: unknown gem '+id);
}
for(let s=0;s<=END+1;s++) {
  await preparationStep('stairs');
  if(!gaps.includes(s)) shelfSegment(s);
  if(placementAt('loot',s) && !isGap(s)) {
    const lootRule=floorForSection(s).loot,lootItem=placementAt('loot',s),lootRng=randomManager.create('loot',floorForSection(s).id,s);
    const limit=lootItem.count??lootRule.gemsPerTile??RUN_UPGRADES.maxGemsPerTile;
    const count=lootItem.count??(lootRng.int(1,limit));
    const rows=count>3?2:1,columns=Math.ceil(count/rows);
    const spacing=Math.min(COLLECTIBLES.placement.spacing,(2*15*SHELF_HALF_ANGLE-1.1)/Math.max(1,columns-1))/(15*ROUTE_ANGLE),floorY=route(s).y;
    for(let i=0;i<count;i++){
      const row=Math.floor(i/columns),rowCount=Math.min(columns,count-row*columns);
      const itemS=s+(i%columns-(rowCount-1)/2)*spacing;
      const itemLane=(lootItem.lane??0)+(rows===2?(row===0?-.48:.48):0);
      if(itemS>END||isGap(itemS))continue;
      const p=route(itemS,itemLane),item=createGemPickable((lootItem.id?COLLECTIBLES.variants.findIndex(v=>v.id===lootItem.id):lootRule.pool?.length?COLLECTIBLES.variants.findIndex(v=>v.id===lootRng.pick(lootRule.pool)):lootRng.int(0,Math.min(RUN_UPGRADES.gemPoolTier,COLLECTIBLES.variants.length)-1)),{s:itemS,lane:itemLane,position:new THREE.Vector3(p.x,floorY+.035,p.z)});
      scene.add(item.o);glints.push(item);
    }
  }
  const shadowThreat=threats.find(threat=>threat.type===ThreatType.SHADOW&&threat.s===s);
  if(shadowThreat && !isGap(s)) {
    const lane=shadowThreat.lane,p=route(s,lane);
    const o=mesh(new THREE.PlaneGeometry(3,3),shadowMat,p.x,p.y+.06,p.z);o.rotation.x=-Math.PI/2;
    hazards.push({s,lane,o});
  }
  const chestPlacement=placementAt('chests',s)??(generatedDebugOptions.chestEveryStep&&s<=END?{}:null);
  if(chestPlacement && !isGap(s)) {
    const chestLane=chestPlacement.lane??0,p=route(s,chestLane),o=new THREE.Group(),{width:w,height:h,depth:d}=INTERACTABLES.chest.model;o.position.set(p.x,p.y+.04,p.z);o.rotation.y=-p.theta;scene.add(o);
    const tierId=chestPlacement.tier??chooseChestTier(randomManager,floorForSection(s).id,s,INTERACTABLES.chest),tier=chestTier(INTERACTABLES.chest,tierId);
    const {lid}=createChestModel(o,{width:w,height:h,depth:d},tier.visuals);
    const shadow=new THREE.Mesh(chestShadowGeometry,chestShadowMaterial);
    const shadowRadius=chestPlacement.shadowRadius??tier.shadowRadius??INTERACTABLES.chest.shadowRadius;
    shadow.rotation.x=-Math.PI/2;shadow.scale.setScalar(shadowRadius*2);
    shadow.position.y=floorForSection(s).stairTheme==='stone'?.045:.005;
    shadow.renderOrder=1;o.add(shadow);
    chests.push({s,lane:chestLane,o,lid,tierId,rewards:chestPlacement.rewards??tier.rewards,broken:false,top:p.y+INTERACTABLES.chest.collision.topOffset,radius:INTERACTABLES.chest.collision.radius});
  }
  if(placementAt('bottles',s) && !isGap(s)) {
    const lane=placementAt('bottles',s).lane??0,p=route(s,lane);const o=new THREE.Group();o.position.set(p.x,p.y+.55,p.z);scene.add(o);
    const bm=mat('#a39ae4',{transparent:true,opacity:.7,metalness:.2,roughness:.15,emissive:'#55477c',emissiveIntensity:.5});
    mesh(new THREE.SphereGeometry(.45,12,10),bm,0,0,0,o);mesh(new THREE.CylinderGeometry(.13,.18,.48,8),bm,0,.48,0,o);mesh(new THREE.CylinderGeometry(.16,.16,.13,8),edgeMat,0,.75,0,o);
    bottles.push({s,lane,o,cooldown:0});
  }
  const enemyId=spiralEnemyAt(s,beasts.length);
  if(enemyId) {
    const enemy=createEnemy(enemyId,{s});enemy.lane=placementAt('enemies',s)?.lane??0;scene.add(enemy.o);beasts.push(enemy);
  }
  if(placementAt('books',s) && !isGap(s)) {
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
shadowShelves=new Set([...hazards,...beasts,...books,...threats].map(object=>object.s));
threatVisuals=new ThreatVisuals(scene,threats);
windowLight=createWindowLight(windowPanes,walkableFloors,shadowShelves);scene.add(windowLight.group);
arenaShelfVisibility=new ArenaShelfVisibility(walkableFloors);
arenaCameraCutaway=new ArenaCameraCutaway(renderer);
windowLight.setDepthSource(towerMist.depthTarget.depthTexture,towerMist.material.uniforms.resolution.value,towerMist.material.uniforms.cameraRange.value);
floorSmoke=FLOORS.map(floor=>{
  const smoke=new GroundShadowSmoke(scene,hazards.filter(h=>floorForSection(h.s).index===floor.index).map(h=>({...route(h.s,h.lane),gap:false})));
  towerHierarchy.add(smoke.points,floor.index);return smoke;
});
groundSmoke={update(time,pixelHeight){for(const smoke of floorSmoke)smoke.update(time,pixelHeight);}};
// Shared soft texture for VFX and the rabbit's small emissive halo.
glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
ctx=glowCanvas.getContext('2d');gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,244,195,1)');gradient.addColorStop(.15,'rgba(255,219,129,.7)');gradient.addColorStop(.5,'rgba(255,193,82,.13)');gradient.addColorStop(1,'rgba(255,193,82,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
glowTexture=new THREE.CanvasTexture(glowCanvas);
for(const [i,gem] of catcherGems.entries()){
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:glassGlowPalette[i%glassGlowPalette.length],transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));
  halo.position.copy(gem.position);halo.scale.setScalar(2.65);halo.layers.set(2);catcher.add(halo);catcherGlows.push(halo);
}
catcherAura=new CatcherAura(catcher,glowTexture);
floorGates=new FloorGates(scene,glowTexture,glassGlowPalette);
arenas=new FloorArenas(scene,stairMaterials,glassGlowPalette);
secretLevels=new SecretLevels(scene,stairMaterials);
vineLeaves=new VineLeafParticles(scene,{camera});
grassExitParticles=new GrassExitParticles(scene,{camera});
secretDirtParticles=new SecretDirtParticles(scene,{camera});
for(const r of secretLevels.routes){r.road.mesh.userData.s=r.s+3;r.road.mesh.userData.routeSpan=4;walkableFloors.push(r.road.mesh);}
arenaForward=new THREE.Vector3();arenaFacing={x:0,z:1};
arenaCameraReturn=0;
landingCamera=new LandingCameraBlend();
pickupEffects=new PickupEffects(scene,glowTexture,out=>{rabbit.getWorldPosition(out);out.y+=.45;return out;},camera);
pickupSpace=section=>({followTarget:!!(FLOOR_CONFIG.tower.rotationSpeedDegrees||floorForSection(section).rotationSpeedDegrees)});
vitralEntryEffects=new VitralEntryEffects(scene);
bossHitEffects=new BossHitEffects(scene,glowTexture);
landingEffects=new LandingEffects(scene,glowTexture);
hitStop=0;
shadowEffects=new ShadowEffects(scene,glowTexture,$('shadow-vfx'),matchMedia('(prefers-reduced-motion: reduce)').matches);
rabbit=new THREE.Group();scene.add(rabbit);
catcherRay=new CatcherRay(scene,catcherGems);
rabbitVisual=new THREE.Group();rabbit.add(rabbitVisual);
rabbitShadowCanvas=document.createElement('canvas');rabbitShadowCanvas.width=rabbitShadowCanvas.height=128;
rabbitShadowContext=rabbitShadowCanvas.getContext('2d');
rabbitShadowGradient=rabbitShadowContext.createRadialGradient(64,64,3,64,64,64);
rabbitShadowGradient.addColorStop(0,'rgba(12,8,15,.78)');rabbitShadowGradient.addColorStop(.38,'rgba(12,8,15,.62)');rabbitShadowGradient.addColorStop(.72,'rgba(12,8,15,.24)');rabbitShadowGradient.addColorStop(1,'rgba(12,8,15,0)');
rabbitShadowContext.fillStyle=rabbitShadowGradient;rabbitShadowContext.fillRect(0,0,128,128);
rabbitShadowTexture=new THREE.CanvasTexture(rabbitShadowCanvas);
rabbitShadowMaterial=new THREE.MeshBasicMaterial({map:rabbitShadowTexture,color:'#fff',transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide,fog:false,polygonOffset:true,polygonOffsetFactor:-1});
rabbitShadow=mesh(new THREE.PlaneGeometry(1,1),rabbitShadowMaterial,0,0,0);
rabbitShadow.rotation.x=-Math.PI/2;rabbitShadow.scale.set(1.35,.92,1);rabbitShadow.renderOrder=1;
shadowRaycaster=new THREE.Raycaster();shadowRayOrigin=new THREE.Vector3();shadowRayDown=new THREE.Vector3(0,-1,0);shadowRaycaster.layers.enable(7);
rabbitMat=new THREE.MeshStandardMaterial({color:'#fff1bc',emissive:'#ffe4a0',emissiveIntensity:1,roughness:1});
rabbitHPFade={value:1};
rabbitDissolve={value:0};
rabbitMat.onBeforeCompile=shader=>{
  shader.uniforms.rabbitHPFade=rabbitHPFade;
  shader.uniforms.rabbitDissolve=rabbitDissolve;
  shader.fragmentShader='uniform float rabbitHPFade;uniform float rabbitDissolve;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat dissolveGrain=fract(sin(dot(floor(gl_FragCoord.xy*.35),vec2(12.9898,78.233)))*43758.5453);if(dissolveGrain<rabbitDissolve)discard;').replace('#include <fog_fragment>','#include <fog_fragment>\ngl_FragColor.rgb *= rabbitHPFade;');
};
rabbitGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:'#ffe7ac',transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));
rabbitGlow.position.y=.45;rabbitGlow.scale.set(1.3,1.55,1);rabbitVisual.add(rabbitGlow);
eyeMat=new THREE.MeshBasicMaterial({color:'#252137',fog:false});
eyeSparkMat=new THREE.MeshBasicMaterial({color:'#fff9e8',fog:false});
eyeBaseColor=eyeMat.color.clone();eyeSparkBaseColor=eyeSparkMat.color.clone();
traveler=createRabbitTraveler(rabbitVisual,rabbitMat,eyeMat,eyeSparkMat);
await preparationStep('effects');
rabbitHitEffects=new RabbitHitEffects(scene,rabbit,rabbitVisual);
rabbitShadowForm=new RabbitShadowForm(scene);
rabbitEars=traveler.ears;rabbitPaws=traveler.paws;rabbitTail=traveler.coat;
rabbitAnimation=new RabbitAnimation(rabbitVisual,rabbitEars,rabbitPaws,rabbitTail,traveler.arms,traveler.head);
vitralGlow=new VitralGlow(rabbitVisual,glowTexture);
abilities=new Abilities(RUN_UPGRADES);phaseTrail=new PhaseTrail(scene);phaseTrailColor=new THREE.Color();phaseTrailHead=new THREE.Vector3();
flareBurst=new BeastVitralBurst(scene,glowTexture);
flareAge=2;flareQueued=false;flareFrame=false;rescueUsed=false;rescueInvul=0;

phaseQueued=false;phasingFrame=false;railFacing=1;damageInputLocked=false;
rabbitState=new RabbitState(RUN_UPGRADES);
fallingShadows=new FallingShadows(scene,glowTexture);
fallCameraOffset=new THREE.Vector3();
mesh(new THREE.CylinderGeometry(18.6,18.6,.5,64),stone,0,-.25,0);
crystalGroup=new THREE.Group(); end=route(END+1);crystalGroup.position.set(end.x,end.y,end.z);scene.add(crystalGroup);
mesh(new THREE.CylinderGeometry(1.5,1.9,.5,8),stone,0,0,0,crystalGroup);
crystalMat=mat('#b7dfdd',{metalness:.4,roughness:.12,emissive:'#62cfca',emissiveIntensity:.5});
crystal=mesh(new THREE.OctahedronGeometry(1.15),crystalMat,0,1.7,0,crystalGroup);crystal.scale.y=1.8;
crystalLight=new THREE.PointLight('#a2ffeb',20,35,1.3);crystalLight.position.copy(crystalGroup.position).add(new THREE.Vector3(0,3,0));scene.add(crystalLight);
ring(4,14,.07,edgeMat);
dustCount=650;dustArray=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){const a=dustRandom()*Math.PI*2,r=4+dustRandom()*13;dustArray[i*3]=Math.cos(a)*r;dustArray[i*3+1]=dustRandom()*(TOWER_TOP+22);dustArray[i*3+2]=Math.sin(a)*r;}
dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustArray,3));
dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#f8d8a1',size:.065,transparent:true,opacity:.65,depthWrite:false}));scene.add(dust);

}
await buildRunWorld();

let state='intro',s=0,lane=0,height=0,velocity=0,light=RUN_UPGRADES.maxHP,collected=0,invert=0,slow=0,time=0,toastTime=0,currentVitralZone=null;
const lightBarRecovery=new LightBarRecovery(light);
const shardCounter=new ShardCounter($('shards'));
const combo=new Combo(undefined,{enabled:RUN_UPGRADES.comboEnabled}),comboHUD=new ComboHUD(document.body);
const towerDescent=new TowerDescentHUD($('tower-descent'),FLOORS);
function healFromShard(amount=RUN_UPGRADES.shardHeal){
  light=clamp(light+amount,0,RUN_UPGRADES.maxHP);
  lightBarRecovery.receive(light);
}
let facing=-.5,facingTarget=-.5,moveSpeed=0;
const beastKnockback=new BeastKnockback();
const motion=new PlatformerMotion();
const shelfTravel=new ShelfTravel();
const playerRoute=(s,lane=0)=>shelfTravel.position(s,lane);
initializeMainMenu();initializeDebugOptions();
const keys=new Set();const inputManager=new InputManager();let inputDevices;let jumpQueued=false;let audio=null,masterAudio=null,muted=preferences.volume===0;
const skillTree=new SkillTree(()=>nextRun());
const runItems=new RunItems(runItemConfig,randomManager);
const runSummary=new RunSummary(runItems,async()=>{
  keys.clear();inputDevices?.clear();inputManager.clear();
  if(skillTree.preparation?.state!=='ready'){
    runSummary.element.hidden=false;
    const next=runSummary.element.querySelector('.summary-continue');next.disabled=true;next.textContent=tr('Preparing run…');
    try{await skillTree.prepare();}catch(error){console.error('Skill tree preparation failed',error);next.disabled=false;next.textContent=tr('Continue to upgrades');return;}
    runSummary.close();
  }
  skillTree.open(state==='won',collected,state==='won'?VICTORY_BONUS:0);
});
runSummary.onRestart=()=>nextRun();
let statisticsReturn='menu';
const statisticsUI=new RunStatistics(runItems,runHistory,()=>{keys.clear();inputDevices?.clear();inputManager.clear();if(statisticsReturn==='summary'){runSummary.element.hidden=false;runSummary.render();}else document.getElementById('intro-statistics')?.focus();});
runSummary.history=runHistory;runSummary.onCompare=()=>{statisticsReturn='summary';runSummary.element.hidden=true;statisticsUI.open();inputManager.clear();};
const reportPreparation=new UIPreparation([
  ()=>decodeUIImages([new URL('./menu-flourish.svg',import.meta.url).href]),
  ()=>document.fonts.ready,
  ()=>runSummary.prepare()
]);
// Common report UI is prepared in the menu; tree raster work continues in idle slots.
reportPreparation.prepare().then(()=>skillTree.prepare()).catch(error=>console.error('Report UI preparation failed',error));
const statisticsButton=document.getElementById('intro-statistics')??document.createElement('button');statisticsButton.id='intro-statistics';statisticsButton.className='text-button';statisticsButton.textContent=tr('Statistics');statisticsButton.dataset.i18n='Statistics';$('reset-progress').before(statisticsButton);statisticsButton.onclick=()=>{statisticsReturn='menu';keys.clear();inputDevices?.clear();inputManager.clear();statisticsUI.open();};
function recordRun(type,data={}){runTelemetry.emit(type,{floorId:floorForSection(s).id,...data});}
function damageEnemy(enemy,palette){const killed=applyEnemyDamage(enemy,palette);if(killed)recordRun('enemy.killed',{id:enemy.definition.id,boss:enemy.boss});return killed;}
runItems.reset(skillStats(progression.state),progression.state.owned);
const runItemUI=new RunItemUI(runItems,id=>{
  const item=runItems.choose(id);if(!item)return;recordRun('item.acquired',{id});
  runItems.apply(RUN_UPGRADES);light=clamp(light+(item.restoreLight??0),0,RUN_UPGRADES.maxHP);
  lightBarRecovery.receive(light);keys.clear();inputDevices?.clear();inputManager.clear();updateHUD();tone(880,.2);
},()=>{keys.clear();inputDevices?.clear();inputManager.clear();jumpQueued=phaseQueued=flareQueued=false;});
const pauseItems=new PauseItems(runItems,$('modal').querySelector('.modal-card'));
const chestRewardConsumers=new ChestRewardDispatcher({
  gem:(reward,{chest:c,index:i,count})=>{
    const itemS=c.s+(i-(count-1)/2)*.13,p=route(itemS,0),gem=createGemPickable(reward.variant,{s:itemS,lane:0,position:new THREE.Vector3(p.x,p.y+.035,p.z)});
    scene.add(gem.o);towerHierarchy.worldDriven(gem.o,floorForSection(itemS).index);gem.fromChest=true;
    gem.drop={start:visualTime,originX:p.x,fromY:p.y+.035,velocity:2.2+RandomManager.graphics()*1.5,drift:(RandomManager.graphics()-.5)*1.5};gem.o.position.y+=.5;glints.push(gem);
  },
  'item-choice':(reward,{chest,index})=>runItems.request(`${floorForSection(chest.s).id}:${chest.s}:${index}`,reward.pools)
});
function ensureAudio(){audio??=new (window.AudioContext||window.webkitAudioContext)();if(!masterAudio){masterAudio=audio.createGain();masterAudio.gain.value=preferences.volume;masterAudio.connect(audio.destination);}audio.resume();return masterAudio;}
function tone(freq=660,length=.15){if(muted)return;audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(.055,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);osc.connect(gain);gain.connect(ensureAudio());osc.start();osc.stop(audio.currentTime+length);}
function vitralAbsorbSound(){if(muted)return;audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();playVitralAbsorb(audio,ensureAudio());}
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;toastTime=4;}
function toastLocalized(key,values){renderLocalized($('toast'),key,values);$('toast').style.opacity=1;toastTime=4;}
function beginRabbitFall(outward,message,launched=true){
  combo.end();
  if(!launched){
    const p=playerRoute(s,lane),speed=motion.rail*15*ROUTE_ANGLE;
    rabbitState.startFall({x:p.x,y:p.y+.12+height,z:p.z},outward,false);
    const fatalDrop=s<0||unsupportedThreat(threats,s,lane)?.type===ThreatType.HOLE;
    Object.assign(rabbitState.fall,{recoverable:!fatalDrop,deathDuration:fatalDrop ? .85 : undefined,vx:-Math.sin(p.theta)*speed,vz:Math.cos(p.theta)*speed,vy:Math.min(0,velocity)});
    motion.reset();fallCameraOffset.copy(camera.position).sub(rabbit.position);
    abilities.phase=null;phasingFrame=false;currentVitralZone=null;vitralGlow.reset();return;
  }
  motion.reset();
  const p=playerRoute(s,lane);rabbitState.startFall({x:p.x,y:p.y+.12+height,z:p.z},outward,launched);
  rabbitAnimation.reset();rabbit.rotation.z=0;
  fallCameraOffset.copy(camera.position).sub(rabbit.position);fallCameraOffset.y=0;fallCameraOffset.setLength(7);fallCameraOffset.y=5;
  abilities.reset();phasingFrame=false;phaseQueued=false;keys.clear();inputDevices?.clear();inputManager.clear();jumpQueued=false;moveSpeed=0;currentVitralZone=null;vitralGlow.reset();shadowEffects.setDamage(false);shadowEffects.hit();tone(110,.4);toast(message);$('effect').textContent=tr("Falling");
}
let rebuildingRun=false,nextRunTask=null;
function nextRun(options={}){
  if(nextRunTask)return nextRunTask;
  nextRunTask=replaceRun(options).finally(()=>{nextRunTask=null;});return nextRunTask;
}
async function replaceRun(options){
  progression.save();const button=skillTree.element.querySelector('#tree-next');button.disabled=true;button.textContent=tr('Preparing run…');
  const started=performance.now(),context=renderer.getContext();let previous,oldDepthTarget;
  try{
    await fadeToNextRun(async()=>{
      rebuildingRun=true;state='loading';skillTree.art.stop();keys.clear();inputDevices.clear();inputManager.clear();
      performanceProbe?.dispose();performanceProbe=null;renderCulling.end();arenaCameraCutaway.update(null,camera,ARENA_RADIUS);
      // Unbatch before collecting to avoid disposing BatchedMesh geometry twice.
      stairBatches.dispose();propBatches.dispose();previous=runResources(scene);oldDepthTarget=towerMist.depthTarget;
      scene.clear();scene.userData={};
      Object.assign(RUN_UPGRADES,skillStats(progression.state));randomManager.reseed(freshRunSeed());
      rebuildFloorLayout();refreshRunGeometry();generatedDebugOptions=debugOptions();
      await buildRunWorld();towerDescent.setFloors(FLOORS);await prepareRunWorld();
      releaseRunResources(previous,preparedResources);oldDepthTarget.dispose();previous=null;
      renderer.renderLists.dispose();installPerformanceProbe();
      const url=new URL(location.href);url.searchParams.set('seed',randomManager.seed);url.searchParams.delete('sunny-run');url.searchParams.delete('sunny-boss');history.replaceState(history.state,'',url.href);
      start(options);update(0);state='loading';
      document.documentElement.classList.add('boot-run');document.documentElement.classList.remove('run-leaving');
      rebuildingRun=false;
      document.documentElement.dataset.runPreparationMs=String(Math.round(performance.now()-started));
      document.documentElement.dataset.retainedRenderer=String(context===renderer.getContext());
      requestAnimationFrame(()=>requestAnimationFrame(()=>revealNextRun(()=>{frameClock.reset();state='playing';flashRunStart();})));
    });
  }catch(error){
    rebuildingRun=true;console.error('Next run preparation failed',error);
    document.documentElement.classList.remove('run-leaving','boot-run');
    const overlay=$('game-preparation');overlay.hidden=false;overlay.querySelector('span').textContent=preferences.language==='ru'?'Не удалось подготовить забег':'Could not prepare the run';overlay.querySelector('button').hidden=false;
  }
}
function reset(){runSummary.close();statisticsUI.close();runTelemetry.reset({seed:randomManager.seed,runId:crypto.randomUUID()});runItems.reset(skillStats(progression.state),progression.state.owned);runItems.apply(RUN_UPGRADES);runItemUI.sync();combo.reset(RUN_UPGRADES.comboEnabled);towerDescent.reset();secretDirtParticles.clear();grassExitParticles.clear();secretTransition.reset();vineLeaves.clear();randomManager.reset();landingCamera.reset();shelfTravel.reset();shardCounter.reset();rabbitShadowForm.reset();$('world').classList.remove('is-paused');damageInputLocked=false;rabbitHitEffects.reset();lightBarRecovery.reset(RUN_UPGRADES.maxHP);springboards.reset();motion.reset();arenas.reset();secretLevels.reset();$('arena-controls').hidden=true;$('movement-mode').textContent=tr("along the spiral");for(const button of document.querySelectorAll('.arena-touch'))button.hidden=true;arenaCameraReturn=0;beastKnockback.reset();windowLight.reset();flareQueued=false;flareFrame=false;flareAge=2;flareBurst.reset();rescueUsed=false;rescueInvul=0;railFacing=1;floorGates.reset();abilities.reset();phaseTrail.reset();phaseQueued=false;phasingFrame=false;rabbitState.reset();fallingShadows.reset();rabbitDissolve.value=0;rabbit.rotation.z=0;rabbit.visible=true;rabbitVisual.scale.setScalar(1);resetThreats(threats);vitralGlow.reset();rabbitAnimation.reset();moveSpeed=0;shadowEffects.clear();pickupEffects.clear();facing=0;facingTarget=0;viewAnchor=0;cameraLift=cameraLiftVelocity=cameraGroundLift=0;cameraNeedsReset=true;s=0;lane=0;height=0;velocity=0;light=RUN_UPGRADES.maxHP;collected=0;currentVitralZone=null;invert=0;slow=0;time=0;keys.clear();inputDevices?.clear();inputManager.clear();jumpQueued=false;for(let i=glints.length-1;i>=0;i--)if(glints[i].fromChest){glints[i].o.removeFromParent();glints.splice(i,1);}for(const g of glints)g.reset();for(const c of chests){c.broken=false;c.o.visible=true;c.lid.rotation.x=-.08;}for(const b of bottles)b.cooldown=0;for(const b of beasts){resetShadowBeast(b);}crystalMat.emissiveIntensity=.5;crystalLight.intensity=20;sun.intensity=4.1;scene.background.set('#303849');scene.fog.color.set('#303849');for(const m of glassMats)m.emissiveIntensity=.65;}
function start({boss=false}={}){if(debugOptions().chestEveryStep!==generatedDebugOptions.chestEveryStep){void nextRun({boss});return;}frameClock.reset();skillTree.element.hidden=true;reset();if(boss&&arenas.arenas.length){const a=arenas.arenas[0];s=a.s;arenas.enter(a.s-.01,a.s,route(a.s));}state='playing';$('intro').hidden=true;$('hud').hidden=false;$('modal').hidden=true;document.body.classList.add('playing');toastTime=0;$('toast').style.opacity=0;tone(523,.4);requestAnimationFrame(()=>{if(state==='playing')flashRunStart();});}
function showModal(kicker,title,text,button){$('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-text').textContent=text;$('resume').textContent=button;$('modal').hidden=false;}
function pause(){if(state==='playing'){state='paused';$('world').classList.add('is-paused');keys.clear();inputDevices?.clear();inputManager.clear();showModal('',t('pause'),'',t('resume'));$('resume').focus({preventScroll:true});}else if(state==='paused'){state='playing';$('world').classList.remove('is-paused');$('modal').hidden=true;}}
function breakChest(c){
  if(c.broken)return false;c.broken=true;c.o.visible=false;
  const pool=Math.max(1,Math.min(RUN_UPGRADES.gemPoolTier,COLLECTIBLES.variants.length));
  const rewards=rollChestRewards(randomManager,floorForSection(c.s).id,c.s,c.rewards,{poolSize:pool});
  chestRewardConsumers.consume(rewards,{chest:c});
  recordRun('chest.opened',{section:c.s,tier:c.tierId});
  combo.add('chest',c);tone(260,.16);return true;
}
function finish(won){if(state==='won'||state==='lost')return;if(won)progression.award(VICTORY_BONUS);state=won?'won':'lost';keys.clear();inputDevices?.clear();inputManager.clear();phaseQueued=jumpQueued=flareQueued=false;$('modal').hidden=true;$('hud').hidden=true;pauseItems.sync(false);tone(won?1046:164,won?1.8:.6);if(won)recordRun('points.earned',{amount:VICTORY_BONUS,source:'victory'});const report=runTelemetry.finish(won?'won':'lost');runHistory.record(report);runSummary.open(report);}
$('debug-boss').onclick=()=>start({boss:true});
$('start').onclick=()=>start();$('restart').onclick=start;$('resume').onclick=()=>state==='paused'?pause():start();
$('main-menu').onclick=()=>{reset();state='intro';$('modal').hidden=true;$('hud').hidden=true;$('intro').hidden=false;document.body.classList.remove('playing');toastTime=0;$('toast').style.opacity=0;};
$('reset-progress').onclick=()=>{progression.reset();const url=new URL(location.href);url.searchParams.delete('sunny-run');url.searchParams.set('sunny-reset',String(Date.now()));location.assign(url.href);};
$('sound').remove();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
for(const button of document.querySelectorAll('[data-key]')){
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);inputDevices.setTouch(button.dataset.key,true);};
  button.onpointerup=button.onpointercancel=()=>inputDevices.setTouch(button.dataset.key,false);
}
function applyRenderSettings(){
  const [width,height]=preferences.resolution==='auto'?[innerWidth,innerHeight]:preferences.resolution.split('x').map(Number);
  const ratio=preferences.resolution==='auto'?Math.min(devicePixelRatio,1.7):Math.min(width/innerWidth,height/innerHeight);
  renderer.setPixelRatio(ratio);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
}
addEventListener('resize',applyRenderSettings);
const settingsUI=initializeSettings({onOpen:()=>{keys.clear();inputDevices?.clear();inputManager.clear();jumpQueued=phaseQueued=flareQueued=false;if(state==='playing')pause();},onChange:()=>{
  muted=preferences.volume===0;if(masterAudio)masterAudio.gain.setTargetAtTime(preferences.volume,audio.currentTime,.03);
  applyRenderSettings();
  const codes=['left','right','left','right','jump','dash','flare','pause'];
  document.querySelectorAll('body>footer kbd').forEach((el,i)=>{const action=codes[i];if(action)el.textContent=keyName(preferences.bindings[action][i===2||i===3?1:0]);});
}});

onLanguageChange(()=>{localizeDOM();if(state==='paused')$('modal-title').textContent=t('pause');updateHUD();});

function updateHUD(dt=0){
  $('hud').style.setProperty('--hud-scale',Math.min(1,Math.max(.35,(innerWidth-56)/320))); 
  const marker=document.querySelector('.shadow-threshold');marker.parentElement.style.setProperty('--shadow-threshold',SHADOW_LIGHT_THRESHOLD+'%');marker.title=tr("Shadow begins below {threshold}% Light",{threshold:SHADOW_LIGHT_THRESHOLD});marker.setAttribute('aria-label',marker.title);
  lightBarRecovery.update(light,RUN_UPGRADES.maxHP,dt);
  $('arena-controls').hidden=!arenas.active;$('movement-mode').textContent=arenas.active?tr("around the arena"):tr("along the spiral");
  for(const button of document.querySelectorAll('.arena-touch'))button.hidden=!arenas.active;
  const lightPercent=clamp(light/RUN_UPGRADES.maxHP*100,0,100);
  $('light-value').innerHTML=Math.ceil(lightPercent)+'<small>%</small>';$('light-value').title=Math.ceil(light)+' / '+RUN_UPGRADES.maxHP+' HP';
  const barPercent=clamp(lightBarRecovery.displayed/RUN_UPGRADES.maxHP*100,0,100);
  const lightFill=$('light-fill');lightFill.style.width=barPercent+'%';lightFill.dataset.empty=String(light<=0);
  const lightSun=$('light-sun');lightSun.style.left=barPercent+'%';lightSun.hidden=light<=0;
  lightFill.parentElement.style.setProperty('--sun-position',barPercent+'%');
  lightFill.parentElement.style.setProperty('--sun-px',lightFill.parentElement.clientWidth*barPercent/100+'px');
  lightFill.parentElement.style.setProperty('--shadow-cut',lightFill.parentElement.clientWidth*SHADOW_LIGHT_THRESHOLD/100+'px');
  lightFill.parentElement.style.setProperty('--sun-power',light>0?'1':'0');
  towerDescent.update(s,floorForSection(s));
}
function updateArena(dt){
  time+=dt;invert=slow=0;
  const active=arenas.active,old={...arenas.player},previousHeight=height;
  camera.getWorldDirection(arenaForward);const direction=arenaInput(keys,arenaForward);
  const entering=['entering','portal','return'].includes(active.stage);
  const movable=!active.collapse&&!arenas.recoil&&!damageInputLocked&&(active.stage==='fighting'||active.stage==='cleared'||active.secret&&active.stage==='ascent');
  if(movable){
    if(Math.hypot(direction.x,direction.z)>.01){arenaFacing.x=direction.x;arenaFacing.z=direction.z;}
    const grounded=height<=.001;motion.ground(grounded);if(grounded&&!abilities.phase&&!phasingFrame&&abilities.gravityDelay<=0)abilities.land();
    const jumpVelocity=motion.tryJump(abilities,height,grounded,Math.hypot(motion.x,motion.z)/(4.8*RUN_UPGRADES.speed));
    if(jumpVelocity){velocity=jumpVelocity;abilities.jumpLaunched(jumpVelocity,height);rabbitAnimation.jump(jumpVelocity,Math.max(Math.hypot(motion.x,motion.z),Math.hypot(direction.x,direction.z)*4.8*RUN_UPGRADES.speed));tone(470,.1);}
    if(phaseQueued&&abilities.use(AbilityType.PHASING,{height,direction:arenaFacing,distance:AbilityInfo.phasing.arenaDistance*RUN_UPGRADES.phaseDistance})){
      phaseTrail.reset();tone(950,.15);
    }
  }
  jumpQueued=phaseQueued=false;
  const dash=abilities.advance(dt);phasingFrame=entering||(movable&&!!dash);
  if(movable){height+=abilities.consumePhaseRise();if(dash||abilities.gravityDelay>0)velocity=0;const jump=motion.jumpStep(height,velocity,abilities.gravityDt,keys.has('Space'));height=jump.height;velocity=jump.velocity;}
  let flare=false;if(movable&&flareQueued&&abilities.use(AbilityType.FLARE)){flare=true;flareAge=0;flareBurst.start(new THREE.Vector3(old.x,old.y+height+.5,old.z),glassGlowPalette);}flareQueued=false;
  const movement=movable?motion.arenaStep(direction,4.8*RUN_UPGRADES.speed,height>.025,dt):{x:0,z:0};
  const result=active.secret?secretLevels.update(dt,time,arenas.player,movement,movable?dash:null,4.8*RUN_UPGRADES.speed):arenas.update(dt,time,{direction:movement,dash:movable?dash:null,height,previousHeight,velocity,speed:4.8*RUN_UPGRADES.speed,flare,dashPalette:rabbitState.dashPalette,chargedPalette:rabbitState.lightCharge>0?rabbitState.chargeZone?.palette:null});
  const p=arenas.player,dx=p.x-old.x,dz=p.z-old.z;moveSpeed=result.teleported?0:Math.hypot(dx,dz)/Math.max(.0001,dt);
  if(Math.hypot(dx,dz)>.0001)facingTarget=Math.atan2(dx,dz);
  if(result.bounce){height=Math.max(height,result.bounce);velocity=result.jumpRebound?Math.max(velocity,7):bounceVelocity(keys.has('Space'),RUN_UPGRADES.jump);rabbitAnimation.jump(velocity,moveSpeed);motion.cuttable=false;if(!result.jumpRebound)abilities.resetAirJump();}
  rabbitState.setVitral(null);currentVitralZone=null;
  const absorbedVitral=rabbitState.pendingHeal>0;
  light=rabbitState.updateLight(light,dt,false,{passive:false});
  if(absorbedVitral){lightBarRecovery.receive(light);vitralAbsorbSound();}
  if(result.knockbackHeight!==undefined){height=result.knockbackHeight;velocity=0;}
  if(result.damage){combo.end();rabbitHitEffects.hit(new THREE.Vector3(result.damageSource.x,result.damageSource.y,result.damageSource.z));light=Math.max(0,light-result.damage*RUN_UPGRADES.damageScale);rabbitAnimation.hit();facingTarget=facing;motion.reset();abilities.phase=null;shadowEffects.hit();tone(140,.18);}
  for(const event of result.comboActions??[])combo.add(event.action,event.target);
  if(result.kills)recordRun('enemy.killed',{count:result.kills,source:'arena'});
  if(result.phaseKill){light=Math.min(RUN_UPGRADES.maxHP,light+RUN_UPGRADES.phaseHeal*result.kills);if(RUN_UPGRADES.resonance)abilities.cooldowns.phasing=Math.max(0,abilities.cooldowns.phasing-.5);}
  if(result.hits){
    hitStop=result.kills?.065:.045;
    if(!muted){audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();playImpact(audio,!!result.kills,ensureAudio());}
    if(result.impact)bossHitEffects.hit(result.impact,result.impactPalette);
  }
  if(result.secretReward){healFromShard(35);const previous=progression.state.points;progression.award(5*RUN_UPGRADES.shardPointsMultiplier);shardCounter.add(progression.state.points-previous,'#dac2ff');recordRun('points.earned',{amount:progression.state.points-previous,source:'secret'});rabbitAnimation.pickup();tone(1046,.4);}
  if(active.secret&&result.note)tone(520+active.next*110,.25);
  if(active.secret&&result.returnedS!==undefined){arenas.active=null;secretLevels.active=null;}
  if(result.reward){scene.attach(result.reward);pickupEffects.collect(result.reward,()=>{if(state!=='playing'&&state!=='won')return;healFromShard();collected++;recordRun('gem.collected');const previousPoints=progression.state.points;progression.award(result.rewardPoints*RUN_UPGRADES.shardPointsMultiplier);shardCounter.add(progression.state.points-previousPoints);recordRun('points.earned',{amount:progression.state.points-previousPoints,source:'boss'});tone(1200,.3);updateHUD(0);},pickupSpace(s));height=velocity=0;abilities.phase=null;}
  if(result.returning)phasingFrame=true;
  if(result.teleported){landingCamera.reset();shelfTravel.reset();s=result.returnedS;lane=result.returnedLane??0;height=velocity=0;abilities.phase=null;phasingFrame=false;cameraNeedsReset=true;floorGates.arriveAt(s);}
  if(result.cleared){tone(1046,.35);toast(tr("Arena cleared"));}
  shadowEffects.setDamage(false);
  const boss=active.enemies.find(b=>b.boss);
  $('effect').textContent=active.cleared?tr("Arena cleared"):boss?tr("Guardian · {hp} / {maxHP} · Enemies: {count}",{hp:Math.max(0,boss.hp),maxHP:boss.maxHP,count:active.living}):tr("Arena");
  if(light<=0&&RUN_UPGRADES.lastLight&&!rescueUsed){rescueUsed=true;light=RUN_UPGRADES.maxHP*.3;}
  if(light<=0)finish(false);
  if(result.returnedS!==undefined&&!result.teleported){
    motion.reset();
    shelfTravel.reset();s=result.returnedS;lane=result.returnedLane??0;height=velocity=0;abilities.phase=null;phasingFrame=false;arenaCameraReturn=.8;cameraNeedsReset=true;
    if(s>=END-.1&&light>0)finish(true);
  }
  updateHUD(dt);
}
function activateSpring(spring){
  height=Math.max(height,.09);velocity=bounceVelocity(keys.has('Space'),RUN_UPGRADES.jump)*1.15;
  rabbitAnimation.jump(velocity,moveSpeed);
  motion.cuttable=false;motion.jumpBuffer=0;abilities.resetAirJump();
  landingEffects.land(new THREE.Vector3(spring.p.x,spring.p.y+.07,spring.p.z),.75);tone(keys.has('Space')?880:640,.16);
}
function normalShelfSurface(position,footY){
  if(!shelfTravel.floor)return null;
  const hit=shelfSupport(position,footY,walkableFloors.filter(o=>!o.userData.secretStep));
  return hit?{y:hit.point.y,section:hit.object.userData.s}:null;
}
function landOnSecret(surface,position){
  rabbitAnimation.land(rabbitState.fall?.vy??velocity,moveSpeed);
  if(surface.section!==undefined){
    const projected=shelfTravel.land(surface.section,position);s=projected.s;lane=projected.lane;
  }else{
  const theta=Math.atan2(position.z,position.x),reference=playerRoute(s).theta;
  s+=Math.atan2(Math.sin(theta-reference),Math.cos(theta-reference))/(ROUTE_ANGLE);
  lane=Math.hypot(position.x,position.z)-15;
  }
  height=surface.y-playerRoute(s,lane).y;velocity=0;
  // The old anchor and height belong to the floor we fell from.
  viewAnchor=s;smoothAnchor=s;anchorVelocity=0;
  cameraGroundLift=Math.max(0,height);cameraLift=cameraGroundLift;cameraLiftVelocity=0;
  cameraNeedsReset=false;arenaCameraReturn=0;landingCamera.begin(camera.position,target);
  rabbitState.mode=RabbitMode.NORMAL;rabbitState.fall=null;abilities.land();fallingShadows.reset();rabbitDissolve.value=0;rabbit.visible=true;
}
function update(dt){
  const recovery=beastKnockback.motion??arenas.recoil??(rabbitAnimation.recoiling?{age:rabbitAnimation.hitAge}:null);
  damageInputLocked=!!recovery;
  if(damageInputLocked){
    jumpQueued=flareQueued=false;motion.jumpBuffer=0;
    if(phaseQueued&&canDamageDashCancel(recovery.age,RUN_UPGRADES)){
      const arena=!!arenas.active;
      const direction=arena?{x:Math.sin(facing),z:Math.cos(facing)}:{x:railFacing,z:0};
      const distance=arena?AbilityInfo.phasing.arenaDistance:(SHELF_OUTER_RADIUS-shelfInnerRadius(Math.max(0,Math.round(s))))*AbilityInfo.phasing.distanceScale;
      if(abilities.use(AbilityType.PHASING,{height,direction,distance:distance*RUN_UPGRADES.phaseDistance,recoveryCancel:true})){
        beastKnockback.motion=null;arenas.recoil=null;rabbitAnimation.hitAge=1;rabbitAnimation.hitClothBlend=0;
        damageInputLocked=false;motion.reset();phaseTrail.reset();tone(950,.15);
      }
    }
    phaseQueued=false;
  }
  motion.tick(dt,jumpQueued);jumpQueued=false;
  if(arenas.active){updateArena(dt);return;}
  if(rabbitState.mode===RabbitMode.FALLING){
    time+=dt;const beforeFall={...rabbitState.fall},fall=rabbitState.updateFall(dt);
    const secret=fall.deathDuration?null:secretLevels.land(beforeFall.y-.12,fall.y-.12,fall.vy,fall,beforeFall);
    const shelf=fall.recoverable?sweepShelfLanding(
      {x:beforeFall.x,y:beforeFall.y-.12,z:beforeFall.z},
      {x:fall.x,y:fall.y-.12,z:fall.z},walkableFloors.filter(o=>!o.userData.secretStep)):null;
    if(shelf&&(!secret||shelf.point.y>=secret.y)){
      landOnSecret({y:shelf.point.y,section:shelf.object.userData.s},shelf.point);
      motion.coyote=.085;updateHUD(dt);return;
    }
    if(secret){landOnSecret(secret,fall);return;}
    if(fall.wallHit&&!fall.wallEffect){fall.wallEffect=true;shadowEffects.hit();tone(95,.2);}
    if(fall.done){light=0;$('light-value').innerHTML='0<small>%</small>';$('light-fill').style.width='0%';$('light-sun').hidden=true;finish(false);}
    return;
  }
  const previousFoot=playerRoute(s,lane).y+height+.12;
  let oldSurface=secretLevels.support(playerRoute(s,lane),previousFoot-.12)??normalShelfSurface(playerRoute(s,lane),previousFoot-.12);
  if(oldSurface&&oldSurface.section===undefined&&motion.jumpBuffer>0&&(keys.has('KeyS')||keys.has('ArrowDown'))){secretLevels.drop(oldSurface);oldSurface=null;motion.jumpBuffer=0;velocity=-1.5;}

  rescueInvul=Math.max(0,rescueInvul-dt);flareFrame=false;
  const gatePreviousS=s,gatePreviousLane=lane;
  const passenger=platformPassenger(threats,s,lane,height,motion.jumpBuffer>0||phaseQueued||!!abilities.phase),previousOffset=passenger?.offset;
  time+=dt;invert=Math.max(0,invert-dt);slow=Math.max(0,slow-dt);
  updateThreats(threats,time);
  if(passenger){const carried=carryPlatformPassenger(passenger,s,lane,previousOffset);s=carried.s;lane=carried.lane;}
  for(const platform of movingPlatforms)if(platform.warning&&!platform.notified&&Math.abs(s-platform.s)<2){platform.notified=true;toast(tr("The shelf is moving! It carries you inward — watch the edges."));tone(240,.12);}
  const forward=damageInputLocked?0:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const direction=invert>0?-1:1;
  if(forward)railFacing=Math.sign(forward*direction);
  const beforeMoveS=s,beforeMoveLane=lane,beforeMove=playerRoute(s,lane);
  const movementHeight=heightAboveSurface(height,beforeMove.y,oldSurface);
  const knocked=beastKnockback.advance(dt);
  if(phaseQueued&&!knocked){
    const dashDirection={x:railFacing,z:0};
    if(abilities.use(AbilityType.PHASING,{height,direction:dashDirection,distance:(SHELF_OUTER_RADIUS-shelfInnerRadius(Math.max(0,Math.round(s))))*AbilityInfo.phasing.distanceScale*RUN_UPGRADES.phaseDistance})){phaseTrail.reset();tone(950,.15);}
  }
  phaseQueued=false;
  const dash=abilities.advance(dt);phasingFrame=!!dash;
  if(knocked){s=knocked.s;motion.rail=0;}
  else if(dash){const moved=applySpiralPhase(s,lane,dash.x);s=moved.s;lane=moved.lane;}
  else{
    const travel=motion.railStep(forward*direction,(slow>0?.65:1.6)*RUN_UPGRADES.speed,movementHeight>.025||velocity>0,dt);
    s=Math.min(END,s+travel*dt);if(!passenger&&height<=.001)lane=THREE.MathUtils.damp(lane,0,12,dt);
  }
  if(shelfTravel.leavesFloor(beforeMoveS,s,lane)){
    const angle=beforeMove.theta,speed=dash?dash.x/Math.max(dt,.0001):motion.rail*15*ROUTE_ANGLE;
    const launchVelocity=velocity,departure=playerRoute(s,lane);
    // A gap between independently rotated floors is a normal fall, never a teleport.
    motion.reset();rabbitState.startFall({x:departure.x,y:beforeMove.y+.12+height,z:departure.z},false,false);
    Object.assign(rabbitState.fall,{recoverable:true,vx:-Math.sin(angle)*speed,vz:Math.cos(angle)*speed,vy:launchVelocity});
    fallCameraOffset.copy(camera.position).sub(rabbit.position);
    abilities.phase=null;phasingFrame=false;phaseQueued=false;currentVitralZone=null;vitralGlow.reset();
    return;
  }
  const shadowDash=light/RUN_UPGRADES.maxHP*100<=SHADOW_LIGHT_THRESHOLD;
  for(const c of chests){if(c.broken)continue;const radius=c.radius/(15*ROUTE_ANGLE),side=Math.sign(beforeMoveS-c.s)||-railFacing,crossed=(s-c.s)*side<radius&&(beforeMoveS-c.s)*side>=-radius,aligned=Math.abs(lane-c.lane)<c.radius;
    if(!crossed||!aligned||height>c.top-playerRoute(s,lane).y)continue;
    if(dash&&!shadowDash){breakChest(c);continue;}
    if(!dash&&(velocity>0||motion.jumpBuffer>0))continue;
    s=c.s+side*radius;motion.rail=0;
  }
  const enteredArena=arenas.enter(beforeMoveS,s,playerRoute(beforeMoveS,lane));
  if(enteredArena){motion.reset();s=enteredArena.s;lane=0;height=velocity=0;abilities.phase=null;phasingFrame=true;phaseTrail.reset();floorGates.arriveAt(enteredArena.s);phaseQueued=jumpQueued=false;beastKnockback.reset();rabbitState.setVitral(null);currentVitralZone=null;shadowEffects.setDamage(false);updateHUD();return;}
  if(!knocked&&!dash&&height<.4&&velocity<=0)for(const beast of beasts){
    if(beast.stats.collider?.type==='sphere'){
      if(beast.dead)continue;
      const shape=beast.stats.collider,dy=height+.45-shape.centerY,dx=lane-beast.lane,radius=shape.radius+.28;
      const reach=Math.sqrt(Math.max(0,radius*radius-dy*dy-dx*dx))/(15*ROUTE_ANGLE);
      const side=Math.sign(beforeMoveS-beast.s)||-railFacing;
      if(reach>0&&(s-beast.s)*side<reach&&(beforeMoveS-beast.s)*side>=0)s=beast.s+side*reach;
      continue;
    }
    if(beast.dead||Math.abs(lane-beast.lane)>=beast.stats.laneRadius)continue;
    const side=Math.sign(beforeMoveS-beast.s)||-railFacing;
    if((s-beast.s)*side<beast.stats.blockSection&&(beforeMoveS-beast.s)*side>=0)s=beast.s+side*beast.stats.blockSection;
  }
  const afterMove=playerRoute(s,lane),dx=afterMove.x-beforeMove.x,dz=afterMove.z-beforeMove.z;
  moveSpeed=Math.hypot(dx,dz)/Math.max(dt,.0001);
  if(dx*dx+dz*dz>1e-10)facingTarget=Math.atan2(dx,dz);
  const surface=secretLevels.support(afterMove,previousFoot-.12,oldSurface&&velocity<=0?.52:0)??normalShelfSurface(afterMove,previousFoot-.12);
  if(surface&&oldSurface&&velocity<=0){height=surface.y-afterMove.y;velocity=0;}
  else if(oldSurface||height>.001)height=Math.max(0,previousFoot-.12-afterMove.y);
  const groundOffset=surface?surface.y-afterMove.y:0;
  const grounded=surface?Math.abs(height-groundOffset)<.03&&velocity<=0:height<=.001&&hasShelfSupport(threats,s,lane,playerRoute(s,lane));
  motion.ground(grounded);if(grounded&&!abilities.phase&&!phasingFrame&&abilities.gravityDelay<=0)abilities.land();
  const spring=!damageInputLocked&&!knocked&&!dash?springboards.contact(s,lane,height,velocity):null;
  if(spring)activateSpring(spring);
  else if(!damageInputLocked&&!knocked){const jumpVelocity=motion.tryJump(abilities,Math.max(0,height-groundOffset),grounded,Math.abs(motion.rail)/(1.6*RUN_UPGRADES.speed));if(jumpVelocity){velocity=jumpVelocity;abilities.jumpLaunched(jumpVelocity,height);rabbitAnimation.jump(jumpVelocity,Math.max(moveSpeed,Math.abs(forward)));tone(470,.1);}}
  if(dash||abilities.gravityDt<dt){height=Math.max(0,height+beforeMove.y-afterMove.y);velocity=0;}
  height+=abilities.consumePhaseRise();
  const jump=motion.jumpStep(height-groundOffset,velocity,abilities.gravityDt,keys.has('Space'));height=jump.height+groundOffset;velocity=jump.velocity;
  if(grounded&&surface&&velocity<=0){height=groundOffset;velocity=0;}
  const wasSecretLifting=!!secretLevels.assist;
  const secretLift=(knocked||grounded&&!secretLevels.assist)?null:secretLevels.enterFromBelow(afterMove,previousFoot-.12,afterMove.y+height,velocity,dt,RUN_UPGRADES.secretRoadSlip);
  if(secretLift?.blocked){
    secretDirtParticles.burst(new THREE.Vector3(afterMove.x,secretLift.top,afterMove.z));
    height=secretLift.y-afterMove.y;velocity=secretLift.velocity;
    motion.cuttable=false;motion.coyote=0;
    abilities.phase=null;abilities.gravityDelay=0;abilities.recentJump=null;phasingFrame=false;
    rabbitAnimation.ceilingBump();tone(230,.08);
  }else if(secretLift){
    const passPoint=new THREE.Vector3(afterMove.x,secretLift.route.road.heightAt(afterMove)??secretLift.y,afterMove.z);
    if(!wasSecretLifting){rabbitAnimation.slipThrough();secretTransition.start(passPoint);}
    else secretTransition.follow(passPoint);
    height=secretLift.y-afterMove.y;velocity=secretLift.velocity;
    if(secretLift.landed){abilities.land();motion.cuttable=false;motion.coyote=0;}
  }
  const secret=grounded&&surface?null:secretLevels.land(previousFoot-.12,afterMove.y+height,velocity,afterMove,beforeMove);
  if(secret){height=secret.y-afterMove.y;velocity=0;abilities.land();}
  const secretRoom=secretLevels.enterPortal(afterMove,afterMove.y+height,s);
  if(secretRoom){arenas.active=secretRoom;arenas.player=new THREE.Vector3(afterMove.x,afterMove.y+height,afterMove.z);height=velocity=0;motion.reset();return;}

  const landedSpring=!damageInputLocked&&!knocked&&!dash?springboards.contact(s,lane,height,velocity):null;
  if(landedSpring)activateSpring(landedSpring);
  if(knocked){height=knocked.height;velocity=0;}
  if(flareQueued&&abilities.use(AbilityType.FLARE)){flareFrame=true;flareAge=0;flareBurst.start(new THREE.Vector3(afterMove.x,afterMove.y+height+.5,afterMove.z),glassGlowPalette);tone(1150,.3);}flareQueued=false;
  for(const threat of threats)if(ThreatInfo[threat.type]&&!threat.introduced&&Math.abs(s-threat.s)<2.3){threat.introduced=true;toastLocalized(ThreatInfo[threat.type].hint);tone(320,.16);}
  const threatHit=phasingFrame||rescueInvul>0?null:consumeThreatHit(threats,{s,lane,height},time);
  if(threatHit){
    if(threatHit.type===ThreatType.PENDULUM){
      beginRabbitFall(Math.cos((time+threatHit.phase)*Math.PI*2/3.6)>0,tr("The bell knocked you off the shelf…"));return;
    }
    combo.end();light=Math.max(0,light-ThreatInfo[threatHit.type].damage*RUN_UPGRADES.damageScale);shadowEffects.hit();tone(170,.15);toast(tr("{name} · −{damage} Light",{name:tr(ThreatInfo[threatHit.type].name),damage:ThreatInfo[threatHit.type].damage}));
    const launchDirection=Math.abs(motion.rail)>.12?Math.sign(motion.rail):1;
    const nextSection=clamp(threatHit.s+launchDirection,0,END);
    const targetPoint=playerRoute(nextSection,lane);
    const previousLaunch=JUMP_SPEED*RUN_UPGRADES.jump*(1.27+Math.min(1,Math.abs(motion.rail)/(1.6*RUN_UPGRADES.speed))*.035)*Math.sqrt(1.15);
    const launch=chestBounce(previousLaunch,playerRoute(s,lane).y+height,targetPoint.y-.02,nextSection-s,forward*direction,(slow>0?.65:1.6)*RUN_UPGRADES.speed);
    velocity=launch.velocity;motion.rail=launch.rail;
    rescueInvul=Math.max(rescueInvul,1.15);
    rabbitAnimation.jump(velocity,moveSpeed);motion.cuttable=false;motion.jumpBuffer=0;abilities.resetAirJump();
  }
  let inShadow=false;
  for(const h of hazards){const p=route(h.s,h.lane),player=playerRoute(s,lane);if(Math.hypot(player.x-p.x,player.z-p.z)<1.12&&Math.abs(player.y+height-p.y)<.8&&height<.8)inShadow=true;}
  if(!phasingFrame&&abilities.gravityDelay<=0&&!surface&&!hasShelfSupport(threats,s,lane,playerRoute(s,lane))&&height===0&&velocity<=0&&motion.coyote<=0){beginRabbitFall(lane>2.5,tr("There is no shelf beneath your paws…"),false);return;}
  for(const c of chests){
    if(c.broken)continue;
    const chestFoot=playerRoute(s,lane).y+height+.12;
    const crossedLid=velocity<=0&&previousFoot>=c.top&&chestFoot<=c.top;
    const overlapsChest=Math.abs(s-c.s)<c.radius/(15*ROUTE_ANGLE)+.12&&Math.abs(lane-c.lane)<c.radius;
    if(crossedLid&&overlapsChest){
      breakChest(c);
      height=Math.max(height,c.top-playerRoute(s,lane).y-.12);
      const chestLaunchDirection=Math.abs(motion.rail)>.12?Math.sign(motion.rail):1;
      const previousLaunch=JUMP_SPEED*RUN_UPGRADES.jump*(1.27+Math.min(1,Math.abs(motion.rail)/(1.6*RUN_UPGRADES.speed))*.035)*Math.sqrt(1.15);
      const nextSection=clamp(c.s+chestLaunchDirection,0,END),targetPoint=playerRoute(nextSection,lane);
      const launch=chestBounce(previousLaunch,playerRoute(s,lane).y+height,targetPoint.y-.02,nextSection-s,forward*direction,(slow>0?.65:1.6)*RUN_UPGRADES.speed);
      velocity=launch.velocity;motion.rail=launch.rail;
      rabbitAnimation.jump(velocity,moveSpeed);motion.cuttable=false;motion.jumpBuffer=0;abilities.resetAirJump();break;
    }
  }
  let sampledZone=currentVitralZone;
  const lightSteps=Math.max(1,Math.ceil(Math.abs(s-beforeMoveS)/.08));
  const traceDashLight=phasingFrame&&(RUN_UPGRADES.rayEntryHeal||RUN_UPGRADES.gleamDash);
  for(let i=1;i<=lightSteps;i++){
    const t=i/lightSteps,point=playerRoute(THREE.MathUtils.lerp(beforeMoveS,s,t),THREE.MathUtils.lerp(beforeMoveLane,lane,t));
    const zone=windowLight.sampleLight(new THREE.Vector3(point.x,point.y,point.z),height);
    combo.crossVitral(sampledZone,zone);
    vitralEntryEffects.sample({x:point.x,y:point.y+height,z:point.z},zone);
    if(traceDashLight)rabbitState.setVitral(zone,true,height>.025);
    sampledZone=zone;
  }
  for(const g of glints){
    if(g.taken||height>=1.8||Math.abs(lane-g.lane)>=1.15||g.s<=Math.min(beforeMoveS,s)-RUN_UPGRADES.magnet||g.s>=Math.max(beforeMoveS,s)+RUN_UPGRADES.magnet||!g.collect())continue;
    combo.add('gem',g);
    const comboPoints=combo.reward(g.definition.points*RUN_UPGRADES.shardPointsMultiplier),amount=g.lightValue(RUN_UPGRADES.shardHeal);
    rabbitAnimation.pickup();
    pickupEffects.collect(g.o,()=>{
      if(state!=='playing'&&state!=='won')return;
      healFromShard(amount);collected++;recordRun('gem.collected');
      const previousPoints=progression.state.points;progression.award(comboPoints);
      shardCounter.add(progression.state.points-previousPoints,g.definition.textColor);
      recordRun('points.earned',{amount:progression.state.points-previousPoints,source:'gem'});
      tone(800+collected%4*90);updateHUD(0);
    },pickupSpace(g.s));
  }
  for(const b of bottles){b.cooldown=Math.max(0,b.cooldown-dt);if(!phasingFrame&&Math.abs(s-b.s)<.65&&Math.abs(lane-b.lane)<.7&&height<1&&b.cooldown===0){b.cooldown=7;if(b.s%2){invert=2.5*RUN_UPGRADES.potionScale;toast(tr("Refraction! Controls reversed for 2.5 seconds"));}else{slow=3*RUN_UPGRADES.potionScale;toast(tr("Thick light · slowed for 3 seconds"));}tone(270,.2);}}
  for(const b of beasts){
    if(b.dead){animateBeastDeath(b,dt);continue;}
    b.hurt=Math.max(0,b.hurt-dt);
    if(!b.behavior&&Math.abs(s-b.s)<b.stats.trackRange)b.lane=THREE.MathUtils.damp(b.lane,lane,b.stats.trackRate,dt);
    const prey=playerRoute(s,lane),beforeBehavior=route(b.s,b.lane);
    const leap=b.behavior?b.behavior.update(b.hurt>0?0:dt,b,s,lane,prey.x-beforeBehavior.x,prey.y+height-beforeBehavior.y,prey.z-beforeBehavior.z).leap:Math.max(0,Math.sin(time*b.stats.hopSpeed+b.s)),p=route(b.s,b.lane);
    const jumpHeight=b.behavior?b.behavior.pose.height:leap*b.stats.hopHeight;
    b.o.position.set(p.x,p.y+jumpHeight,p.z);
    const yaw=Math.abs(s-b.s)<6?Math.atan2(prey.x-p.x,prey.z-p.z):-p.theta;
    b.o.rotation.y=turnTowards(b.o.rotation.y,yaw,dt);
    animateShadowBeast(b,time,leap);
    if(b.hurt>0)continue;
    if(flareFrame&&Math.hypot(p.x-afterMove.x,p.z-afterMove.z)<3&&Math.abs(p.y+jumpHeight-afterMove.y-height)<2){damageEnemy(b,glassGlowPalette);continue;}
    const sphereCollider=b.stats.collider?.type==='sphere'?b.stats.collider:null;
    const contactCenterY=p.y+jumpHeight+(sphereCollider?.centerY??.65);
    if(phasingFrame&&phaseHitsTarget({x:beforeMove.x,y:previousFoot+.33,z:beforeMove.z},{x:afterMove.x,y:afterMove.y+height+.45,z:afterMove.z},{x:p.x,y:contactCenterY,z:p.z},sphereCollider?sphereCollider.radius+.30:1.05)){
      if(!damageEnemy(b,rabbitState.dashPalette))continue;
      light=Math.min(RUN_UPGRADES.maxHP,light+RUN_UPGRADES.phaseHeal);if(RUN_UPGRADES.resonance)abilities.cooldowns.phasing=Math.max(0,abilities.cooldowns.phasing-.5);
      combo.add('dashKill',b);tone(640,.2);toast(tr("Stained-glass breakthrough · shadow dispelled!"));continue;
    }
    const top=p.y+jumpHeight+b.stompTop,foot=playerRoute(s,lane).y+height+.12;
    const overlaps=sphereCollider?Math.hypot(afterMove.x-p.x,afterMove.z-p.z)<sphereCollider.radius:Math.abs(s-b.s)<b.stats.stompSection&&Math.abs(lane-b.lane)<b.stats.stompLaneRadius;
    if(!phasingFrame&&canStomp(previousFoot,foot,b.lastTop??top,top,velocity,overlaps)){
      combo.add('stomp',b);const killed=damageEnemy(b,(rabbitState.lightCharge>0?rabbitState.chargeZone?.palette:null)??currentVitralZone?.palette??(vitralGlow.strength>.01?vitralGlow.palette:null));height=Math.max(height,top-playerRoute(s,lane).y+.03);velocity=bounceVelocity(keys.has('Space'),RUN_UPGRADES.jump);rabbitAnimation.jump(velocity,moveSpeed);motion.cuttable=false;abilities.resetAirJump();
      tone(360,.25);if(killed)toast(tr("Shadow dispelled!"));continue;
    }
    b.lastTop=top;
    const bodyContact=sphereCollider?Math.hypot(afterMove.x-p.x,afterMove.y+height+.45-contactCenterY,afterMove.z-p.z)<=sphereCollider.radius+.30:Math.abs(s-b.s)<b.stats.contactSection&&Math.abs(lane-b.lane)<b.stats.laneRadius&&height<b.stats.contactHeight;
    if(!phasingFrame&&bodyContact){
      inShadow=true;
      if(beastKnockback.start(s,b.s,railFacing,height)){motion.reset();abilities.phase=null;const source=route(b.s,b.lane);rabbitHitEffects.hit(new THREE.Vector3(source.x,source.y+.5,source.z));height=Math.max(height,.06);velocity=0;rabbitAnimation.hit();facingTarget=facing;phaseQueued=jumpQueued=false;shadowEffects.hit();tone(140,.18);}
    }
  }
  for(const b of books){const cycle=(time+b.phase)%5;const p=route(b.s);b.o.position.set(p.x,p.y+(cycle<3?6:Math.max(.25,6-(cycle-3)*8)),p.z);b.o.rotation.set(cycle*.3,cycle,.25);b.warning.visible=cycle>2.2;b.warning.material.opacity=.2+Math.sin(time*12)*.1;if(cycle>3.6&&Math.abs(s-b.s)<.65&&height<.8)inShadow=true;}
  if(sampledZone&&!sampledZone.extinguished&&sampledZone!==currentVitralZone){if(!RUN_UPGRADES.rayEntryHeal)tone(1100,.3);toastLocalized("{StainedGlassLight} · healing accelerates while you stay in the light");}
  currentVitralZone=sampledZone;
  rabbitState.setVitral(currentVitralZone,phasingFrame,height>.025||velocity>0);
  if(phasingFrame||rescueInvul>0)inShadow=false;
  const absorbedVitral=rabbitState.pendingHeal>0;
  light=rabbitState.updateLight(light,dt,lightBarRecovery.holding?false:inShadow,{passive:!lightBarRecovery.holding});
  if(absorbedVitral){lightBarRecovery.receive(light);vitralAbsorbSound();}
  if(RUN_UPGRADES.rayEntryHeal){
    for(const zone of rabbitState.entryHealedZones)if(!zone.extinguished)windowLight.extinguish(zone);
    if(currentVitralZone?.extinguished&&currentVitralZone.lightStrength<=0){currentVitralZone=null;rabbitState.setVitral(null);if(rabbitState.lightCharge<=0)vitralGlow.reset();}
  }
  if(inShadow)combo.end();
  shadowEffects.setDamage(inShadow);
  $('effect').textContent=inShadow?tr("Shadow drains your light!"):currentVitralZone?(RUN_UPGRADES.rayEntryHeal?tr("Stained glass · burst healing"):tr("Stained glass · +{amount}/s",{amount:(Math.min(50,rabbitState.vitralTime*12.5)*RUN_UPGRADES.regen).toFixed(0)})):invert>0?tr("Controls reversed"):slow>0?tr("Slowed by refraction"):tr("In the sunset light");
  {const gate=floorGates.check(gatePreviousS,s,gatePreviousLane,lane);if(gate){const floor=floorForSection(gate.plank);towerDescent.completeFloor(floor);runTelemetry.floorCompleted(floor.id,FLOORS.length-floor.index);tone(880,.35);toast(gate.plank===END?tr("Final arch · the crystal is close"):tr("Entering floor {floor}",{floor:gate.nextFloor}));}}
  if(light<=0&&RUN_UPGRADES.lastLight&&!rescueUsed){rescueUsed=true;rescueInvul=1;light=RUN_UPGRADES.maxHP*.3;flareAge=0;flareBurst.start(new THREE.Vector3(afterMove.x,afterMove.y+.5,afterMove.z),glassGlowPalette);toast(tr("Last Spark · light restored!"));}
  if(light<=0)finish(false);else if(s>=END-.1)finish(true);
  updateHUD(dt);
}
const frameClock=new FrameClock();
let visualTime=0,viewAnchor=0,smoothAnchor=0,anchorVelocity=0;
let cameraLift=0,cameraLiftVelocity=0,cameraGroundLift=0;
let previousSunLight=100,sunMotion=0,sunOrbit=0,sunWasRegenerating=false;
const sunParticleColors=['#ff95db','#ad98ff','#7de4ff','#9affca','#fff09a'];
const sunDisc=document.createElement('span');sunDisc.className='sun-disc';$('light-sun').prepend(sunDisc);
for(let i=0;i<7;i++){
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
  const angle=sunRandom()*Math.PI*2,distance=6+Math.pow(sunRandom(),.7)*21;
  const x=Math.cos(angle)*distance,y=Math.sin(angle)*distance;
  const bend=(sunRandom()-.5)*distance*.8,bx=-Math.sin(angle)*bend,by=Math.cos(angle)*bend;
  const duration=400,launch=90+sunRandom()*100,fade=140;
  const size=4+Math.floor(sunRandom()*4),scale=.65+sunRandom()*.4;
  particle.style.width=particle.style.height=size+'px';
  particle.style.left=particle.style.top=`calc(50% - ${size/2}px)`;
  particle.style.setProperty('--particle-color',sunParticleColors[Math.floor(sunRandom()*sunParticleColors.length)]);
  const animation=particle.animate([
    {transform:'translate(0px,0px) scale(0)',opacity:0,offset:0,easing:'cubic-bezier(.12,.65,.25,1)'},
    {transform:`translate(${x*.72+bx*.3}px,${y*.72+by*.3}px) scale(${scale})`,opacity:.85,offset:launch/duration,easing:'ease-out'},
    {transform:`translate(${x+bx}px,${y+by-1.5}px) scale(${scale*.8})`,opacity:.7,offset:1-fade/duration,easing:'cubic-bezier(.2,0,.4,1)'},
    {transform:`translate(${x+bx}px,${y+by-1.5}px) scale(${scale*.8})`,opacity:0,offset:1},
  ],{duration,delay:sunRandom()*(initial?90:40)});
  animation.onfinish=()=>{if(sunWasRegenerating)emitSunParticle(particle);};
}
let cameraNeedsReset=true;
function registerInputContext(id,enabled,handle,handleRaw){inputManager.register({id,...INPUT.contexts[id],enabled,handle,handleRaw});}
let inputWasFocused=true;
registerInputContext('global',()=>true,frame=>{
  if(!frame.focused&&inputWasFocused){keys.clear();inputDevices?.clear();inputManager.clear();if(state==='playing')pause();}
  inputWasFocused=frame.focused;
  if(frame.focused&&frame.globalPressed?.has('toggleFullscreen')){
    if(window.sunnyDesktop?.toggleFullscreen)window.sunnyDesktop.toggleFullscreen().catch(()=>{});
    else if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    else document.documentElement.requestFullscreen().catch(()=>{});
  }
});
registerInputContext('rebinding',()=>settingsUI.isCapturing,frame=>settingsUI.handleInput(frame),control=>settingsUI.captureRaw(control));
registerInputContext('settings',()=>settingsUI.isOpen,frame=>settingsUI.handleInput(frame));
registerInputContext('statistics',()=>statisticsUI.isOpen,frame=>statisticsUI.handleInput(frame));
registerInputContext('runSummary',()=>runSummary.isOpen,frame=>runSummary.handleInput(frame));
registerInputContext('runItems',()=>runItemUI.isOpen,frame=>runItemUI.handleInput(frame));
registerInputContext('upgrades',()=>!skillTree.element.hidden,frame=>skillTree.handleInput(frame));
registerInputContext('bestiary',()=>document.body.classList.contains('bestiary-open'),frame=>{
  document.dispatchEvent(new CustomEvent('sunny:bestiary-input',{detail:frame}));
});
function handleMenuInput(surface,frame){
  if(frame.pressed.has('pause')&&state==='paused'){pause();return;}
  if(state==='paused'&&surface===$('modal')&&pauseItems.handleInput(frame))return;
  const buttons=[...surface.querySelectorAll('button:not(:disabled)')].filter(button=>!button.closest('[hidden]'));
  const direction=frame.uiPressed.has('down')?1:frame.uiPressed.has('up')?-1:0;
  if(direction){const i=buttons.indexOf(document.activeElement);buttons[(i+direction+buttons.length)%buttons.length]?.focus();}
  if(frame.uiPressed.has('submit'))(buttons.includes(document.activeElement)?document.activeElement:buttons[0])?.click();
}
registerInputContext('pause',()=>state==='paused',frame=>handleMenuInput($('modal'),frame));
registerInputContext('mainMenu',()=>state==='intro',frame=>handleMenuInput($('intro'),frame));
registerInputContext('gameplay',()=>state==='playing',frame=>{
  keys.clear();for(const action of frame.held)if(action!=='pause')keys.add(ACTION_CODES[action]);
  if(frame.pressed.has('jump'))jumpQueued=true;
  if(frame.pressed.has('dash')&&rabbitState.mode!==RabbitMode.FALLING)phaseQueued=true;
  if(frame.pressed.has('flare'))flareQueued=true;
  if(frame.pressed.has('pause'))pause();
});
inputDevices=new BrowserInput({preferences:()=>preferences,onRaw:control=>inputManager.dispatchRaw(control),captureKeyboard:()=>inputManager.resolve()?.map==='gameplay',onBlur:()=>{keys.clear();inputManager.clear();if(state==='playing')pause();}});
const focusIndicator=new FocusIndicator();
function updateInput(){keys.clear();inputManager.update(inputDevices.sample());if(document.body.dataset.inputDevice!==inputManager.scheme)document.body.dataset.inputDevice=inputManager.scheme;focusIndicator.update(document.activeElement,inputManager.scheme);}
function frame(now){requestAnimationFrame(frame);if(rebuildingRun)return;performanceProbe?.begin(now,state);updateInput();if(state==='intro'){if(!menuScene.userData.drawn){renderer.setRenderTarget(null);renderer.render(menuScene,camera);menuScene.userData.drawn=true;}return;}const realDt=frameClock.step(now);runTelemetry.clock(now,state==='playing'&&!runItemUI.isOpen&&!runSummary.isOpen&&skillTree.element.hidden&&!document.body.classList.contains('bestiary-open'));if(runSummary.isOpen||statisticsUI.isOpen)return;pauseItems.sync(state==='paused');if(runItemUI.sync())return;towerHierarchy.update(state==='paused'?0:realDt);if(!skillTree.element.hidden||document.body.classList.contains('bestiary-open'))return;visualTime+=realDt;
  const stopped=state==='playing'&&hitStop>0,dt=stopped?0:realDt;
  hitStop=state==='playing'?Math.max(0,hitStop-realDt):0;
  const previousJumpHeight=height,landingVelocity=velocity,landingFrom=rabbit.position.clone(),summaryPreviousS=s;
  if(state==='playing')lightBarRecovery.tick(dt);
  if(state==='playing'&&!stopped)update(dt);
  if(state==='playing'&&rabbitState.mode!==RabbitMode.FALLING&&s>summaryPreviousS)for(const floor of FLOORS){const boundary=Math.min(floor.end+.49,END-.2);if(summaryPreviousS<boundary&&s>=boundary)runTelemetry.floorCompleted(floor.id,FLOORS.length-floor.index);}
  const landingRoute=arenas.active?arenas.player:playerRoute(s,lane);
  const landingSecret=landingVelocity<0?secretLevels.support(landingRoute,landingRoute.y+height):null;
  if(state==='playing'&&previousJumpHeight>.025&&(height<=.025||landingSecret)&&rabbitState.mode!==RabbitMode.FALLING&&!arenas.active?.collapse){
    const p=arenas.active?arenas.player:playerRoute(s,lane);
    const travel=new THREE.Vector3(p.x-landingFrom.x,0,p.z-landingFrom.z);
    const floorHit=arenas.active?null:shelfSupport(p,p.y+height,walkableFloors.filter(floor=>floor.visible&&!floor.userData.secretStep));
    const dustY=landingSecret?.y??floorHit?.point.y??p.y;
    landingEffects.land(new THREE.Vector3(p.x,dustY+.10,p.z),clamp(Math.abs(landingVelocity)/9,.35,1),travel,travel.length()/Math.max(dt,.001));
  }
  if(state==='playing')combo.update(dt,height<=.025&&velocity<=0&&rabbitState.mode!==RabbitMode.FALLING);
  comboHUD.update(combo,state==='playing'||state==='paused');
  landingEffects.update(state==='paused'?0:dt);
  vitralEntryEffects.update(state==='playing'?dt:0);
  if(state==='intro'||state==='lost'||state==='won'||rabbitState.mode===RabbitMode.FALLING)vitralEntryEffects.reset();
  if(state==='intro'||state==='lost'||state==='won')landingEffects.reset();
  const arenaView=arenas.active&&!arenas.active.collapse&&['fighting','cleared'].includes(arenas.active.stage)?{y:arenas.active.y,radius:ARENA_RADIUS}:null;
  secretLevels.reveal(s,state==='playing'?dt:0,visualTime);
  threatVisuals.update(time);
  arenaShelfVisibility.update(arenas.active?.secret&&['ascent','dropping'].includes(arenas.active.stage)?null:arenas.active);
  shelfRelics.updateDynamic();shelfRelics.updateWind(state==='paused'?0:realDt);
  springboards.update(state==='paused'?0:dt,time);
  floatingParchment.update(state==='paused'?0:dt,arenaView);
  arenas.updateRemnants(state==='paused'?0:dt);
  bossHitEffects.update(state==='paused'?0:realDt);
  if(state==='intro'||state==='lost'||state==='won')bossHitEffects.reset();
  floorGates.update(state==='paused'?0:dt,rabbit.position);
  if(state!=='paused'&&flareAge<1.8){flareAge+=dt;flareBurst.update(flareAge);}
  const phaseLabel=abilities.cooldowns.phasing>.05?tr("Phasing {seconds}s",{seconds:abilities.cooldowns.phasing.toFixed(1)}):'Phasing';if($('phase-status').textContent!==phaseLabel)$('phase-status').textContent=phaseLabel;
  const sunMoving=state==='playing'&&Math.abs(light-previousSunLight)>dt*.01;
  previousSunLight=light;
  sunMotion=THREE.MathUtils.damp(sunMotion,sunMoving?1:0,sunMoving?7:9,dt);
  sunOrbit+=dt*(2.4+.8*Math.sin(visualTime*.73)+.35*Math.sin(visualTime*1.31))*sunMotion;
  const sunRadius=lightBarRecovery.holding?0:2.5*sunMotion*(.75+.25*Math.sin(sunOrbit*1.37));
  $('light-sun').style.setProperty('--pickup-scale',String(lightBarRecovery.scale));
  $('light-sun').style.setProperty('--sun-x',(Math.cos(sunOrbit)*sunRadius).toFixed(3)+'px');
  $('light-sun').style.setProperty('--sun-y',(Math.sin(sunOrbit)*sunRadius).toFixed(3)+'px');
  const sunHealth=clamp(lightBarRecovery.displayed/RUN_UPGRADES.maxHP,0,1);
  $('light-sun').classList.toggle('is-shadow',sunHealth<=SHADOW_LIGHT_THRESHOLD/100);
  $('light-sun').parentElement.classList.toggle('is-shadow',sunHealth<=SHADOW_LIGHT_THRESHOLD/100);
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
          {transform,opacity:0,offset:1},
        ],{duration:550+sunRandom()*450,delay:(sunRandom()-.5)*500,easing:'ease-out',fill:'both'});
      }
    }
    sunWasRegenerating=sunRegenerating;
  }
  $('light-sun').classList.toggle('vitral-sun',sunRegenerating);
  towerMist.update(state==='intro'?visualTime:time,state==='won',arenaView,rabbit.position);
  shadowMat.uniforms.clock.value=time;groundSmoke.update(time,innerHeight*renderer.getPixelRatio());
  if(state!=='won'){
    const daylight=depthLight(rabbitState.mode===RabbitMode.FALLING?clamp((TOWER_TOP-rabbitState.fall.y)*2,0,END):s);
    ambient.intensity=.16+daylight*1.94;sun.intensity=.1+daylight*4;
    warm.intensity=4+daylight*136;
    scene.background.copy(new THREE.Color('#080c17').lerp(new THREE.Color('#303849'),daylight));
    scene.fog.density=.017+(1-daylight)*.003;
    scene.fog.color.set('#111827').lerp(new THREE.Color('#a18b72'),daylight*.7);
    for(const glass of glassMats)glass.emissiveIntensity=.04+daylight*.60;
    windowLight.update(.22+daylight*.78,visualTime);
  }
  else windowLight.update(0);
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0;}
  const p=arenas.active?arenas.player:playerRoute(s,lane);rabbit.position.set(p.x,p.y+.12+height,p.z);
  const falling=rabbitState.mode===RabbitMode.FALLING;
  if(falling){const fall=rabbitState.fall;rabbit.position.set(fall.x,fall.y,fall.z);if(state==='playing'){if(fall.recoverable)rabbitAnimation.update(dt,{speed:Math.hypot(fall.vx,fall.vz),height:1,velocity:fall.vy});else{fallingShadows.update(dt,rabbit.position,.45+fall.dissolve*.55);rabbitAnimation.updateFall(dt);}}}
  arenas.setFallHidden(falling);
  rabbitDissolve.value=falling?rabbitState.fall.dissolve:0;
  rabbitVisual.scale.setScalar(falling?1-rabbitState.fall.dissolve*.75:1);
  const secretFootSurface=secretLevels.support(p,p.y+height);
  const footSurface=secretFootSurface??(!arenas.active?normalShelfSurface(p,p.y+height):null);
  let shadowSurface=null;
  if(arenas.active){shadowSurface={point:new THREE.Vector3(p.x,p.y,p.z)};}
  else if(!falling){
    const footY=p.y+height;
    // The normal spiral floor changes in half-metre steps while route Y is continuous.
    // Allow that small height difference, but exclude overhead secret platforms.
    shadowRayOrigin.set(p.x,footY+.35,p.z);
    shadowRaycaster.set(shadowRayOrigin,shadowRayDown);shadowRaycaster.far=18;
    const nearbyFloors=walkableFloors.filter(floor=>floor.visible&&Math.abs(floor.userData.s-s)<(floor.userData.routeSpan??1.2));
    for(const floor of nearbyFloors)floor.updateWorldMatrix(true,false);
    shadowSurface=shadowRaycaster.intersectObjects(nearbyFloors,false).find(hit=>hit.point.y<=footY+(hit.object.userData.secretStep?.035:.35))??null;
  }
  const shadowHeight=shadowSurface?Math.max(0,rabbit.position.y-shadowSurface.point.y-.12):0;
  rabbitShadow.visible=!!shadowSurface&&state!=='won'&&!falling;
  if(shadowSurface)rabbitShadow.position.set(p.x,shadowSurface.point.y+.012,p.z);
  rabbitShadow.scale.set(1.35+shadowHeight*.14,.92+shadowHeight*.1,1);
  rabbitShadowMaterial.opacity=.9*(1-THREE.MathUtils.smoothstep(shadowHeight,0,2.5)*.72);
  shadowEffects.setVisible(state==='playing');
  if(state==='playing')shadowEffects.update(dt,rabbit.position);
  if(rabbitAnimation.recoiling)facingTarget=facing;
  if(state==='playing')facing=turnTowards(facing,facingTarget,dt*(phasingFrame?4.5:1));
  rabbit.rotation.y=facing;
  if(state==='playing'&&!falling)rabbitAnimation.update(dt,{speed:moveSpeed,height:heightAboveSurface(height,p.y,footSurface),velocity,ceiling:RUN_UPGRADES.secretRoadSlip?null:secretLevels.ceilingAbove(rabbit.position),dashing:phasingFrame,skidding:!arenas.active&&motion.skidding,turn:Math.atan2(Math.sin(facingTarget-facing),Math.cos(facingTarget-facing))});
  const brightness=rabbitShadowForm.transition(state==='playing'?dt:0,light/RUN_UPGRADES.maxHP*100<=SHADOW_LIGHT_THRESHOLD)*(falling?1-rabbitState.fall.dissolve:1);rabbitHPFade.value=brightness;
  rabbitMat.color.setRGB(1,.98,.94);
  rabbitMat.emissive.setRGB(.48,.46,.42);
  eyeMat.color.copy(eyeBaseColor).multiplyScalar(brightness);eyeSparkMat.color.copy(eyeSparkBaseColor).multiplyScalar(brightness);
  rabbitGlow.material.opacity=.2*brightness;
  rabbitGlow.material.color.set('#ffe7ac');
  if(state==='playing'){
    const heldCharge=rabbitState.dashCharge>0?rabbitState.dashChargeZone:rabbitState.lightCharge>0?rabbitState.chargeZone:null;

    vitralGlow.update(dt,heldCharge??currentVitralZone,brightness,time);

  }
  else if(state==='lost'||state==='won')vitralGlow.reset();
  if(vitralGlow.strength>0){
    rabbitMat.color.lerp(vitralGlow.bodyColor,vitralGlow.strength*.7);
    rabbitMat.emissive.lerp(vitralGlow.bodyColor,vitralGlow.strength*.85);
    rabbitGlow.material.color.lerp(vitralGlow.bodyColor,vitralGlow.strength);
  }
  if(state==='playing'&&shadowEffects.active){const dim=1-shadowEffects.intensity*.25;rabbitMat.color.multiplyScalar(dim);rabbitMat.emissive.multiplyScalar(dim);rabbitGlow.material.opacity*=dim;}
  for(const hem of traveler.hemMaterials){hem.color.copy(rabbitMat.color);hem.emissive.copy(rabbitMat.emissive);hem.emissiveIntensity=rabbitMat.emissiveIntensity*3;}
  for(const g of glints)g.update(visualTime);
  catcher.rotation.y=Math.sin(visualTime*.3)*.4;crystal.rotation.y=visualTime*.3;dust.rotation.y=visualTime*.004;
  catcherGlows.forEach((halo,i)=>halo.material.opacity=1.05+Math.sin(visualTime*1.6+i)*.06);
  if(falling){
    rabbit.visible=rabbitState.fall.dissolve<1;
    desired.copy(rabbit.position).add(fallCameraOffset);camera.position.lerp(desired,1-Math.exp(-dt*7));
    target.lerp(rabbit.position.clone().add(new THREE.Vector3(0,.3,0)),1-Math.exp(-dt*10));
  }
  else if(arenas.active&&!(arenas.active.secret&&['ascent','dropping'].includes(arenas.active.stage))){
    const a=arenas.active,zoom=Math.max(1,1.4/camera.aspect);
    const cameraAngle=a.theta+(FLOOR_CONFIG.tower.rotationCameraFollow===false?towerHierarchy.root.rotation.y:0);
    desired.set(Math.cos(cameraAngle-.35)*14*zoom,a.y+12*zoom,Math.sin(cameraAngle-.35)*14*zoom);
    camera.position.lerp(desired,1-Math.exp(-dt*4));target.lerp(a.secret&&a.stage==='ascent'?rabbit.position:new THREE.Vector3(0,a.y+.5,0),1-Math.exp(-dt*5));
  }
  else if(state==='intro') {viewAnchor=0;desired.set(3+Math.sin(visualTime*.09)*1.5,TOWER_TOP+4,16);target.copy(rabbit.position).add(new THREE.Vector3(0,.45,0));camera.position.lerp(desired,1-Math.exp(-dt*2));}
  else if(state==='won'){desired.set(end.x*.38,end.y+8,end.z*.38);crystalGroup.getWorldPosition(target).add(new THREE.Vector3(0,2,0));camera.position.lerp(desired,1-Math.exp(-dt*.9));sun.intensity=THREE.MathUtils.damp(sun.intensity,.08,.7,dt);scene.background.lerp(new THREE.Color('#0d152a'),dt*.4);scene.fog.color.copy(scene.background);crystalMat.emissiveIntensity=THREE.MathUtils.damp(crystalMat.emissiveIntensity,5,1,dt);crystalLight.intensity=THREE.MathUtils.damp(crystalLight.intensity,250,1,dt);for(const m of glassMats)m.emissiveIntensity=2+Math.sin(visualTime*2)*.6;rabbit.visible=false;}
  else {
    rabbit.visible=true;
    // Position and focus stay fixed while the player crosses the visible arc.
    viewAnchor=cameraAnchor(s,viewAnchor,camera.aspect);
    if(cameraNeedsReset){smoothAnchor=s;anchorVelocity=0;}
    const motion=smoothCameraAnchor(smoothAnchor,anchorVelocity,viewAnchor,dt);
    smoothAnchor=motion.value;anchorVelocity=motion.velocity;
    const pose=cameraPose(smoothAnchor,camera.aspect,playerRoute);
    desired.set(pose.position.x,pose.position.y,pose.position.z);
    const nextTarget=new THREE.Vector3(pose.target.x,pose.target.y,pose.target.z);
    if(FLOOR_CONFIG.tower.rotationCameraFollow===false){
      const axis=new THREE.Vector3(0,1,0),yaw=towerHierarchy.root.rotation.y;
      desired.applyAxisAngle(axis,yaw);nextTarget.applyAxisAngle(axis,yaw);
    }
    const follow=railCameraHeight(height,secretFootSurface?secretFootSurface.y-p.y:null,cameraGroundLift);
    cameraGroundLift=follow.groundLift;
    const lift=smoothCameraAnchor(cameraLift,cameraLiftVelocity,follow.target,dt,9);
    cameraLift=lift.value;cameraLiftVelocity=lift.velocity;
    desired.y+=cameraLift;nextTarget.y+=cameraLift;
    if(landingCamera.from){landingCamera.apply(desired,nextTarget,dt);camera.position.copy(desired);target.copy(nextTarget);}
    else if(arenaCameraReturn>0){arenaCameraReturn=Math.max(0,arenaCameraReturn-dt);camera.position.lerp(desired,1-Math.exp(-dt*7));target.lerp(nextTarget,1-Math.exp(-dt*7));}
    else{camera.position.copy(desired);target.copy(nextTarget);}
    cameraNeedsReset=false;
  }
  rabbitHitEffects.update(state==='playing'?dt:0);
  if(state==='playing'||state==='won'){pickupEffects.update(dt);shardCounter.update(dt);}
  rabbitShadowForm.update(state==='playing'?dt:0,rabbit.position,state==='playing'&&!falling,innerHeight*renderer.getPixelRatio());
  secretTransition.update(state==='paused'?0:dt);
  grassExitParticles.updatePass(secretTransition.centre.value,secretTransition.age.value,state==='paused'?0:dt,state==='playing');
  secretDirtParticles.updateDirt(state==='paused'?0:dt,state==='playing');
  const foliageVelocity=updateFoliagePlayer(rabbit.position,dt,state==='playing');
  vineLeaves.update(rabbit.position,foliageVelocity,state==='paused'?0:dt,state==='playing');
  lanternLighting.update(rabbit.position,visualTime);
  const desiredFov=58;
  if(Math.abs(camera.fov-desiredFov)>.0001){camera.fov=THREE.MathUtils.damp(camera.fov,desiredFov,6,dt);camera.updateProjectionMatrix();}
  camera.lookAt(target);
  catcherAura.update(visualTime,camera,$('vignette'),innerWidth,innerHeight);
  phaseTrailColor.setRGB(1,1,1);if(rabbitState.dashPalette)phaseTrailColor.copy(rabbitMat.color);phaseTrailColor.multiplyScalar(brightness);
  traveler.head.localToWorld(phaseTrailHead.set(0,.155,.246));
  phaseTrailHead.y+=.08;
  phaseTrail.update(state==='paused'?0:dt,phaseTrailHead,state==='playing'&&phasingFrame&&!falling,camera,phaseTrailColor,!!rabbitState.dashPalette);
  if(state==='playing')shadowEffects.applyShake(camera);
  if(state==='playing')bossHitEffects.applyShake(camera);
  if(state==='playing')floorGates.applyShake(camera);
  arenaCameraCutaway.update(arenas.active?.secret&&['ascent','dropping'].includes(arenas.active.stage)?null:arenas.active,camera,ARENA_RADIUS);
  windowLight.setArenaMask(arenaView,camera);
  scene.updateMatrixWorld();
  renderCulling.begin(camera);stairBatches.update();propBatches.update();
  try{
  towerMist.renderDepth(renderer,scene,camera);
  lanternLighting.setDepthSource(towerMist.depthTarget.depthTexture,camera,renderer);
  catcherRay.update(state==='paused'?0:dt,visualTime,rabbit,state==='playing'&&!falling&&!!currentVitralZone&&!currentVitralZone.extinguished,camera);
  const fallFade=falling&&!rabbitState.fall.recoverable?Math.min(.94,(1-Math.exp(-rabbitState.fall.time*1.2))*.48+rabbitState.fall.dissolve*.46):0;
  atmosphericFocus.render(renderer,scene,camera,rabbit.position,depthLight(s),towerMist.depthTarget.depthTexture,fallFade,arenaView,phaseTrail,rabbitHitEffects);
  }finally{renderCulling.end();}
  performanceProbe?.end();
}
let propBatches,stairBatches,renderCulling,preparedResources,chestGemWarmupAssets;
async function prepareRunWorld(){
lanternLighting.setDepthSource(towerMist.depthTarget.depthTexture,camera,renderer);
$('phase-status').parentElement.hidden=!RUN_UPGRADES.dashEnabled;document.querySelector('[data-key=ShiftLeft]').hidden=!RUN_UPGRADES.dashEnabled;
$('flare-hint').hidden=!RUN_UPGRADES.flare;$('flare-touch').hidden=!RUN_UPGRADES.flare;
camera.position.set(3,TOWER_TOP+4,16);
phaseTrail.update(.016,new THREE.Vector3(0,.5,0),true,camera,phaseTrail.color,true);
phaseTrail.update(.016,new THREE.Vector3(.4,.5,0),true,camera,phaseTrail.color,true);
landingEffects.land(new THREE.Vector3(),1);landingEffects.update(.08);
const chestGemWarmup=chestGemWarmupAssets??=COLLECTIBLES.variants.map((_,index)=>createGemPickable(index,{s:0,lane:0,position:new THREE.Vector3()}).o);
for(const root of chestGemWarmup)scene.add(root);
const pickupWarmupRoots=pickupEffects.prepareWarmup(glints[0]?.o);
const vineLeafWarmup=vineLeaves.prepareWarmup();
const grassExitWarmup=grassExitParticles.prepareWarmup();
const secretDirtWarmup=secretDirtParticles.prepareWarmup();
towerHierarchy.add(crystalGroup,FLOORS.length-1);towerHierarchy.add(crystalLight,FLOORS.length-1);towerHierarchy.root.attach(dust);
await preparationStep('hierarchy');
towerHierarchy.organize({walkableFloors,beasts,glints,chests,bottles,books,hazards,arenas,secretLevels,floorGates,windowPanes,catcher,architecture,springboards,threatVisuals});
Object.assign(end,route(END+1));
windowLight.group.removeFromParent();
windowLight=createWindowLight(windowPanes,walkableFloors,shadowShelves);scene.add(windowLight.group);
windowLight.setDepthSource(towerMist.depthTarget.depthTexture,towerMist.material.uniforms.resolution.value,towerMist.material.uniforms.cameraRange.value);
towerHierarchy.onRotate=({towerDelta=0,floorsChanged=false,floorDeltas=[]}={})=>{
  Object.assign(end,route(END+1));
  if(floorsChanged)shelfRelics.updateDynamic(true);
  for(const item of springboards.items)Object.assign(item.p,route(item.s));
  for(const a of arenas.arenas)a.theta=route(a.plank).theta;
  for(const floor of walkableFloors)if(floor.userData.s!==undefined)floor.userData.theta=route(floor.userData.s).theta;
  windowLight.rotate(index=>towerDelta+(floorDeltas[index]??0));
};
propBatches=new PropBatches((new URLSearchParams(location.search).has('prop-batches')&&!new URLSearchParams(location.search).has('batching-off')?walkableFloors:[]).filter(f=>!f.userData.secretStep).map(f=>f.parent),new Set(movingPlatforms.map(p=>p.group)));
stairBatches=new StairBatches((new URLSearchParams(location.search).has('batching-off')?[]:walkableFloors).filter(f=>!f.userData.secretStep).map(f=>f.parent),new Set(movingPlatforms.map(p=>p.group)));
scene.traverse(object=>{if(object.isLight)object.layers.enable(2);});
await reportPreparation.prepare();
await preparationStep('shaders');
await warmupFirstActions(renderer,scene,camera,[...chestGemWarmup,...vitralEntryEffects.pool.map(effect=>effect.mesh),catcherRay.line,catcherRay.spark,phaseTrail.mesh,phaseTrail.halo,phaseTrail.sparks,landingEffects.group,vitralGlow.group,vineLeafWarmup,grassExitWarmup,secretDirtWarmup,...pickupWarmupRoots]);
preparedResources=runResources(scene);
for(const root of chestGemWarmup)root.removeFromParent();
phaseTrail.reset();landingEffects.reset();pickupEffects.clear();vineLeaves.clear();grassExitParticles.clear();secretDirtParticles.clear();
// Compile the actual full-scene and framebuffer variants while the loading UI is up.
renderer.setRenderTarget(atmosphericFocus.target);await renderer.compileAsync(scene,camera);renderer.setRenderTarget(null);
scene.updateMatrixWorld();towerMist.renderDepth(renderer,scene,camera);
atmosphericFocus.render(renderer,scene,camera,rabbit.position,depthLight(0),towerMist.depthTarget.depthTexture,0,null,phaseTrail,rabbitHitEffects);
showLevelDiagnostics(LEVEL_DIAGNOSTICS);
renderCulling=new RenderCulling(walkableFloors.filter(floor=>!floor.userData.secretStep).map(floor=>floor.parent));
scene.matrixWorldAutoUpdate=false;
}
await prepareRunWorld();
const runURL=new URL(location.href);
runURL.searchParams.set('seed',randomManager.seed);history.replaceState(history.state,'',runURL.href);
if(runURL.searchParams.has('sunny-reset')){runURL.searchParams.delete('sunny-reset');history.replaceState(history.state,'',runURL.href);}
if(runURL.searchParams.has('sunny-run')){
  start({boss:runURL.searchParams.has('sunny-boss')});update(0);state='loading';runURL.searchParams.delete('sunny-run');runURL.searchParams.delete('sunny-boss');
  history.replaceState(history.state,'',runURL.href);
}else try{if(sessionStorage.getItem('sunny.next-run')==='1'){sessionStorage.removeItem('sunny.next-run');start();}}catch{}
let performanceProbe;
function installPerformanceProbe(){performanceProbe=createPerformanceProbe(renderer,[
['props',propBatches,'update'],['batches',stairBatches,'update'],['matrices',scene,'updateMatrixWorld'],['culling',renderCulling,'begin'],['depth',towerMist,'renderDepth'],['composite',atmosphericFocus,'render'],['threats',threatVisuals,'update'],['hierarchy',towerHierarchy,'update'],['relicsDynamic',shelfRelics,'updateDynamic'],['relicsWind',shelfRelics,'updateWind'],['windowLight',windowLight,'update'],['lanterns',lanternLighting,'update'],['foliage',vineLeaves,'update'],['parchment',floatingParchment,'update'],['floorGates',floorGates,'update'],['secrets',secretLevels,'reveal'],['input',inputDevices,'sample'],['focus',focusIndicator,'update'],['comboHUD',comboHUD,'update']
]);}
installPerformanceProbe();
requestAnimationFrame(frame);
requestAnimationFrame(()=>revealNextRun(()=>{if(state==='loading'){keys.clear();inputDevices?.clear();inputManager.clear();frameClock.reset();state='playing';flashRunStart();}}));

if(new URLSearchParams(location.search).has('geometry-report')){
 const {geometryInventory}=await import('./geometry-inventory.js');const libraries=[];scene.traverse(o=>{if(o.name==='Ancient library')libraries.push(o)});
 const props=[];scene.traverse(o=>{if(o.name==='Background props')props.push(o)});
 const report=geometryInventory(scene,[['Библиотечные шкафы и книги',libraries],['Лестницы и фоновые пропсы',walkableFloors.filter(f=>!f.userData.secretStep).map(f=>f.parent)],['Камни',glints.map(g=>g.o)],['Сундуки',chests.map(c=>c.o)],['Враги',beasts.map(b=>b.o)],['Угрозы',threatVisuals.items.map(i=>i.group)],['Зайчик', [rabbit]],['Санкатчер',[catcher]],['Туман',[towerMist.mesh]],['Арены',arenas.arenas.map(a=>a.group)],['Ворота',floorGates.gates.map(g=>g.group)],['Фоновые пропсы',props],['Секретные дороги и комнаты',secretLevels.routes.flatMap(r=>[r.group,r.room])]]);
 const output=document.createElement('script');output.type='application/json';output.id='geometry-report';output.textContent=JSON.stringify(report);document.body.append(output);
}

export function startPreparedRun(options={}){start(options);}

