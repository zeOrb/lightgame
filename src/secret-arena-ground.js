import {SecretVines} from './secret-vines.js';
import * as THREE from 'three';
import {createVisualRandom} from './visual-random.js';
import {roadMaterial} from './secret-road.js';
import {tuftGeometry,createGrassMaterial} from './secret-grass.js';

export function createSecretArenaMaterial(radius=11.25){
  const material=roadMaterial(null,1,{arena:true});
  material.side=THREE.DoubleSide;
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    previous(shader);
    shader.fragmentShader=shader.fragmentShader
      .replace('vec3(.18,.075,.026),vec3(.38,.215,.085)','vec3(.25,.13,.045),vec3(.52,.34,.14)')
      .replace('(1.-grassDepth*.5)','(1.-grassDepth*.28)');
  };
  material.customProgramCacheKey=()=> 'secret-arena-rounded-turf-soil-v3';
  return material;
}

function makeTop(radius,seed){
  const rings=24,segments=192,positions=[0,0,0],uvs=[.5,.5],depths=[0],colors=[1,1,1],indices=[];
  const edge=(a)=>radius*(1+Math.sin(a*7+seed)*.012+Math.sin(a*13-seed*.7)*.006+Math.sin(a*23+seed*1.4)*.003);
  for(let ring=1;ring<=rings;ring++)for(let segment=0;segment<=segments;segment++){
    const radial=ring/rings,angle=segment/segments*Math.PI*2,r=radius*radial+(edge(angle)-radius)*radial**5,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    // Keep planar UVs for standard material plumbing; turf variation comes from
    // the arena material's rotated world-space samples, not these UVs.
    positions.push(x,0,z);uvs.push(.5,.5+z/(radius*2));depths.push(0);
    const shade=(.94+Math.sin(angle*5+seed)*.018+Math.sin(radial*19+angle*3)*.018);colors.push(shade,shade,shade);
  }
  for(let segment=0;segment<segments;segment++)indices.push(0,2+segment,1+segment);
  for(let ring=1;ring<rings;ring++){
    const inner=1+(ring-1)*(segments+1),outer=1+ring*(segments+1);
    for(let segment=0;segment<segments;segment++){
      const a=inner+segment,b=a+1,c=outer+segment,d=c+1;
      indices.push(a,b,c,b,d,c);
    }
  }
  return geometry(positions,uvs,depths,colors,indices);
}

function makeSide(radius,seed){
  const segments=192,rows=[{y:0,depth:0,inset:0},{y:-.09,depth:0,inset:.07},{y:-.23,depth:.06,inset:.10},{y:-.36,depth:.20,inset:0},{y:-.44,depth:.42,inset:-.10},{y:-.83,depth:.70,inset:-.12},{y:-1.25,depth:1,inset:-.28}],positions=[],uvs=[],depths=[],colors=[],indices=[];
  for(let row=0;row<rows.length;row++)for(let segment=0;segment<=segments;segment++){
    const angle=segment/segments*Math.PI*2,edge=radius*(1+Math.sin(angle*7+seed)*.012+Math.sin(angle*13-seed*.7)*.006+Math.sin(angle*23+seed*1.4)*.003),r=edge+rows[row].inset,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    const scallop=Math.sin(angle*43+seed)*.025+Math.sin(angle*71-seed)*.012;
    positions.push(x,rows[row].y+scallop*Math.sin(row/(rows.length-1)*Math.PI),z);uvs.push(2,segment/segments*8);depths.push(rows[row].depth);
    const shade=.94-row/(rows.length-1)*.24;colors.push(shade,shade,shade);
  }
  for(let row=0;row<rows.length-1;row++)for(let segment=0;segment<segments;segment++){
    const a=row*(segments+1)+segment,b=a+1,c=a+segments+1,d=c+1;indices.push(a,b,c,b,d,c);
  }
  return geometry(positions,uvs,depths,colors,indices);
}

function geometry(positions,uvs,depths,colors,indices){
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  result.setAttribute('uv1',result.attributes.uv.clone());
  result.setAttribute('roadDepth',new THREE.Float32BufferAttribute(depths,1));
  result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));result.setIndex(indices);
  result.computeVertexNormals();result.computeBoundingSphere();return result;
}

// Rounded continuation of the secret road: turf on top, exposed earth below,
// and low-density instanced grass around the uneven edge.
export class SecretArenaGround {
  constructor(room,radius,seed=0){
    this.material=createSecretArenaMaterial(radius);
    const top=new THREE.Mesh(makeTop(radius,seed),this.material);room.add(top);
    const side=new THREE.Mesh(makeSide(radius,seed),this.material);side.renderOrder=1;room.add(side);
    const random=createVisualRandom('secret-arena-turf-'+seed);
    const {material,windTime}=createGrassMaterial(roadMaterial(null,1,{arena:true}),1);this.windTime=windTime;
    const anchors=[];
    for(let i=0;i<78;i++){
      const angle=(i+random()*.65)/78*Math.PI*2;
      const edge=radius*(1+Math.sin(angle*7+seed)*.012+Math.sin(angle*13-seed*.7)*.006+Math.sin(angle*23+seed*1.4)*.003);
      anchors.push({position:new THREE.Vector3(Math.cos(angle)*(edge+.18),.045,Math.sin(angle)*(edge+.18))});
    }
    this.vines=new SecretVines(room,anchors,seed,windTime,roadMaterial(null,1,{arena:true}));
    const dummy=new THREE.Object3D();
    // Share the road's tuft shapes, root blend, tip tint and wind.
    for(let style=0;style<6;style++){
      const shape=tuftGeometry(random,style),count=36;
      shape.setAttribute('tuftRoadUV',new THREE.InstancedBufferAttribute(new Float32Array(count*2).fill(.5),2));
      const grass=new THREE.InstancedMesh(shape,material,count);
      for(let i=0;i<count;i++){
        const angle=random()*Math.PI*2,radial=Math.sqrt(random())*.97;
        dummy.position.set(Math.cos(angle)*radius*radial,-.035,Math.sin(angle)*radius*radial);
        const tilt=THREE.MathUtils.degToRad(10);
        dummy.rotation.set((random()*2-1)*tilt,random()*Math.PI*2,(random()*2-1)*tilt,'YXZ');
        const scale=.65+random()*.75;dummy.scale.set(scale,scale*(.75+random()*.5),scale);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
      }
      grass.frustumCulled=false;room.add(grass);
    }
  }
  update(dt){this.windTime.value+=Math.max(0,dt);}
}
