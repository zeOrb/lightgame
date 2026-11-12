import * as THREE from 'three';
import {ArenaRun,ARENA_RADIUS,clampArena} from './arena-state.js';
import {route,canStomp} from './game.js';
import {phaseHitsTarget} from './abilities.js';
import {createShadowBeast,BEAST_KINDS,animateShadowBeast,killShadowBeast,animateBeastDeath,resetShadowBeast} from './shadow-beast.js';
import {createVisualRandom} from './visual-random.js';
import {applyTowerDepth} from './tower-depth.js';

export class FloorArenas extends ArenaRun {
  constructor(scene,materials,palette){
    super();this.scene=scene;this.palette=palette;this.random=createVisualRandom('arena-enemies');this.hitCooldown=0;
    const wood=applyTowerDepth(new THREE.MeshStandardMaterial({color:'#735b43',map:materials.carved.map,roughness:.85}));
    const edge=materials.bronze;
    for(const a of this.arenas){
      a.group=new THREE.Group();a.group.position.y=a.y;scene.add(a.group);
      a.floor=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS,ARENA_RADIUS,.38,64),wood);a.floor.position.y=-.19;a.group.add(a.floor);
      for(const radius of [ARENA_RADIUS-.16,ARENA_RADIUS-.35,2]){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,5,80),edge);ring.rotation.x=-Math.PI/2;ring.position.y=.015;a.group.add(ring);
      }
      // Low ancient supports and radial planks keep the arena part of the library.
      const seams=new THREE.Group();a.group.add(seams);
      for(let i=0;i<16;i++){
        const angle=i*Math.PI/8,beam=new THREE.Mesh(new THREE.BoxGeometry(.11,.28,ARENA_RADIUS*1.65),materials.carved);
        beam.position.set(Math.cos(angle)*.5,-.48,Math.sin(angle)*.5);beam.rotation.y=-angle;seams.add(beam);
      }
      for(const section of [a.s,a.exitS]){
        const p=route(section),r=Math.hypot(p.x,p.z),start=ARENA_RADIUS-.4,end=r+.6,length=end-start;
        const bridge=new THREE.Mesh(new THREE.BoxGeometry(length,.3,1.3),wood);
        bridge.rotation.y=-p.theta;bridge.rotation.z=Math.atan2(p.y-a.y,length);
        bridge.position.set(Math.cos(p.theta)*(start+end)/2,(p.y-a.y)/2-.15,Math.sin(p.theta)*(start+end)/2);a.group.add(bridge);
      }
      const wallMaterial=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{clock:{value:0},strength:{value:0}},
        vertexShader:'varying vec2 wallUV;void main(){wallUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`uniform float clock,strength;varying vec2 wallUV;void main(){float bottom=pow(1.-wallUV.y,1.6);float bars=pow(max(0.,sin(wallUV.x*188.5)),12.);float pulse=.8+.2*sin(clock*3.-wallUV.y*9.);gl_FragColor=vec4(vec3(1.,.035,.08)*(1.+bars),(.12+bottom*.38+bars*.2)*pulse*strength);}`});
      a.wall=new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS,ARENA_RADIUS,4.4,80,1,true),wallMaterial);a.wall.position.y=2.2;a.wall.visible=false;a.group.add(a.wall);
      const p=route(a.exitS),exit=new THREE.Mesh(new THREE.TorusGeometry(.58,.055,5,32),new THREE.MeshBasicMaterial({color:'#ffe49b',transparent:true,opacity:0,toneMapped:false}));
      exit.rotation.x=-Math.PI/2;exit.position.set(Math.cos(p.theta)*(ARENA_RADIUS-1),.055,Math.sin(p.theta)*(ARENA_RADIUS-1));a.group.add(exit);a.exit=exit;
      a.enemies=[];
    }
  }
  reset(){
    super.reset();this.hitCooldown=0;this.fallHidden=false;
    for(const a of this.arenas){if(!a.group)continue;a.group.visible=true;a.wall.visible=false;a.wall.material.uniforms.strength.value=0;a.exit.material.opacity=0;
      for(const b of a.enemies){resetShadowBeast(b);b.o.visible=false;b.hp=b.maxHP;b.hurt=0;}
    }
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
        b.home={x:boss?0:Math.cos(a.theta+(i===1?1:-1)*1.4)*2.8,z:boss?0:Math.sin(a.theta+(i===1?1:-1)*1.4)*2.8};
        b.o.position.set(b.home.x,a.y,b.home.z);b.o.visible=false;this.scene.add(b.o);a.enemies.push(b);
      }
    }
    for(const b of a.enemies){resetShadowBeast(b);b.hp=b.maxHP;b.hurt=0;b.o.position.set(b.home.x,a.y,b.home.z);b.o.visible=false;if(b.crown)for(const gem of b.crown.children)gem.material.color.set('#ff264d');}
    for(const other of this.arenas)other.group.visible=other.index>=a.index;
    a.wall.visible=true;return a;
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
    this.hitCooldown=Math.max(0,this.hitCooldown-dt);
    a.wall.material.uniforms.clock.value=time;
    const strength=a.stage==='cleared'||a.stage==='exiting'?0:1;
    a.wall.material.uniforms.strength.value=THREE.MathUtils.damp(a.wall.material.uniforms.strength.value,strength,6,dt);
    a.wall.visible=a.wall.material.uniforms.strength.value>.01;
    if(a.stage==='entering'||a.stage==='exiting'){
      const exited=this.transition(dt);if(exited!==null){for(const b of a.enemies)b.o.visible=false;for(const other of this.arenas)other.group.visible=true;return {exited};}
      if(a.stage==='fighting')for(const b of a.enemies)b.o.visible=true;
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
    if(a.stage==='fighting'&&a.living===0){this.clear();result.cleared=true;}
    if(a.stage==='cleared'){
      a.exit.material.opacity=THREE.MathUtils.damp(a.exit.material.opacity,1,5,dt);a.exit.rotation.z=time*.6;
      if(height<.3)this.tryExit();
    }
    return result;
  }
}
