import {applyFoliageResponse} from './foliage-response.js';
import * as THREE from 'three';
import {createVisualRandom} from './random-manager.js';

function vineShape(random,style){
  const positions=[],colors=[],indices=[],uvs=[],depths=[];
  const vertex=(x,y,z,c)=>{positions.push(x,y,z);colors.push(...c);uvs.push(.5,Math.max(0,-y/(1.8+style*.75)));depths.push(0);return positions.length/3-1;};
  const length=1.8+style*.75,steps=18+style*5;
  const centre=t=>new THREE.Vector3(Math.sin(t*8+style)*.07*t,-t*length,Math.sin(t*5+style)*.055*t);
  for(let i=0;i<=steps;i++){
    const t=i/steps,p=centre(t),width=.038*(1-t*.55);
    for(let j=0;j<5;j++){const a=j/5*Math.PI*2;vertex(p.x+Math.cos(a)*width,p.y,p.z+Math.sin(a)*width,[.10,.22,.045]);}
    if(i)for(let j=0;j<5;j++){const a=(i-1)*5+j,b=(i-1)*5+(j+1)%5,c=i*5+j,d=i*5+(j+1)%5;indices.push(a,b,c,b,d,c);}
  }
  for(let i=0;i<steps;i++){
    if(i>1&&style===0&&random()<.45)continue;
    for(let spray=0;spray<(i===0?5:[1,2,4][style]);spray++){
    const t=i/steps,p=centre(t),angle=i*2.39996+style+spray*2.2,leaf=(.10+random()*.09)*[1.25,1.25,1.55][style];
    const direction=new THREE.Vector3(Math.cos(angle),i===0?.12:-.35-random()*.4,Math.sin(angle)).normalize();
    const side=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle)).multiplyScalar(leaf*.40);
    const mid=p.clone().addScaledVector(direction,leaf*.52),tip=p.clone().addScaledVector(direction,leaf);
    const a=vertex(p.x,p.y,p.z,[.08,.20,.035]),b=vertex(mid.x+side.x,mid.y+.025,mid.z+side.z,[.20,.35,.075]),c=vertex(tip.x,tip.y,tip.z,[.27,.40,.10]),d=vertex(mid.x-side.x,mid.y,mid.z-side.z,[.13,.28,.05]);indices.push(a,b,c,a,c,d);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('roadDepth',new THREE.Float32BufferAttribute(depths,1));g.setIndex(indices);g.computeVertexNormals();return g;
}

// Opaque instanced foliage shares the tower's depth tint and scene fog.
export class SecretVines{
  constructor(parent,anchors,seed,windTime,groundMaterial){
    const random=createVisualRandom('secret-vines-'+seed),material=groundMaterial.clone();
    material.vertexColors=false;material.bumpMap=null;material.side=THREE.DoubleSide;
    material.transparent=true;material.depthWrite=false;
    const previous=groundMaterial.onBeforeCompile;
    material.onBeforeCompile=shader=>{previous(shader);shader.uniforms.vineTime=windTime;
      shader.vertexShader=shader.vertexShader.replace('grassUV=uv;grassDepth=roadDepth;grassWorld=(modelMatrix*vec4(transformed,1.)).xyz;','grassUV=vec2(.5);grassDepth=0.;grassWorld=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;');
      shader.vertexShader='varying float vineDepth;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvineDepth=uv.y;');
      shader.fragmentShader='varying float vineDepth;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`diffuseColor.a*=smoothstep(0.,.14,vineDepth);
        #include <alphatest_fragment>`);
      shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb=mix(diffuseColor.rgb,soil,soilMask);','diffuseColor.rgb=mix(diffuseColor.rgb,soil,soilMask);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.36,.52,.16),smoothstep(.04,1.,vineDepth)*.85);');
      shader.vertexShader='uniform float vineTime;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float vineWeight=pow(clamp(-position.y/4.,0.,1.),1.6);
        float vinePhase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.43;
        transformed.x+=sin(vineTime*.85+vinePhase-position.y*.65)*.12*vineWeight;
        transformed.z+=sin(vineTime*.63+vinePhase*.7-position.y*.5)*.08*vineWeight;`);
    };
    const windCompile=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{windCompile(shader);applyFoliageResponse(shader,'pow(clamp(uv.y,0.,1.),2.)',3.0,2.25,true);};
    material.customProgramCacheKey=()=> 'secret-vines-player-response-v8-'+groundMaterial.customProgramCacheKey();
    this.meshes=[];const dummy=new THREE.Object3D();
    for(let style=0;style<3;style++){
      const selected=anchors.filter((_,i)=>i%3===style),mesh=new THREE.InstancedMesh(vineShape(random,style),material,selected.length);
      selected.forEach((anchor,i)=>{dummy.position.copy(anchor.position);dummy.rotation.set(0,random()*Math.PI*2,0);const scale=.65+random()*.8;const fullness=.65+random()*.95;dummy.scale.set(fullness,scale,fullness);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
      // Draw after atmospheric blur, against the copied solid-scene depth.
      // Material fog and tower-height tint still apply to the foliage itself.
      mesh.layers.set(2);
      mesh.userData.sections=selected.map(a=>a.section??0);mesh.frustumCulled=false;parent.add(mesh);this.meshes.push(mesh);
    }
  }
  reveal(rows){for(const mesh of this.meshes){let count=0;while(count<mesh.userData.sections.length&&mesh.userData.sections[count]<rows)count++;mesh.count=count;}}
}
