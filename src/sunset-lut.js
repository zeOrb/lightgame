import * as THREE from 'three';

// Display-referred palette: cream highlights, copper mids and violet-blue shade.
export const SUNSET_LUT_STYLE=Object.freeze({size:32,strength:.72});
export function sunsetGrade(r,g,b){
  const luma=r*.2126+g*.7152+b*.0722;
  const shadow=(1-THREE.MathUtils.smoothstep(luma,.08,.58))*THREE.MathUtils.smoothstep(luma,0,.10);
  const light=THREE.MathUtils.smoothstep(luma,.38,.95);
  const mid=Math.sin(Math.PI*luma);
  const saturation=1.08;
  const color=[r,g,b].map(c=>luma+(c-luma)*saturation);
  // Multiplicative shadow tint keeps absolute black black, especially on arenas.
  color[0]=color[0]*(1-shadow*.08)+mid*.024+light*.025;
  color[1]=color[1]*(1-shadow*.035)+light*.014;
  color[2]=color[2]*(1+shadow*.12)-mid*.008-light*.025;
  return color.map(c=>THREE.MathUtils.clamp((c-.5)*1.055+.5,0,1));
}
export function createSunsetLUT(){
  const size=SUNSET_LUT_STYLE.size,data=new Uint8Array(size*size*size*4);
  for(let b=0;b<size;b++)for(let g=0;g<size;g++)for(let r=0;r<size;r++){
    const color=sunsetGrade(r/(size-1),g/(size-1),b/(size-1));
    const i=(g*size*size+b*size+r)*4;
    for(let c=0;c<3;c++)data[i+c]=Math.round(color[c]*255);
    data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size*size,size,THREE.RGBAFormat);
  texture.minFilter=texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=false;texture.needsUpdate=true;
  return texture;
}
export const SUNSET_LUT_GLSL=`
uniform sampler2D sunsetLUT;
uniform float sunsetLUTStrength;
vec3 applySunsetLUT(vec3 color){
  const float size=32.;
  vec3 p=clamp(color,0.,1.)*(size-1.);
  float slice=floor(p.b),nextSlice=min(slice+1.,size-1.);
  vec2 first=vec2((slice*size+p.r+.5)/(size*size),(p.g+.5)/size);
  vec2 second=vec2((nextSlice*size+p.r+.5)/(size*size),(p.g+.5)/size);
  vec3 graded=mix(texture2D(sunsetLUT,first).rgb,texture2D(sunsetLUT,second).rgb,fract(p.b));
  return mix(color,graded,sunsetLUTStrength);
}`;
