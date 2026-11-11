import {createVisualRandom} from './visual-random.js';

// Integer rectangles and independent SVG twinkles need no JavaScript render loop.
export function createSkillStarfield(){
  const random=createVisualRandom('skill-tree-night-sky'),layers=[[],[]];
  let pixels=[];
  const rect=(x,y,w,h,opacity=1)=>pixels.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" opacity="${opacity}"/>`);
  for(let row=0;row<10;row++)for(let col=0;col<10;col++){
    if(random()<.22)continue;
    pixels=[];
    const x=8+col*38+Math.floor(random()*23),y=8+row*38+Math.floor(random()*23),kind=random();
    if(kind<.77){rect(x,y,1,random()<.15?2:1,.7+random()*.3);}
    else{
      const arm=kind>.96?5:kind>.87?3:2;
      rect(x-arm,y,arm*2+1,1,.85);rect(x,y-arm,1,arm*2+1,.85);
      if(arm>=3){rect(x-1,y-1,3,3);rect(x-2,y-2,1,1,.5);rect(x+2,y+2,1,1,.5);}
    }
    const dim=(.35+random()*.18).toFixed(2),duration=(6+random()*12).toFixed(2),phase=(random()*18).toFixed(2);
    const pulse=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'':`<animate attributeName="opacity" values="${dim};${dim};1;${dim};${dim}" keyTimes="0;0.74;0.79;0.86;1" dur="${duration}s" begin="-${phase}s" repeatCount="indefinite"/>`;
    layers[kind<.77?1:0].push(`<g opacity="${dim}">${pulse}${pixels.join('')}</g>`);
  }
  return layers.map(stars=>{
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 384 384" shape-rendering="crispEdges"><g fill="white">${stars.join('')}</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  });
}
