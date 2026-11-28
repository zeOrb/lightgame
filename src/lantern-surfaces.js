import * as THREE from 'three';
import {applyTowerDepth} from './tower-depth.js';
import {createVisualRandom} from './random-manager.js';
import {TOWER_TOP,END,depthLight} from './game.js';
let surfaces;
const lanterns=[];
export function registerLanternGlow(sprite){lanterns.push({sprite,point:new THREE.Vector3()});}
const softGlow={lampDepth:{value:null},lampResolution:{value:new THREE.Vector2(1,1)},lampRange:{value:new THREE.Vector2(.1,240)},lampDepthReady:{value:false}};
function softenGlow(material){
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,softGlow);
    shader.fragmentShader=`uniform sampler2D lampDepth;uniform vec2 lampResolution,lampRange;uniform bool lampDepthReady;
      float lampLinearDepth(float d){return lampRange.x*lampRange.y/(lampRange.y-d*(lampRange.y-lampRange.x));}
    `+shader.fragmentShader.replace('#include <alphatest_fragment>',`
      if(lampDepthReady){
        float sceneDepth=texture2D(lampDepth,gl_FragCoord.xy/lampResolution).r;
        float separation=lampLinearDepth(sceneDepth)-lampLinearDepth(gl_FragCoord.z);
        diffuseColor.a*=smoothstep(0.,.45,separation);
      }
      #include <alphatest_fragment>`);
  };
  material.customProgramCacheKey=()=> 'lantern-soft-intersection-v1';
}
export function lanternSurfaces(){
  if(surfaces)return surfaces;
  const random=createVisualRandom('aged-lantern-metal');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
  c.fillStyle='#8c7052';c.fillRect(0,0,64,64);
  for(let i=0;i<1100;i++){const v=80+Math.floor(random()*130);c.fillStyle=`rgba(${v},${Math.floor(v*.85)},${Math.floor(v*.65)},.35)`;c.fillRect(random()*64,random()*64,1+random()*2,1+random()*3);}
  c.strokeStyle='#c9a36b66';for(let y=9;y<64;y+=15){c.strokeRect(4,y,56,5);}
  const metalMap=new THREE.CanvasTexture(canvas);metalMap.colorSpace=THREE.SRGBColorSpace;
  const metal=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#b39a75',map:metalMap,bumpMap:metalMap,bumpScale:.025,roughness:.72,metalness:.48}));
  const glassCanvas=document.createElement('canvas');glassCanvas.width=glassCanvas.height=64;const g=glassCanvas.getContext('2d');
  const fill=g.createRadialGradient(30,36,2,32,32,42);fill.addColorStop(0,'#fff6c9');fill.addColorStop(.45,'#e6b770');fill.addColorStop(1,'#8d512c');g.fillStyle=fill;g.fillRect(0,0,64,64);
  for(let i=0;i<300;i++){g.fillStyle=random()<.5?'#fff9df18':'#643d2714';g.fillRect(random()*64,random()*64,1,2+random()*5);}
  const glassMap=new THREE.CanvasTexture(glassCanvas);glassMap.colorSpace=THREE.SRGBColorSpace;
  const glass=new THREE.MeshBasicMaterial({map:glassMap,color:'#ffe3af',toneMapped:false});
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const gc=glowCanvas.getContext('2d'),radial=gc.createRadialGradient(32,32,0,32,32,32);
  radial.addColorStop(0,'rgba(255,239,195,.65)');radial.addColorStop(.18,'rgba(255,186,105,.28)');radial.addColorStop(.5,'rgba(255,143,67,.08)');radial.addColorStop(1,'rgba(255,125,55,0)');gc.fillStyle=radial;gc.fillRect(0,0,64,64);
  const glowMap=new THREE.CanvasTexture(glowCanvas);
  return surfaces={metal,glass,glowMap};
}
export function lanternGlow(height,size=1.3){
  const {glowMap}=lanternSurfaces(),dark=1-THREE.MathUtils.smoothstep(height,15,TOWER_TOP);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:'#ffd09a',opacity:.4+dark*.65,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false}));
  softenGlow(sprite.material);
  sprite.scale.setScalar(size*1.4);sprite.layers.set(2);
  const bloom=new THREE.Sprite(sprite.material.clone());softenGlow(bloom.material);bloom.material.color.set('#ffab60');bloom.material.opacity*=.35;bloom.scale.setScalar(1.8);bloom.layers.set(2);sprite.add(bloom);
  registerLanternGlow(sprite);return sprite;
}

// A bounded light pool makes nearby lanterns illuminate real geometry without
// adding a dynamic light for every cabinet in the tower.
export class LanternLighting {
  static resetRegistry(){lanterns.length=0;}
  constructor(scene){
    this.lights=Array.from({length:4},()=>{const light=new THREE.PointLight('#ffbd78',0,27.5,2);scene.add(light);return light;});
  }
  setDepthSource(texture,camera,renderer){
    softGlow.lampDepth.value=texture;renderer.getDrawingBufferSize(softGlow.lampResolution.value);
    softGlow.lampRange.value.set(camera.near,camera.far);softGlow.lampDepthReady.value=!!texture;
  }
  update(focus,time){
    const daylight=depthLight(Math.max(0,Math.min(END,(TOWER_TOP-focus.y)*2)));
    const darkness=1-THREE.MathUtils.smoothstep(daylight,.18,.35);
    if(darkness<=0){for(const light of this.lights){light.intensity=0;light.visible=true;}return;}
    const candidates=[];
    for(const lantern of lanterns){
      let visible=true;for(let node=lantern.sprite;node;node=node.parent)if(!node.visible){visible=false;break;}
      if(!visible)continue;
      lantern.sprite.getWorldPosition(lantern.point);
      const distance=lantern.point.distanceToSquared(focus);
      if(distance<900)candidates.push({lantern,distance});
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    this.lights.forEach((light,i)=>{
      const item=candidates[i];light.visible=true;if(!item){light.intensity=0;return;}
      light.position.copy(item.lantern.point);
      const near=1-THREE.MathUtils.smoothstep(Math.sqrt(item.distance),20,30);
      light.intensity=darkness*near*(11+Math.sin(time*3.1+light.position.y)*.35+Math.sin(time*5.7+i)*.2);
    });
  }
}

