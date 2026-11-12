import * as THREE from 'three';
import {ArenaRun,ARENA_RADIUS,clampArena} from './arena-state.js';
import {route,canStomp} from './game.js';
import {phaseHitsTarget} from './abilities.js';
import {createShadowBeast,BEAST_KINDS,animateShadowBeast,killShadowBeast,animateBeastDeath,resetShadowBeast} from './shadow-beast.js';
import {createVisualRandom} from './visual-random.js';

function fractureGeometry(inner,outer,count){
  const gap=.045,r0=inner===0?0:inner+gap*.5,r1=outer-gap*.5,half=Math.max(.01,Math.PI/count-.004),depth=outer-inner;
  const innerHalf=r0*Math.tan(half),outerHalf=r1*Math.tan(half),shape=new THREE.Shape();
  shape.moveTo(-innerHalf,depth*.5);shape.lineTo(innerHalf,depth*.5);shape.lineTo(outerHalf,-depth*.5);shape.lineTo(-outerHalf,-depth*.5);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.38,bevelEnabled:false,curveSegments:1});geometry.rotateX(-Math.PI/2);return geometry;
}

function arenaShadowGeometry(radius){
  const rings=24,segments=96,positions=[0,.008,0],uvs=[.5,.5],colors=[],indices=[];
  const woodGray=new THREE.Color('#929292');
  colors.push(woodGray.r,woodGray.g,woodGray.b);
  for(let ring=1;ring<=rings;ring++){
    const radial=ring/rings,color=woodGray;
    for(let segment=0;segment<=segments;segment++){
      const angle=segment/segments*Math.PI*2,x=Math.cos(angle)*radius*radial,z=Math.sin(angle)*radius*radial;
      positions.push(x,.008,z);uvs.push(.5+x/(radius*2),.5+z/(radius*2));colors.push(color.r,color.g,color.b);
    }
  }
  const firstRing=1;
  for(let segment=0;segment<segments;segment++)indices.push(0,firstRing+segment+1,firstRing+segment);
  for(let ring=1;ring<rings;ring++){
    const innerStart=1+(ring-1)*(segments+1),outerStart=1+ring*(segments+1);
    for(let segment=0;segment<segments;segment++){
      const a=innerStart+segment,b=outerStart+segment;
      indices.push(a,a+1,b,a+1,b+1,b);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function disposeGroupResources(group,preservedMaterials=[]){
  const geometries=new Set(),materials=new Set(preservedMaterials);
  group.traverse(object=>{if(!object.isMesh)return;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials)if(!preservedMaterials.includes(material))material.dispose();
}

export class FloorArenas extends ArenaRun {
  constructor(scene,materials,palette){
    super();this.scene=scene;this.palette=palette;this.random=createVisualRandom('arena-enemies');this.collapseRandom=createVisualRandom('arena-collapse');this.hitCooldown=0;
    const wood=new THREE.MeshStandardMaterial({color:'#735b43',map:materials.carved.map,roughness:.85});
    const edge=materials.bronze.clone();edge.fog=false;edge.color.set('#493423');this.wood=wood;this.edge=edge;
    this.fightBase=new THREE.MeshBasicMaterial({color:'#000000',fog:false,toneMapped:false});
    this.fightEdge=new THREE.MeshBasicMaterial({color:'#242424',fog:false,toneMapped:false});
    this.fightWood=new THREE.MeshBasicMaterial({map:materials.carved.map,vertexColors:true,side:THREE.DoubleSide,fog:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
    this.fightWood.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 arenaPoint;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n arenaPoint=position.xz/${ARENA_RADIUS.toFixed(5)};`);
      shader.fragmentShader=`varying vec2 arenaPoint;
        float arenaHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float arenaNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(arenaHash(i),arenaHash(i+vec2(1.,0.)),f.x),mix(arenaHash(i+vec2(0.,1.)),arenaHash(i+vec2(1.,1.)),f.x),f.y);}
      `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float shadowRadius=length(arenaPoint);
        float shadowWarp=arenaNoise(arenaPoint*18.)*.0375+arenaNoise(arenaPoint*57.)*.0125;
        float shadowT=clamp((shadowRadius+shadowWarp-.70)/.28,0.,1.);
        float shadowFade=pow(shadowT*shadowT*(3.-2.*shadowT),1.3);
        diffuseColor.rgb=vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)))*(1.-shadowFade);`);
    };
    this.fightWood.customProgramCacheKey=()=> 'arena-gray-wood-noisy-edge';
    for(const a of this.arenas){
      a.group=new THREE.Group();a.group.position.y=a.y;scene.add(a.group);
      a.floor=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS,ARENA_RADIUS,.38,64),wood);a.floor.position.y=-.19;a.group.add(a.floor);
      a.combatTint=new THREE.Mesh(arenaShadowGeometry(ARENA_RADIUS),this.fightWood);a.combatTint.visible=false;a.combatTint.renderOrder=1;a.group.add(a.combatTint);
      a.rings=[];
      for(const radius of [ARENA_RADIUS-.16,ARENA_RADIUS-.35,ARENA_RADIUS*.205]){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,5,80),edge);ring.rotation.x=-Math.PI/2;ring.position.y=.015;a.group.add(ring);a.rings.push(ring);
      }
      const wallMaterial=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,fog:false,toneMapped:false,uniforms:{clock:{value:0},strength:{value:0},wallSeed:{value:this.random()*1000}},
        vertexShader:'varying vec2 wallUV;void main(){wallUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`uniform float clock,strength,wallSeed;varying vec2 wallUV;
          float hash(vec3 p){p=fract(p*.3183099+vec3(.1));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
          float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
          float fbm(vec3 p){float sum=0.,amp=.5;for(int i=0;i<4;i++){sum+=amp*noise(p);p*=2.;amp*=.5;}return sum;}
          void main(){
            float beltX=wallUV.x+clock*.017;
            vec2 beltCircle=vec2(cos(beltX*6.2831853),sin(beltX*6.2831853));
            float warp=fbm(vec3(beltCircle*3.2,clock*.23+wallSeed));
            float localWarp=noise(vec3(beltCircle*7.1,clock*.37+wallSeed));
            beltX+=(warp-.45)*.048+(localWarp-.5)*.012;
            float angle=beltX*6.2831853;vec2 circle=vec2(cos(angle),sin(angle));
            float broad=fbm(vec3(circle.x*2.4,circle.y*2.4,1.7+clock*.2));
            float u=beltX*37.,cell=floor(u),teeth=0.;
            for(int offset=-1;offset<=1;offset++){
              float id=cell+float(offset),key=mod(id,37.);
              float a=hash(vec3(key,wallSeed,1.)),b=hash(vec3(key,wallSeed,5.));
              float c=hash(vec3(key,wallSeed,9.)),d=hash(vec3(key,wallSeed,17.));
              float center=id+.18+a*.64;
              float lean=(c-.5)*wallUV.y*.55+sin(clock*.55+key)*.065;
              float distanceToTip=u-center-lean;
              float width=mix(.22,.82,b)*(distanceToTip<0.?mix(.55,1.4,d):mix(1.4,.55,d));
              float tooth=pow(max(0.,1.-abs(distanceToTip)/width),mix(1.5,6.,c));
              float stretch=.5+.5*sin(clock*mix(.55,1.05,b)+key*2.7);
              stretch=stretch*stretch*(3.-2.*stretch);
              float growth=mix(.35,1.15,stretch);
              teeth=max(teeth,tooth*mix(.10,.93,pow(a,1.4))*growth);
            }
            float top=.055+broad*.09+teeth;
            float edgeFade=1.-smoothstep(top-.009,top+.008,wallUV.y);if(edgeFade<.002)discard;
            float cloud=fbm(vec3(circle*4.2,wallUV.y*2.4-clock*.10));
            float grain=fbm(vec3(circle*12.,wallUV.y*5.5-clock*.20));
            float tendril=pow(max(0.,sin(angle*7.+cloud*5.+clock*.11)),10.);
            float drift=.5+.5*sin(angle*4.+wallUV.y*8.+grain*5.+clock*.16);
            float verticalOpacity=1.-smoothstep(0.,.72,wallUV.y)*.36;
            float cloudOpacity=clamp(verticalOpacity+cloud*.18+grain*.1+tendril*.14+drift*.04,.64,1.);
            float baseFade=smoothstep(.012,.055,wallUV.y);
            float opacity= mix(1.,cloudOpacity*edgeFade,baseFade);
            float density=opacity*(strength>.995?1.:strength);
            vec3 color=vec3(0.);
            gl_FragColor=vec4(color,density);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`});
      a.wall=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS,ARENA_RADIUS,3.8,96,1,true),wallMaterial);a.wall.position.y=1.9;a.wall.visible=false;a.group.add(a.wall);
      // Composite the shadow barrier after translucent window rays and mist.
      // Its solid black foot then covers their colour instead of receiving it.
      a.wall.renderOrder=10;
      a.pillars=new THREE.Group();a.pillars.visible=false;a.group.add(a.pillars);
      const pillarMaterial=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,fog:false,toneMapped:false,
        uniforms:a.wall.material.uniforms,
        vertexShader:`uniform float clock;
          void main(){
            vec3 flame=position;float height=uv.y;
            float phase=modelMatrix[3].x*1.7+modelMatrix[3].z*.9;
            flame.xz*=.50+.30*sin(height*3.14159265);
            float bend=height*height;
            float curl=sin(height*5.8+phase+clock*.55)*sin(height*1.5707963);
            flame.x+=curl*.65+bend*(sin(clock*.9+phase)*.35+.30);
            flame.z+=sin(height*4.5+phase-clock*.45)*height*.38;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(flame,1.);
          }`,
        fragmentShader:`uniform float strength;
          void main(){
            gl_FragColor=vec4(vec3(0.),strength>.995?1.:strength);
            #include <colorspace_fragment>
          }`});
      const pillarGeometry=new THREE.CylinderGeometry(0,.34,1,20,32,false);
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4,random=this.random(),height=2.6+((i+random)*.61803398875%1)*4.4;
        const pillar=new THREE.Mesh(pillarGeometry,pillarMaterial);
        pillar.position.set(Math.cos(angle)*(ARENA_RADIUS-.12),height*.5,Math.sin(angle)*(ARENA_RADIUS-.12));
        pillar.scale.set(.85+this.random()*.45,height,.85+this.random()*.45);pillar.rotation.y=this.random()*Math.PI*2;pillar.renderOrder=11;a.pillars.add(pillar);
      }
      const moteCount=96,moteGeometry=new THREE.PlaneGeometry(1,1),moteParams=new Float32Array(moteCount*4);
      const moteMaterial=new THREE.ShaderMaterial({uniforms:a.wall.material.uniforms,transparent:true,depthWrite:false,fog:false,toneMapped:false,
        vertexShader:`uniform float clock;attribute vec4 moteParams;varying vec2 moteUV;varying float moteFade;
          void main(){
            float age=mod(clock+moteParams.x,moteParams.y),life=age/moteParams.y;
            vec4 world=instanceMatrix*vec4(0.,0.,0.,1.);
            world.y+=.03+age*moteParams.z;
            world.x+=sin(age*.9+moteParams.x)*life*.22;
            world.z+=cos(age*.7+moteParams.x)*life*.22;
            vec4 view=modelViewMatrix*world;
            view.xy+=position.xy*moteParams.w*(1.-life*.35);
            moteUV=uv;moteFade=smoothstep(0.,.12,life)*(1.-smoothstep(.55,1.,life));
            gl_Position=projectionMatrix*view;
          }`,
        fragmentShader:`uniform float strength;varying vec2 moteUV;varying float moteFade;
          void main(){float radius=length(moteUV*2.-1.);if(radius>1.)discard;
            gl_FragColor=vec4(vec3(0.),(1.-smoothstep(.65,1.,radius))*moteFade*strength);
          }`});
      a.motes=new THREE.InstancedMesh(moteGeometry,moteMaterial,moteCount);
      const moteDummy=new THREE.Object3D();
      for(let i=0;i<moteCount;i++){
        const angle=this.random()*Math.PI*2,radius=ARENA_RADIUS*(.90+this.random()*.09);
        moteDummy.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);moteDummy.updateMatrix();a.motes.setMatrixAt(i,moteDummy.matrix);
        moteParams.set([this.random()*30,2.2+this.random()*2.6,.22+this.random()*.65,.14+this.random()*.25],i*4);
      }
      moteGeometry.setAttribute('moteParams',new THREE.InstancedBufferAttribute(moteParams,4));
      a.motes.instanceMatrix.needsUpdate=true;a.motes.frustumCulled=false;a.motes.renderOrder=12;a.motes.visible=false;a.group.add(a.motes);
      const p=route(a.exitS),exit=new THREE.Mesh(new THREE.TorusGeometry(.58,.055,5,32),new THREE.MeshBasicMaterial({color:'#ffe49b',transparent:true,opacity:0,toneMapped:false}));
      exit.rotation.x=-Math.PI/2;exit.position.set(Math.cos(p.theta)*(ARENA_RADIUS-1),.055,Math.sin(p.theta)*(ARENA_RADIUS-1));a.group.add(exit);a.exit=exit;
      a.enemies=[];
    }
  }
  reset(){
    super.reset();this.hitCooldown=0;this.fallHidden=false;
    for(const a of this.arenas){if(!this.scene||!a.group)continue;
      if(a.collapse){this.scene.remove(a.collapse.group);disposeGroupResources(a.collapse.group);a.collapse=null;}
      if(!a.group.parent)this.scene.add(a.group);a.group.visible=true;this.setCombatLook(a,false);a.combatTint.visible=false;a.wall.visible=false;a.pillars.visible=false;a.motes.visible=false;a.wall.material.uniforms.strength.value=0;a.exit.material.opacity=0;
      for(const b of a.enemies){if(!b.o.parent)this.scene.add(b.o);resetShadowBeast(b);b.o.visible=false;b.hp=b.maxHP;b.hurt=0;}
    }
  }
  setCombatLook(arena,enabled){
    arena.floor.material=enabled?this.fightBase:this.wood;
    for(const ring of arena.rings)ring.material=enabled?(ring.geometry.parameters.radius>=ARENA_RADIUS*.94?this.fightBase:this.fightEdge):this.edge;
    arena.combatTint.visible=enabled;
  }
  startCollapse(a){
    a.age=0;const destination=route(a.returnS);this.player={x:destination.x,y:destination.y,z:destination.z};
    a.wall.visible=false;a.exit.visible=false;a.group.visible=false;
    const group=new THREE.Group();group.position.y=a.y;this.scene.add(group);
    const material=this.wood.clone();material.transparent=true;material.opacity=1;material.depthWrite=false;
    const innerBreak=ARENA_RADIUS*.35,outerBreak=ARENA_RADIUS*.73;
    const pieces=[],rings=[[0,innerBreak,8],[innerBreak,outerBreak,14],[outerBreak,ARENA_RADIUS,22]];
    for(const [inner,outer,count] of rings){
      const geometry=fractureGeometry(inner,outer,count),radius=(inner+outer)*.5;
      for(let i=0;i<count;i++){
        const angle=(i+.5)/count*Math.PI*2,object=new THREE.Mesh(geometry,material),radialX=Math.cos(angle),radialZ=Math.sin(angle);
        object.position.set(radialX*radius,-.38,radialZ*radius);object.rotation.y=Math.PI/2-angle;group.add(object);
        const tangentX=-radialZ,tangentZ=radialX,random=this.collapseRandom();
        pieces.push({object,vx:radialX*(.35+random*.85)+tangentX*(random-.5)*1.8,vy:.7+this.collapseRandom()*1.8,vz:radialZ*(.35+this.collapseRandom()*.85)+tangentZ*(this.collapseRandom()-.5)*1.8,rx:(this.collapseRandom()-.5)*2.6,ry:(this.collapseRandom()-.5)*2.2,rz:(this.collapseRandom()-.5)*2.6});
      }
    }
    a.collapse={group,material,pieces,geometries:[...new Set(pieces.map(piece=>piece.object.geometry))],age:0};
  }
  updateCollapse(a,dt){
    const collapse=a.collapse;collapse.age+=dt;
    for(const b of a.enemies)if(b.dead)animateBeastDeath(b,dt);
    const fade=1-THREE.MathUtils.smoothstep(collapse.age,1.05,2.65);
    for(const piece of collapse.pieces){
      piece.vy-=8.5*dt;piece.object.position.x+=piece.vx*dt;piece.object.position.y+=piece.vy*dt;piece.object.position.z+=piece.vz*dt;
      piece.object.rotation.x+=piece.rx*dt;piece.object.rotation.y+=piece.ry*dt;piece.object.rotation.z+=piece.rz*dt;
      if(fade<.2)piece.object.scale.setScalar(Math.max(.015,fade/.2));
    }
    collapse.material.opacity=fade;
    if(collapse.age<2.7)return {};
    this.scene.remove(collapse.group);disposeGroupResources(collapse.group);a.collapse=null;
    this.setCombatLook(a,false);
    this.scene.remove(a.group);disposeGroupResources(a.group,[this.wood,this.edge,this.fightBase,this.fightEdge,this.fightWood]);a.group.visible=false;
    for(const b of a.enemies){b.o.visible=false;this.scene.remove(b.o);}
    for(const other of this.arenas)other.group.visible=true;
    const returnedS=a.returnS;this.active=null;return {returnedS};
  }
  enter(from,to,position){
    const a=super.enter(from,to,position);if(!a)return null;
    this.hitCooldown=.6;
    if(!a.enemies.length){
      for(let i=0;i<3;i++){
        const boss=i===0,b=createShadowBeast(boss?'wolf':BEAST_KINDS[Math.floor(this.random()*BEAST_KINDS.length)]);
        Object.assign(b,{boss,s:a.s,hp:boss?3+Math.min(2,Math.floor(a.index/4)):1,maxHP:boss?3+Math.min(2,Math.floor(a.index/4)):1,hurt:0,attack:0,phase:this.random()*Math.PI*2});
        if(boss){b.o.scale.set(1.9,1.5,1.65);b.stompTop*=1.5;
          const crown=new THREE.Group();crown.position.set(0,2.05,0);b.o.add(crown);
          for(let j=0;j<5;j++){const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.1),new THREE.MeshBasicMaterial({color:'#ff264d',fog:false,toneMapped:false}));gem.position.set((j-2)*.16,.12-Math.abs(j-2)*.025,0);crown.add(gem);}
          b.crown=crown;
        }
        const offset=i===0?Math.PI:i===1?Math.PI/3:-Math.PI/3,spawnRadius=ARENA_RADIUS-2.2;
        b.home={x:Math.cos(a.theta+offset)*spawnRadius,z:Math.sin(a.theta+offset)*spawnRadius};
        b.o.position.set(b.home.x,a.y,b.home.z);b.o.visible=false;this.scene.add(b.o);a.enemies.push(b);
      }
    }
    for(const b of a.enemies){resetShadowBeast(b);b.hp=b.maxHP;b.hurt=0;b.o.position.set(b.home.x,a.y,b.home.z);b.o.visible=false;if(b.crown)for(const gem of b.crown.children)gem.material.color.set('#ff264d');}
    for(const other of this.arenas)other.group.visible=other.index>=a.index;
    a.wall.visible=true;a.pillars.visible=true;return a;
  }
  hit(b,palette){
    if(b.dead||b.hurt>0)return false;b.hp--;b.hurt=.6;
    if(b.boss)b.crown.children.forEach((gem,i)=>gem.material.color.set(i<b.hp?'#ff264d':'#381523'));
    if(b.hp<=0)killShadowBeast(b,palette);
    return true;
  }
  setFallHidden(hidden){
    if(this.fallHidden===hidden)return;this.fallHidden=hidden;
    for(const a of this.arenas)for(const object of [a.group,...a.enemies.map(b=>b.o)]){
      if(hidden){object.userData.beforeArenaFall=object.visible;object.visible=false;}
      else if(object.userData.beforeArenaFall!==undefined){object.visible=object.userData.beforeArenaFall;delete object.userData.beforeArenaFall;}
    }
  }
  update(dt,time,{direction={x:0,z:0},dash=null,height=0,previousHeight=0,velocity=0,speed=4.8,flare=false,chargedPalette=null}={}){
    const a=this.active;if(!a)return {};
    if(a.collapse)return this.updateCollapse(a,dt);
    this.hitCooldown=Math.max(0,this.hitCooldown-dt);
    a.wall.material.uniforms.clock.value=time;
    const strength=a.stage==='cleared'||a.stage==='exiting'?0:1;
    a.wall.material.uniforms.strength.value=THREE.MathUtils.damp(a.wall.material.uniforms.strength.value,strength,6,dt);
    a.wall.visible=a.wall.material.uniforms.strength.value>.01;
    a.pillars.visible=a.wall.visible;
    a.motes.visible=a.wall.visible;
    if(a.stage==='entering'||a.stage==='exiting'){
      const exited=this.transition(dt);if(exited!==null){for(const b of a.enemies)b.o.visible=false;for(const other of this.arenas)other.group.visible=true;return {exited};}
      if(a.stage==='fighting'){this.setCombatLook(a,true);for(const b of a.enemies)b.o.visible=true;}
      return {};
    }
    const before={...this.player};this.move(dash?.x??direction.x*speed*dt,dash?.z??direction.z*speed*dt);
    const result={damage:0,kills:0,hits:0,bounce:0,phaseKill:false};
    for(const b of a.enemies){
      if(b.dead){animateBeastDeath(b,dt);continue;}
      b.hurt=Math.max(0,b.hurt-dt);
      const dx=this.player.x-b.o.position.x,dz=this.player.z-b.o.position.z,dist=Math.hypot(dx,dz)||1;
      const cycle=(time+b.phase)%3.8,windup=b.boss&&cycle>2.1&&cycle<2.8;
      const leap=b.boss?0:Math.max(0,Math.sin(time*2.5+b.phase))*.38;
      const chase=b.boss?(windup?0:cycle>=2.8?7:1.05):1.7+a.index*.035;
      if(b.hurt<=0){b.o.position.x+=dx/dist*chase*dt;b.o.position.z+=dz/dist*chase*dt;clampArena(b.o.position,ARENA_RADIUS-(b.boss?1.3:.8));}
      b.o.position.y=a.y+leap;b.o.rotation.y=Math.atan2(dx,dz);animateShadowBeast(b,time,leap);
      if(b.boss)b.head.rotation.x=windup?-.4:0;
      const target={x:b.o.position.x,y:a.y+leap+.7,z:b.o.position.z};
      const dashHit=!!dash&&phaseHitsTarget({...before,y:a.y+previousHeight+.45},{...this.player,y:a.y+height+.45},target);
      const radius=b.boss?1.15:.72,overlap=Math.hypot(this.player.x-target.x,this.player.z-target.z)<radius;
      const top=a.y+leap+b.stompTop;
      const stomp=!dash&&canStomp(a.y+previousHeight+.12,a.y+height+.12,b.lastTop??top,top,velocity,overlap);
      if(dashHit||stomp||(flare&&dist<3)){
        const hit=this.hit(b,dashHit||flare?this.palette:chargedPalette);
        if(hit){result.hits++;if(stomp)result.bounce=Math.max(result.bounce,top-a.y+.03);if(b.dead){result.kills++;result.phaseKill||=dashHit;}}
      }
      b.lastTop=top;
      if(!b.dead&&!dash&&b.hurt<=0&&overlap&&height<1.25&&this.hitCooldown<=0){
        result.damage+=b.boss?24:14;this.hitCooldown=.9;
        const awayX=(this.player.x-b.o.position.x)/Math.max(.1,dist),awayZ=(this.player.z-b.o.position.z)/Math.max(.1,dist);
        this.move(awayX*2,awayZ*2);
      }
    }
    a.living=a.enemies.filter(b=>!b.dead).length;
    if(a.stage==='fighting'&&a.living===0){this.clear();this.setCombatLook(a,false);this.startCollapse(a);result.cleared=true;result.teleported=true;result.returnedS=a.returnS;
    }
    return result;
  }
}
