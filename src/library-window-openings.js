import {FLOORS} from './floor-config.js';
import {route} from './game.js';
import {wallBayCenter,windowSteps} from './wall-layout.js';

export function libraryWindowOpenings(){return FLOORS.flatMap(floor=>windowSteps(floor).map(({item,section})=>{
  const p=route(section),angle=wallBayCenter(item.angleDegrees===undefined?p.theta:item.angleDegrees*Math.PI/180);
  return {angle,y:p.y+(item.heightAboveShelf??floor.windows.heightAboveShelf??4),width:(item.width??floor.windows.width??2.3)+.24,height:(item.height??floor.windows.height??5.8)+.24};
}));}

export function clipLibraryWindows(material,openings){
  if(!openings.length)return material;
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,...args){
    previous.call(this,shader,...args);
    shader.vertexShader='varying vec3 libraryLocalPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 libraryPoint=vec4(position,1.);
      #ifdef USE_INSTANCING
      libraryPoint=instanceMatrix*libraryPoint;
      #endif
      libraryLocalPosition=libraryPoint.xyz;`);
    const cuts=openings.map(o=>{
      const c=Math.cos(o.angle).toFixed(8),s=Math.sin(o.angle).toFixed(8);
      return `if(abs(libraryLocalPosition.y-${o.y.toFixed(6)})<${(o.height/2).toFixed(6)} && abs(dot(libraryLocalPosition.xz,vec2(-(${s}),${c})))<${(o.width/2).toFixed(6)} && dot(libraryLocalPosition.xz,vec2(${c},${s}))>15.)discard;`;
    }).join('\n');
    shader.fragmentShader='varying vec3 libraryLocalPosition;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+cuts);
  };
  material.customProgramCacheKey=()=>key+'-library-openings-'+JSON.stringify(openings);return material;
}
