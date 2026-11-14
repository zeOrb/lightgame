import * as THREE from 'three';

export function applyWoodPOM(material,depth=.16){
  const heightMap=material.map?.userData.heightMap;
  if(!heightMap)return material;
  const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,...args){
    previous.call(this,shader,...args);
    shader.uniforms.woodHeight={value:heightMap};shader.uniforms.woodDepth={value:depth};
    shader.vertexShader='varying vec3 woodViewPosition;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nwoodViewPosition=mvPosition.xyz;');
    shader.fragmentShader=`varying vec3 woodViewPosition;
      vec2 woodShiftedUV;
      uniform sampler2D woodHeight;
      uniform float woodDepth;
      vec2 woodParallax(vec2 uv){
        vec3 px=dFdx(woodViewPosition),py=dFdy(woodViewPosition);
        vec2 ux=dFdx(uv),uy=dFdy(uv);
        float det=ux.x*uy.y-ux.y*uy.x;
        if(abs(det)<1.e-10)return uv;
        vec3 tangent=(px*uy.y-py*ux.y)/det;
        vec3 bitangent=(-px*uy.x+py*ux.x)/det;
        float tu=length(tangent),tv=length(bitangent);
        vec3 normal=normalize(cross(px,py)),view=normalize(-woodViewPosition);
        float facing=abs(dot(normal,view));
        vec2 ray=vec2(dot(view,tangent/max(tu,1.e-5))/max(tu,1.e-5),dot(view,bitangent/max(tv,1.e-5))/max(tv,1.e-5));
        ray*=woodDepth/max(facing,.22);
        // Preserve each atlas tile; grazing rays must not sample another panel.
        vec2 tile=floor(clamp(uv,0.,.99999)*4.)/4.;
        vec2 lo=tile+vec2(.0005),hi=tile+vec2(.2495);
        float layers=mix(24.,12.,facing),stepDepth=1./layers;
        vec2 delta=ray/layers,current=uv,previousUV=uv;
        float traveled=0.,surface=1.-texture2D(woodHeight,current).r,previousSurface=surface;
        for(int i=0;i<24;i++){
          if(traveled>=surface)break;
          previousUV=current;previousSurface=surface;
          current=clamp(current-delta,lo,hi);traveled+=stepDepth;
          surface=1.-texture2D(woodHeight,current).r;
        }
        float after=surface-traveled,before=previousSurface-(traveled-stepDepth);
        float weight=clamp(after/(after-before-1.e-5),0.,1.);
        return mix(current,previousUV,weight);
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
      'woodShiftedUV=woodParallax(vMapUv);\n'+THREE.ShaderChunk.map_fragment.replaceAll('vMapUv','woodShiftedUV')+'\n diffuseColor.rgb*=mix(.73,1.,smoothstep(.08,.76,texture2D(woodHeight,woodShiftedUV).r));');
    // Bump lighting follows the displaced grain instead of sliding over it.
    shader.fragmentShader=shader.fragmentShader.replace('#include <bumpmap_pars_fragment>',THREE.ShaderChunk.bumpmap_pars_fragment.replaceAll('vBumpMapUv','woodShiftedUV'));
  };
  material.customProgramCacheKey=()=>cacheKey+'-wood-pom-v2';
  return material;
}
