import * as THREE from 'three';
export const SECRET_PASS_HEIGHT=.825;

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
  shader.vertexShader=`uniform vec3 secretPassCentre;uniform float secretPassAge;
    float secretPassLift(vec3 p){
      vec2 delta=p.xz-secretPassCentre.xz;
      float radial=1.-smoothstep(.22,2.15,length(delta));
      float heightMask=1.-smoothstep(.65,1.5,abs(p.y-secretPassCentre.y));
      float rise=smoothstep(0.,.08,secretPassAge);
      float settle=1.-smoothstep(.24,.88,secretPassAge);
      return ${SECRET_PASS_HEIGHT.toFixed(3)}*pow(radial,1.35)*heightMask*rise*settle;
    }
  `+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    mat3 passBasis=mat3(modelMatrix);
    vec4 passAnchor=vec4(transformed,1.);
    #ifdef USE_INSTANCING
      passBasis=passBasis*mat3(instanceMatrix);
      passAnchor=instanceMatrix*vec4(0.,0.,0.,1.);
    #endif
    vec3 passWorld=(modelMatrix*passAnchor).xyz;
    float passEdge=smoothstep(0.,.16,grassUV.x)*(1.-smoothstep(.84,1.,grassUV.x));
    float passLift=secretPassLift(passWorld)*passEdge;
    #ifdef SECRET_VINE
      passLift=0.;
    #endif
    // Inverse orthogonal basis preserves world-up even for tilted grass clumps.
    transformed+=vec3(passBasis[0].y/dot(passBasis[0],passBasis[0]),passBasis[1].y/dot(passBasis[1],passBasis[1]),passBasis[2].y/dot(passBasis[2],passBasis[2]))*passLift;
    #include <project_vertex>
  `);
  shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>',`#include <defaultnormal_vertex>
    #ifndef USE_INSTANCING
      vec3 passNormalWorld=(modelMatrix*vec4(position,1.)).xyz;
      float passSlopeX=(secretPassLift(passNormalWorld+vec3(.025,0.,0.))-secretPassLift(passNormalWorld-vec3(.025,0.,0.)))/.05;
      float passSlopeZ=(secretPassLift(passNormalWorld+vec3(0.,0.,.025))-secretPassLift(passNormalWorld-vec3(0.,0.,.025)))/.05;
      transformedNormal=normalize(transformedNormal+mat3(viewMatrix)*vec3(-passSlopeX,0.,-passSlopeZ));
    #endif
  `);
  shader.fragmentShader='uniform vec3 secretPassCentre;uniform float secretPassAge;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float passAge=secretPassAge;
    vec2 passDelta=grassWorld.xz-secretPassCentre.xz;
    float passDistance=length(passDelta);
    float passAngle=atan(passDelta.y,passDelta.x+.00001);
    float passHeight=1.-smoothstep(.35,1.3,abs(grassWorld.y-secretPassCentre.y));
    float passFade=smoothstep(0.,.055,passAge)*(1.-smoothstep(.22,.72,passAge));
    float passHalo=exp(-passDistance*passDistance);
    float passWarp=1.+sin(passAngle*3.+passAge*1.7)*.07+sin(passAngle*5.-passAge*1.2+.8)*.04;
    float passRing=exp(-pow((passDistance-(.18+passAge*2.8)*passWarp)/.16,2.));
    float passColourHeight=smoothstep(-.40,.20,grassWorld.y-secretPassCentre.y);
    vec3 passTint=mix(vec3(.70,.53,.14),vec3(.30,.64,.16),passColourHeight);
    totalEmissiveRadiance+=passTint*(passHalo*.9+passRing*.45)*.67*passFade*passHeight*(1.-smoothstep(.15,.5,grassDepth));
  `);
}
