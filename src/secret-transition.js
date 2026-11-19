import * as THREE from 'three';

// Shared by turf and instanced tufts; compiled before the first transition.
export const secretTransition={
  centre:{value:new THREE.Vector3()},age:{value:1},
  start(position){this.centre.value.copy(position);this.age.value=0;},
  follow(position){this.centre.value.copy(position);},
  update(dt){this.age.value=Math.min(1,this.age.value+Math.max(0,dt));},
  reset(){this.age.value=1;}
};
export function applySecretTransition(shader){
  shader.uniforms.secretPassCentre=secretTransition.centre;
  shader.uniforms.secretPassAge=secretTransition.age;
  shader.fragmentShader='uniform vec3 secretPassCentre;uniform float secretPassAge;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float passAge=secretPassAge;
    float passDistance=length(grassWorld.xz-secretPassCentre.xz);
    float passHeight=1.-smoothstep(.35,1.3,abs(grassWorld.y-secretPassCentre.y));
    float passFade=smoothstep(0.,.055,passAge)*(1.-smoothstep(.22,.72,passAge));
    float passHalo=exp(-passDistance*passDistance);
    float passRing=exp(-pow((passDistance-(.18+passAge*2.8))/.16,2.));
    totalEmissiveRadiance+=vec3(.30,.64,.16)*(passHalo*.9+passRing*.45)*passFade*passHeight*(1.-smoothstep(.15,.5,grassDepth));
  `);
}
