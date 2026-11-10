import * as THREE from 'three';
import { createVisualRandom } from './visual-random.js';
const random=createVisualRandom('glass');

export function glassLayout(width,height){
  return {width:Math.round(width*192),height:Math.round(height*192),columns:Math.max(1,Math.round(width/.5)),rows:Math.max(1,Math.round(height/.5))};
}

export function createGlassTextures(){
  const palette=['#f52c9e','#7244ff','#22bfff','#35e5ad','#ffcf38','#f54b42'];
  for(let i=palette.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[palette[i],palette[j]]=[palette[j],palette[i]];}
  const makeMosaics=(width,height)=>Array.from({length:4},(_,variant)=>{
    const layout=glassLayout(width,height),canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#101224';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<layout.rows;y++)for(let x=0;x<layout.columns;x++){
      const w=(canvas.width-10)/layout.columns,h=(canvas.height-10)/layout.rows;
      const left=5+x*w,top=5+y*h,cx=left+w/2,cy=top+h/2;
      const corners=[[left,top],[left+w,top],[left+w,top+h],[left,top+h]];
      for(let t=0;t<4;t++){
        const a=corners[t],b=corners[(t+1)%4];ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(...a);ctx.lineTo(...b);ctx.closePath();
        ctx.fillStyle=palette[(x*3+y*2+t+variant)%palette.length];ctx.fill();ctx.strokeStyle='#171329';ctx.lineWidth=1.5;ctx.stroke();
      }
    }
    ctx.strokeStyle='#b38b55';ctx.lineWidth=3;ctx.strokeRect(2,2,canvas.width-4,canvas.height-4);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
  });
  const mosaics=makeMosaics(1.02,1.63),wideMosaics=makeMosaics(1.95,1.25);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,b=a+Math.PI/6,m=(a+b)/2;
    ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(128+Math.cos(a)*112,128+Math.sin(a)*112);ctx.lineTo(128+Math.cos(m)*77,128+Math.sin(m)*77);ctx.lineTo(128+Math.cos(b)*112,128+Math.sin(b)*112);ctx.closePath();ctx.fillStyle=palette[i%6];ctx.fill();ctx.strokeStyle='#151325';ctx.lineWidth=5;ctx.stroke();
  }
  ctx.beginPath();ctx.arc(128,128,19,0,Math.PI*2);ctx.fillStyle='#fff3a6';ctx.fill();
  const rose=new THREE.CanvasTexture(canvas);rose.colorSpace=THREE.SRGBColorSpace;
  return {mosaics,wideMosaics,rose,palette};
}
