import * as THREE from 'three';

export function bestiaryFog(scene){
  // Camera-space depth, not radial distance: the foreground remains clear.
  scene.fog=new THREE.Fog('#262a35',11.8,27);
  const time={value:0},seen=new Set();
  scene.traverse(object=>{
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(!material||!material.fog||seen.has(material))continue;seen.add(material);
      const compile=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
      const previousKey=key();
      material.onBeforeCompile=shader=>{
        compile.call(material,shader);shader.uniforms.bestiaryFogTime=time;
        shader.vertexShader='varying vec3 vGalleryWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGalleryWorld=(modelMatrix*vec4(position,1.)).xyz;');
        shader.fragmentShader=`varying vec3 vGalleryWorld;uniform float bestiaryFogTime;
          float galleryHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
          float galleryNoise(vec3 p){vec3 a=floor(p),b=fract(p);b=b*b*(3.-2.*b);return mix(mix(mix(galleryHash(a),galleryHash(a+vec3(1,0,0)),b.x),mix(galleryHash(a+vec3(0,1,0)),galleryHash(a+vec3(1,1,0)),b.x),b.y),mix(mix(galleryHash(a+vec3(0,0,1)),galleryHash(a+vec3(1,0,1)),b.x),mix(galleryHash(a+vec3(0,1,1)),galleryHash(a+vec3(1,1,1)),b.x),b.y),b.z);}
        `+shader.fragmentShader.replace('#include <fog_fragment>',`
          #ifdef USE_FOG
            vec3 q=vGalleryWorld*vec3(.25,.42,.22)+vec3(bestiaryFogTime*.022,0.,bestiaryFogTime*.013);
            float clouds=galleryNoise(q)*.7+galleryNoise(q*2.2)*.3;
            float depthMask=smoothstep(fogNear,fogFar,vFogDepth);
            float density=depthMask*(.5+clouds*.8);
            gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,clamp(density,0.,.85));
          #endif
        `);
      };
      material.customProgramCacheKey=()=>previousKey+'-gallery-depth-fog-v1';material.needsUpdate=true;
    }
  });
  return {update(dt){time.value+=dt;}};
}
