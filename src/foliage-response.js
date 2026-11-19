import * as THREE from 'three';
export const VINE_RESPONSE_REACH=3;

// One shared position and velocity; every blade evaluates its response on GPU.
const playerPosition={value:new THREE.Vector3(1e6,1e6,1e6)};
const playerVector={value:new THREE.Vector3()};
const vinePosition={value:new THREE.Vector3(1e6,1e6,1e6)};
const vineVector={value:new THREE.Vector3()};
export function updateFoliagePlayer(position,dt,active=true){
  if(!active||dt<=0||playerPosition.value.distanceToSquared(position)>100){playerVector.value.set(0,0,0);vineVector.value.set(0,0,0);vinePosition.value.copy(position);}
  else{
    const vx=(position.x-playerPosition.value.x)/dt,vy=(position.y-playerPosition.value.y)/dt,vz=(position.z-playerPosition.value.z)/dt;
    const blend=1-Math.exp(-dt*12);
    const limit=Math.min(1,24/Math.max(.001,Math.hypot(vx,vy,vz))),v=playerVector.value;
    v.set(v.x+(vx*limit-v.x)*blend,v.y+(vy*limit-v.y)*blend,v.z+(vz*limit-v.z)*blend);
    vineVector.value.lerp(v,1-Math.exp(-dt*2.8));
    vinePosition.value.lerp(position,1-Math.exp(-dt*6));
  }
  playerPosition.value.copy(position);
  return playerVector.value;
}
export function applyFoliageResponse(shader,weight,reach,strength,strand=false){
  shader.uniforms.foliagePlayerPosition=strand?vinePosition:playerPosition;shader.uniforms.foliagePlayerVector=strand?vineVector:playerVector;
  shader.vertexShader='uniform vec3 foliagePlayerPosition;uniform vec3 foliagePlayerVector;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    mat4 foliageMatrix=modelMatrix*instanceMatrix;
    vec3 foliageWorld=(foliageMatrix*vec4(transformed,1.)).xyz;
    ${strand?`vec3 strandRoot=foliageMatrix[3].xyz;
    // Test the hanging strand as a vertical capsule; bend the whole strand.
    foliageWorld=strandRoot;
    foliageWorld.y=clamp(foliagePlayerPosition.y,strandRoot.y-length(foliageMatrix[1].xyz)*3.3,strandRoot.y);`:''}
    vec3 foliageDelta=foliageWorld-foliagePlayerPosition;
    float foliageSpeed=length(foliagePlayerVector.xz);
    vec2 foliageDirection=foliagePlayerVector.xz/max(.001,foliageSpeed);
    ${strand?`float wakeBehind=clamp(-dot(foliageDelta.xz,foliageDirection),0.,min(5.,foliageSpeed*.32));
    foliageDelta.xz+=foliageDirection*wakeBehind;`:''}
    float foliageBehind=clamp(-dot(foliageDelta.xz,foliageDirection),0.,1.);
    float foliageDistance=length(foliageDelta*vec3(1.,.7,1.));
    float foliageInfluence=1.-smoothstep(.18,${reach.toFixed(3)}+foliageBehind*.45,foliageDistance);
    vec2 foliagePush=foliageDelta.xz/max(.15,length(foliageDelta.xz))*.35+foliageDirection*min(foliageSpeed*.12,1.);
    ${strand?`// Fast passes whip the hanging tip further, especially during dash.
    float strandForce=1.+smoothstep(2.,7.,foliageSpeed)*.7+smoothstep(8.,19.,foliageSpeed)*1.4;
    foliagePush*=strandForce;`:''}
    ${strand?`float sway=sin(vineTime*3.4+strandRoot.x*.31+strandRoot.z*.47);
    foliagePush+=vec2(-foliageDirection.y,foliageDirection.x)*sway*min(.40,foliageSpeed*.045);`:''}
    vec3 foliageOffset=vec3(foliagePush.x,-.10*min(foliageSpeed*.1,1.),foliagePush.y)*foliageInfluence*${strength.toFixed(3)}*(${weight});
    ${strand?`// Raise the tip along its bend arc instead of stretching it down.
    float strandT=clamp(uv.y,0.,1.);
    float strandWorldLength=max(.25,length(foliageMatrix[1].xyz)*(-position.y/max(.001,strandT)));
    float strandArcLength=strandWorldLength*strandT;
    float strandShift=length(foliageOffset.xz);
    foliageOffset.xz*=min(1.,strandArcLength*.82/max(.001,strandShift));
    foliageOffset.y=strandArcLength-sqrt(max(0.,strandArcLength*strandArcLength-dot(foliageOffset.xz,foliageOffset.xz)));`:''}
    transformed+=vec3(dot(foliageMatrix[0].xyz,foliageOffset)/max(.001,dot(foliageMatrix[0].xyz,foliageMatrix[0].xyz)),dot(foliageMatrix[1].xyz,foliageOffset)/max(.001,dot(foliageMatrix[1].xyz,foliageMatrix[1].xyz)),dot(foliageMatrix[2].xyz,foliageOffset)/max(.001,dot(foliageMatrix[2].xyz,foliageMatrix[2].xyz)));
    #include <project_vertex>
  `);
}
