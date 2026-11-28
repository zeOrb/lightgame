import * as THREE from 'three';
import {FLOORS} from './floor-config.js';
import {route} from './game.js';
import {wallBayCenter,windowSteps} from './wall-layout.js';

export function libraryWindowOpenings(){return FLOORS.flatMap(floor=>windowSteps(floor).map(({item,section})=>{
  const p=route(section),angle=wallBayCenter(item.angleDegrees===undefined?p.theta:item.angleDegrees*Math.PI/180);
  return {angle,y:p.y+(item.heightAboveShelf??floor.windows.heightAboveShelf??4),width:(item.width??floor.windows.width??2.3)+.24,height:(item.height??floor.windows.height??5.8)+.24};
}));}

// Window positions are uniforms: new seeds reuse the compiled library shader.
export function clipLibraryWindows(material,openings){
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey(),capacity=Math.max(16,2**Math.ceil(Math.log2(Math.max(1,openings.length))));
  const planes={value:[]},sizes={value:[]},count={value:0};
  material.userData.setLibraryOpenings=items=>{
    if(items.length>capacity)throw Error('Library opening capacity exceeded');
    count.value=items.length;planes.value=Array.from({length:capacity},(_,i)=>{const o=items[i];return o?new THREE.Vector4(Math.cos(o.angle),Math.sin(o.angle),o.y,o.height/2):new THREE.Vector4();});
    sizes.value=Array.from({length:capacity},(_,i)=>new THREE.Vector2(items[i]?.width/2??0,0));
  };
  material.userData.setLibraryOpenings(openings);
  material.onBeforeCompile=function(shader,...args){
    previous.call(this,shader,...args);shader.uniforms.libraryOpeningCount=count;shader.uniforms.libraryOpenings=planes;shader.uniforms.libraryOpeningSizes=sizes;
    shader.vertexShader='varying vec3 libraryLocalPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 libraryPoint=vec4(position,1.);
      #ifdef USE_INSTANCING
      libraryPoint=instanceMatrix*libraryPoint;
      #endif
      libraryLocalPosition=libraryPoint.xyz;`);
    shader.fragmentShader=`varying vec3 libraryLocalPosition;uniform int libraryOpeningCount;uniform vec4 libraryOpenings[${capacity}];uniform vec2 libraryOpeningSizes[${capacity}];\n`+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      for(int i=0;i<${capacity};i++){
        if(i>=libraryOpeningCount)break;vec4 o=libraryOpenings[i];
        if(abs(libraryLocalPosition.y-o.z)<o.w && abs(dot(libraryLocalPosition.xz,vec2(-o.y,o.x)))<libraryOpeningSizes[i].x && dot(libraryLocalPosition.xz,o.xy)>15.)discard;
      }`);
  };
  material.customProgramCacheKey=()=>key+'-library-openings-uniform-v2-'+capacity;return material;
}
