import * as THREE from 'three';

// One continuous cyclorama: floor, a tangent quarter-circle and rear wall.
export function createBestiaryBackdrop(){
  const profile=[[24,-1.1],[-5,-1.1]],radius=5;
  for(let i=1;i<=48;i++){
    const angle=i/48*Math.PI/2;
    profile.push([-5-radius*Math.sin(angle),-1.1+radius*(1-Math.cos(angle))]);
  }
  profile.push([-10,24]);
  const positions=[],indices=[];
  profile.forEach(([z,y])=>{positions.push(-40,y,z,65,y,z);});
  for(let i=0;i<profile.length-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:'#18171c',roughness:1,metalness:0});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vBackdropPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBackdropPosition=position;');
    shader.fragmentShader='varying vec3 vBackdropPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float foreground=smoothstep(-7.5,4.0,vBackdropPosition.z);
      float wall=smoothstep(-.8,4.5,vBackdropPosition.y);
      diffuseColor.rgb*=mix(.27,2.15,foreground)*(1.0-wall*.48);
    `);
  };
  material.customProgramCacheKey=()=> 'bestiary-cyclorama-depth-v1';
  return new THREE.Mesh(geometry,material);
}
