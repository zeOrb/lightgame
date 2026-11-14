import * as THREE from 'three';
import {createVisualRandom,visualSample} from './visual-random.js';
export function createOldWoodAtlas(){
  const random=createVisualRandom('old-oak-atlas'),w=512,h=256;
  const canvas=document.createElement('canvas');canvas.width=w*4;canvas.height=h*4;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height);
  const heightData=new Uint8Array(canvas.width*canvas.height*4);
  for(let variant=0;variant<16;variant++){
    const cuts=[0,52+random()*15,115+random()*15,180+random()*17,h];
    const boards=Array.from({length:4},()=>({phase:random()*200,kx:random()*w,ky:random()*60,tint:new THREE.Color().setHSL(.075+(random()-.5)*.025,.16+random()*.05,.83)}));
    for(let y=0;y<h;y++){
      const boardIndex=cuts.findIndex((v,i)=>i<4&&y>=v&&y<cuts[i+1]),b=boards[boardIndex],local=y-cuts[boardIndex];
      for(let x=0;x<w;x++){
        const dx=(x-b.kx)*.15,dy=(local-b.ky)*1.7;
        const knot=Math.exp(-(dx*dx+dy*dy)/210);
        const flow=local+Math.sin(x*.012+b.phase)*2.2+Math.sin(x*.034+b.phase)*.5+knot*dy*.7;
        // Broad, sparse grain instead of dense high-frequency stripes.
        const line=Math.sin(flow*.48+Math.sin(x*.009+b.phase)*.65);
        const groove=Math.pow(.5+.5*line,9);
        const broad=Math.sin(flow*.16+Math.sin(x*.01)*1.2+b.phase)*.035;
        const seamWidth=2.4+Math.sin(x*.017+b.phase)*.45;
        const seam=local<seamWidth;
        const edge=Math.min(local,cuts[boardIndex+1]-y);
        const tone=THREE.MathUtils.clamp(.65-groove*.19+broad-knot*.045+(edge<5?.025:0),0,1);
        const i=((Math.floor(variant/4)*h+y)*canvas.width+(variant%4)*w+x)*4;
        const red=(seam?69:91+tone*84)*b.tint.r,green=(seam?48:61+tone*73)*b.tint.g,blue=(seam?33:41+tone*57)*b.tint.b;
        const neutral=red*.2126+green*.7152+blue*.0722;
        image.data[i]=red*.78+neutral*.22;
        image.data[i+1]=green*.78+neutral*.22;
        image.data[i+2]=blue*.78+neutral*.22;
        image.data[i+3]=255;
        // Flat board crowns with deep, rounded grain channels and recessed seams.
        const seamRise=THREE.MathUtils.smoothstep(local,seamWidth,seamWidth+2.5);
        const relief=seam?.025:THREE.MathUtils.clamp((.91-groove*.64-knot*.12)*seamRise,.025,.95);
        heightData[i]=heightData[i+1]=heightData[i+2]=Math.round(relief*255);heightData[i+3]=255;
      }
    }
  }
  ctx.putImageData(image,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const heightMap=new THREE.DataTexture(heightData,canvas.width,canvas.height);
  // CanvasTexture uploads flipped; DataTexture does not, so match their UVs.
  heightMap.flipY=true;heightMap.minFilter=THREE.LinearMipmapLinearFilter;heightMap.magFilter=THREE.LinearFilter;
  heightMap.generateMipmaps=true;heightMap.anisotropy=4;heightMap.needsUpdate=true;
  texture.userData.heightMap=heightMap;
  return texture;
}
export function mapWoodPanel(geometry,section,inner,outer,angle){
  const variant=Math.floor(visualSample('wood-panel-atlas',section)*16),flip=visualSample('wood-panel-flip',section)>.5;
  const position=geometry.attributes.position,uv=geometry.attributes.uv,colors=[];
  const tint=new THREE.Color().setHSL(.09+(visualSample('wood-panel-hue',section)-.5)*.045,.1,.94);
  for(let i=0;i<position.count;i++){
    let u=THREE.MathUtils.clamp((position.getX(i)-inner)/(outer-inner),0,1);
    const v=THREE.MathUtils.clamp(.5+position.getZ(i)/(2*outer*Math.sin(angle)),0,1);
    if(flip)u=1-u;
    uv.setXY(i,((variant%4)+.003+u*.994)/4,(Math.floor(variant/4)+.003+v*.994)/4);
    colors.push(tint.r,tint.g,tint.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));uv.needsUpdate=true;
}
