// Color the architecture by world height and by how far below the camera it is.
export function applyTowerDepth(material){
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying float towerWorldHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 towerWorld=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        towerWorld=instanceMatrix*towerWorld;
      #endif
      towerWorldHeight=(modelMatrix*towerWorld).y;`);
    shader.fragmentShader='varying float towerWorldHeight;\n'+shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
      float towerDepth=max((1.0-smoothstep(20.0,104.0,towerWorldHeight))*.85,smoothstep(9.0,34.0,cameraPosition.y-towerWorldHeight)*.94);
      float towerLuma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
      vec3 towerNavy=vec3(.012,.027,.065)+vec3(.035,.09,.21)*towerLuma;
      gl_FragColor.rgb=mix(gl_FragColor.rgb,towerNavy,towerDepth)*(1.0-towerDepth*.18);`);
  };
  material.customProgramCacheKey=()=> 'tower-height-blue-v1';
  return material;
}
