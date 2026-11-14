import * as THREE from 'three';
import {createVisualRandom} from './visual-random.js';
import {applyTowerDepth} from './tower-depth.js';
import {FLOOR_COUNT,TOWER_TOP} from './game.js';

function parchmentTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d'),random=createVisualRandom('floating-paper-texture');
  c.fillStyle='#b5a17d';c.beginPath();c.moveTo(7,7);
  for(let x=7;x<=121;x+=6)c.lineTo(x,5+random()*5);
  for(let y=7;y<=121;y+=6)c.lineTo(119+random()*5,y);
  for(let x=121;x>=7;x-=6)c.lineTo(x,118+random()*5);
  for(let y=121;y>=7;y-=6)c.lineTo(4+random()*5,y);
  c.closePath();c.fill();c.save();c.clip();
  for(let i=0;i<450;i++){c.fillStyle=random()<.5?'#efede718':'#57534d10';c.fillRect(random()*128,random()*128,1+random()*4,1+random()*3);}
  c.fillStyle='#625e5750';
  for(let y=23;y<106;y+=9){let x=20;while(x<102){const w=3+random()*15;c.fillRect(x,y,w,1+random());x+=w+4;}}
  c.restore();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export class FloatingParchment {
  constructor(scene){
    const random=createVisualRandom('floating-parchment'),count=FLOOR_COUNT*18;
    this.clock={value:0};
    this.arenaSphere={value:new THREE.Vector4(0,0,0,0)};
    const geometry=new THREE.PlaneGeometry(1,1.4,4,5),phases=new Float32Array(count);
    const material=applyTowerDepth(new THREE.MeshStandardMaterial({map:parchmentTexture(),color:'#d5c4a0',roughness:1,side:THREE.DoubleSide,alphaTest:.12,transparent:true,depthWrite:false,depthTest:true}));
    const depthCompile=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      depthCompile(shader);shader.uniforms.paperClock=this.clock;shader.uniforms.paperArenaSphere=this.arenaSphere;
      shader.vertexShader=`uniform float paperClock;attribute float paperPhase;varying float paperAge;varying float paperSeed;varying float paperDistance;varying vec3 paperWorld;
        mat3 paperTurn(){
          float t=paperClock,p=paperPhase;
          float yaw=p+t*(.28+fract(p)*.24);
          float pitch=p*.71+t*(.48+fract(p*.37)*.38)+sin(t*.83+p)*.55;
          float bank=sin(t*(.64+fract(p*.53)*.35)+p)*.65;
          float cy=cos(yaw),sy=sin(yaw),cx=cos(pitch),sx=sin(pitch),cz=cos(bank),sz=sin(bank);
          mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);
          mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);
          mat3 rz=mat3(cz,sz,0.,-sz,cz,0.,0.,0.,1.);
          return ry*rz*rx;
        }
      `+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=paperTurn()*objectNormal;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float t=paperClock*.38+paperPhase;
        transformed.z+=sin(position.y*3.8+t*1.7)*.12;
        transformed.y+=sin(t*.7)*.15;
        transformed=paperTurn()*transformed;`);
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
        paperAge=mod(paperClock+paperPhase,5.);paperSeed=paperPhase;
        float cycle=floor((paperClock+paperPhase)/5.);
        float h1=fract(sin(paperPhase*13.17+cycle*91.7)*43758.54);
        float h2=fract(sin(paperPhase*37.51+cycle*29.3)*22578.14);
        float h3=fract(sin(paperPhase*71.13+cycle*57.7)*19642.31);
        vec4 paperPosition=instanceMatrix*vec4(transformed,1.0);
        paperPosition.xyz-=instanceMatrix[3].xyz;
        float angle=h1*6.2831853,radius=3.5+h2*5.5;
        paperPosition.xyz+=vec3(cos(angle)*radius,6.+h3*${(TOWER_TOP+5).toFixed(1)}-paperAge*(.38+h2*.3),sin(angle)*radius);
        float gust=pow(max(0.,sin(paperClock*.24+sin(paperClock*.071)*1.7)),6.);
        paperPosition.x+=sin(t*.43)*.45+gust*paperAge*(.25+h2*.45);
        paperPosition.z+=cos(t*.31)*.35+gust*paperAge*sin(paperClock*.13)*.35;
        paperPosition.y+=gust*sin(t*1.5)*.25;
        towerWorldHeight=(modelMatrix*paperPosition).y;
        paperWorld=(modelMatrix*paperPosition).xyz;
        vec4 mvPosition=modelViewMatrix*paperPosition;
        paperDistance=length(mvPosition.xyz);
        gl_Position=projectionMatrix*mvPosition;
      `);
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','vec4 worldPosition=modelMatrix*paperPosition;');
      shader.fragmentShader=`uniform vec4 paperArenaSphere;varying vec3 paperWorld;varying float paperAge;varying float paperSeed;varying float paperDistance;
        vec3 paperRGBtoHSV(vec3 c){
          vec4 K=vec4(0.,-1./3.,2./3.,-1.);
          vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));
          vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));
          float d=q.x-min(q.w,q.y),e=1.e-10;
          return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);
        }
        vec3 paperHSVtoRGB(vec3 c){vec3 p=abs(fract(c.xxx+vec3(0.,2./3.,1./3.))*6.-3.);return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y);}
      `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        float nearBlur=1.-smoothstep(2.,6.5,paperDistance);
        vec4 paperTex=texture2D(map,vMapUv)*.2;
        for(int i=0;i<8;i++){float a=float(i)*.78539816;paperTex+=texture2D(map,clamp(vMapUv+vec2(cos(a),sin(a))*.06*nearBlur,vec2(0.),vec2(1.)))*.1;}
        diffuseColor*=paperTex;
        if(!gl_FrontFacing){
          vec3 reverseHSV=paperRGBtoHSV(diffuseColor.rgb);
          reverseHSV.x=mix(reverseHSV.x,.075,.2);reverseHSV.z*=.8;
          diffuseColor.rgb=paperHSVtoRGB(reverseHSV);
        }
      `);
      // A subdued warm light floor keeps either side readable as it tumbles.
      // Apply before tone mapping and tower fog so distant sheets still recede.
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        float lifeFade=smoothstep(0.,.45,paperAge)*(1.-smoothstep(3.8,5.,paperAge));
        float fleck=fract(sin(dot(floor(vMapUv*96.),vec2(12.9898,78.233))+paperSeed)*43758.5453);
        if(fleck<smoothstep(3.9,5.,paperAge))discard;
        diffuseColor.a*=lifeFade;
        float paperAmbient=mix(.008,.07,smoothstep(10.,${TOWER_TOP.toFixed(1)},towerWorldHeight));
        outgoingLight=max(outgoingLight,diffuseColor.rgb*paperAmbient);
        #include <opaque_fragment>
      `);
      // Preserve the parchment hue, but retain brightness from scene lighting
      // and the tower depth grade on both faces. Never restore the texture value.
      shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`
        #include <dithering_fragment>
        vec3 paperHSV=paperRGBtoHSV(max(diffuseColor.rgb,vec3(0.)));
        vec3 lit=paperRGBtoHSV(max(gl_FragColor.rgb,vec3(0.)));
        float paperDaylight=smoothstep(10.,${TOWER_TOP.toFixed(1)},towerWorldHeight);
        lit.x=mix(paperHSV.x,.095,.65);
        lit.y=min(.16,paperHSV.y*.35);
        // A small display-space floor prevents tumbling faces from disappearing
        // while still leaving a clear brightness difference between floors.
        lit.z=max(lit.z,mix(.15,.32,paperDaylight)*(.85+.15*paperHSV.z));
        gl_FragColor.rgb=paperHSVtoRGB(lit);
        vec3 paperLightTint=mix(vec3(.76,.73,1.),vec3(1.,.94,.82),paperDaylight);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*paperLightTint,.42);
        if(paperArenaSphere.w>0.&&distance(paperWorld,paperArenaSphere.xyz)<=paperArenaSphere.w){
          gl_FragColor.rgb=vec3(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722)));
        }
      `);
    };
    material.customProgramCacheKey=()=> 'floating-parchment-height-tint-v13';
    const batch=new THREE.InstancedMesh(geometry,material,count),dummy=new THREE.Object3D();batch.name='Floating parchment';batch.frustumCulled=false;batch.renderOrder=1;batch.layers.set(2);
    for(let i=0;i<count;i++){
      const angle=random()*Math.PI*2,r=3.5+random()*6.1,size=.32+random()*.32;
      dummy.position.set(Math.cos(angle)*r,6+random()*(TOWER_TOP+5),Math.sin(angle)*r);
      dummy.rotation.set((random()-.5)*1.2,random()*Math.PI*2,(random()-.5)*.7);dummy.scale.setScalar(size);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);phases[i]=random()*Math.PI*24;
    }
    geometry.setAttribute('paperPhase',new THREE.InstancedBufferAttribute(phases,1));batch.instanceMatrix.needsUpdate=true;scene.add(batch);this.mesh=batch;
  }
  update(dt,arena=null){this.clock.value+=Math.max(0,dt);this.arenaSphere.value.set(0,arena?.y??0,0,arena?.radius??0);}
}
