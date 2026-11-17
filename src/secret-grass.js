import * as THREE from 'three';
import {createVisualRandom} from './visual-random.js';

const tipGradient=height=>'pow(smoothstep(.42,1.,'+height+'),1.5)';

function tuftGeometry(random,style){
    const positions=[],uvs=[],depths=[],indices=[];
    for(let blade=0;blade<[11,8,13][style];blade++){
      const angle=blade*2.39996,height=[.17,.31,.20][style]+random()*[.13,.18,.14][style],lean=[.18,.08,.23][style]+random()*.13,offset=.045+random()*.06,base=positions.length/3;
      for(const t of [0,.2,.42,.65,.84,1]){
        const width=(t===1?0:Math.pow(Math.sin((t*.9+.1)*Math.PI),.75))*([.065,.042,.085][style]+blade%3*.009),bend=offset+lean*t*t;
        for(const sign of [-1,1]){positions.push(Math.cos(angle)*bend-Math.sin(angle)*width*sign,height*t,Math.sin(angle)*bend+Math.cos(angle)*width*sign);uvs.push((sign+1)*.5,t);depths.push(0);}
      }
      for(let row=0;row<5;row++){const a=base+row*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('roadDepth',new THREE.Float32BufferAttribute(depths,1));geometry.setIndex(indices);geometry.computeVertexNormals();
    return geometry;
}

// Three instanced batches per road; grass never participates in collisions.
export class SecretGrass {
  constructor(road,seed,repeat){
    const random=createVisualRandom('road-tufts-'+seed);
    const material=road.mesh.material.clone();material.vertexColors=false;material.bumpMap=null;material.side=THREE.DoubleSide;material.transparent=false;material.depthWrite=true;material.fog=true;
    const groundMaterial=road.mesh.material;this.windTime={value:0};
    material.onBeforeCompile=shader=>{
      groundMaterial.onBeforeCompile(shader);shader.uniforms.tuftWindTime=this.windTime;
      shader.vertexShader='uniform float tuftWindTime;attribute vec2 tuftRoadUV;varying vec2 tuftSurfaceUV;varying float tuftHeight;varying vec3 tuftUpView;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=normalize(mix(vec3(0.,1.,0.),objectNormal,smoothstep(0.,.35,uv.y)));');
      shader.vertexShader=shader.vertexShader.replace('grassUV=uv;grassDepth=roadDepth;grassWorld=(modelMatrix*vec4(transformed,1.)).xyz;',
        'tuftUpView=normalize(normalMatrix*mat3(instanceMatrix)*vec3(0.,1.,0.));tuftSurfaceUV=tuftRoadUV;tuftHeight=uv.y;grassUV=tuftRoadUV;grassDepth=0.;grassWorld=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;');
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
        float windWeight=`+tipGradient('uv.y')+`;
        float windPhase=dot(grassWorld.xz,vec2(.71,.43));
        float gust=sin(tuftWindTime*1.15+windPhase*.32)*.035+sin(tuftWindTime*2.05+windPhase)*.012;
        vec3 windWorld=vec3(.8,0.,.6)*gust+vec3(-.6,0.,.8)*sin(tuftWindTime*.87+windPhase*.6)*.012;
        vec3 windLocal=vec3(dot(normalize(instanceMatrix[0].xyz),windWorld),dot(normalize(instanceMatrix[1].xyz),windWorld),dot(normalize(instanceMatrix[2].xyz),windWorld));
        transformed+=windLocal*windWeight;
        #include <project_vertex>
      `);
      shader.fragmentShader='varying vec3 tuftUpView;varying vec2 tuftSurfaceUV;varying float tuftHeight;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(tuftUpView);');
      shader.fragmentShader=shader.fragmentShader.replace('texture2D(map,vMapUv)','texture2D(map,tuftSurfaceUV*vec2(1.,'+repeat.toFixed(6)+'))');
      shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb=mix(diffuseColor.rgb,soil,soilMask);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,soil,soilMask);float tipLight='+tipGradient('tuftHeight')+';diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.36,.52,.16),tipLight*.88);');
    };
    material.customProgramCacheKey=()=> 'secret-soft-opaque-grass-wind-v5-'+repeat.toFixed(6);
    const batches=Array.from({length:3},()=>({transforms:[],uv:[],sections:[]}));
    const dummy=new THREE.Object3D(),vertex=road.mesh.geometry.attributes.position,roadUV=road.mesh.geometry.attributes.uv;
    for(let row=5;row<road.segments-4;row+=3){
      for(const band of [.08,.28,.5,.72,.92]){
        if(random()<.30)continue;
        const across=THREE.MathUtils.clamp(band+(random()-.5)*.12,.035,.965),along=random()*.7;
        const a=new THREE.Vector3().fromBufferAttribute(vertex,row*road.rowStride).lerp(new THREE.Vector3().fromBufferAttribute(vertex,(row+1)*road.rowStride),along);
        const b=new THREE.Vector3().fromBufferAttribute(vertex,row*road.rowStride+1).lerp(new THREE.Vector3().fromBufferAttribute(vertex,(row+1)*road.rowStride+1),along);
        const next=new THREE.Vector3().fromBufferAttribute(vertex,(row+1)*road.rowStride);
        const up=new THREE.Vector3().subVectors(next,a).cross(new THREE.Vector3().subVectors(b,a)).normalize();
        dummy.position.copy(a).lerp(b,across);dummy.position.y-=.045;
        const tilt=THREE.MathUtils.degToRad(10);
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),up).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((random()*2-1)*tilt,random()*Math.PI*2,(random()*2-1)*tilt,'YXZ')));
        const scale=.65+random()*.75;dummy.scale.set(scale,scale*(.75+random()*.5),scale);dummy.updateMatrix();
        const batch=batches[Math.floor(random()*3)];batch.transforms.push(dummy.matrix.clone());batch.uv.push(across,THREE.MathUtils.lerp(roadUV.getY(row*road.rowStride),roadUV.getY((row+1)*road.rowStride),along));batch.sections.push(row+along);
      }
    }
    this.meshes=batches.map((batch,style)=>{
      const geometry=tuftGeometry(random,style);geometry.setAttribute('tuftRoadUV',new THREE.InstancedBufferAttribute(new Float32Array(batch.uv),2));
      const mesh=new THREE.InstancedMesh(geometry,material,batch.transforms.length);batch.transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=0;road.mesh.add(mesh);mesh.userData.sections=batch.sections;return mesh;
    });
    this.mesh=this.meshes[0];this.sections=batches[0].sections;
  }
  update(dt){this.windTime.value+=Math.max(0,dt);}
  reveal(rows){for(const mesh of this.meshes){const sections=mesh.userData.sections;let count=0;while(count<sections.length&&sections[count]<rows)count++;mesh.count=count;}}
}
