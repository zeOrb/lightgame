// Draw on a fixed pixel grid with a small palette, rather than downsampling
// antialiased curves. Diagonal flames are deliberately shorter.
export const SUN_PALETTE=['#00000000','#211b16','#78552d','#c89d56','#f0cf8c','#fff0bc','#a47a3d'];
export const SUN_GRID=81;
export const SUN_PIXEL=2.5;
export const SUN_SPRITE_GRID=SUN_GRID+8;
function inside(x,y,points){
  let hit=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
export function sunPixels(rotation=0,size=1){
  const pixels=new Uint8Array(SUN_GRID*SUN_GRID),flames=new Uint8Array(pixels.length);
  const outline=[[35,-10],[49,-15],[62,-11],[76,-16],[94,-27],[84,-8],[79,4],[65,14],[51,14],[38,9]];
  const cut=[[43,0],[54,-6],[66,-3],[80,-15],[71,-1],[59,5],[49,5]];
  for(let y=0;y<SUN_GRID;y++)for(let x=0;x<SUN_GRID;x++){
    const wx=(x-40)*SUN_PIXEL/size,wy=(y-40)*SUN_PIXEL/size,index=y*SUN_GRID+x;
    for(let ray=0;ray<8;ray++){
      const angle=ray*Math.PI/4-Math.PI/2+rotation,scale=ray%2?.8:ray%4===0?.88:1;
      const u=35+(((wx*Math.cos(angle)+wy*Math.sin(angle))/scale)-35)*2,v=(-wx*Math.sin(angle)+wy*Math.cos(angle))/scale*2;
      if(inside(u,v,outline)){flames[index]=inside(u,v,cut)?4:2;break;}
    }
  }
  for(let y=0;y<SUN_GRID;y++)for(let x=0;x<SUN_GRID;x++){
    const i=y*SUN_GRID+x,wx=(x-40)*SUN_PIXEL/size,wy=(y-40)*SUN_PIXEL/size,d=Math.abs(wx)+Math.abs(wy);
    if(flames[i])pixels[i]=[i-1,i+1,i-SUN_GRID,i+SUN_GRID].some(n=>!flames[n])?3:flames[i];
    if(d<=45)pixels[i]=1;
    if(d<=40)pixels[i]=4;
    if(d<=35)pixels[i]=2;
    if(d<=30)pixels[i]=4;
    if(d<=25)pixels[i]=wx>=0?(wy<0?4:3):(wy<0?3:6);
    if(d<=10)pixels[i]=5;
    if((wx===0&&Math.abs(wy)===35)||(wy===0&&Math.abs(wx)===35))pixels[i]=5;
  }
  return pixels;
}
export function createPixelSun(rotation=0,dormant=false){
  const palette=dormant?['#00000000','#281317','#65252b','#ad3b35','#df6548','#ffad75','#85302e']:SUN_PALETTE;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=SUN_SPRITE_GRID;
  const ctx=canvas.getContext('2d'),pixels=sunPixels(rotation,dormant?.55:1);
  // Quantised halo: whole golden pixel cells, never a blurred CSS shadow.
  for(let y=-4;y<SUN_GRID+4;y++)for(let x=-4;x<SUN_GRID+4;x++){
    if(x>=0&&x<SUN_GRID&&y>=0&&y<SUN_GRID&&pixels[y*SUN_GRID+x])continue;
    let distance=5;
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const d=Math.abs(dx)+Math.abs(dy),nx=x+dx,ny=y+dy;
      if(d<distance&&nx>=0&&nx<SUN_GRID&&ny>=0&&ny<SUN_GRID&&pixels[ny*SUN_GRID+nx])distance=d;
    }
    if(distance>3)continue;
    const shimmer=.82+.18*Math.sin(rotation*3+x*.6-y*.4);
    ctx.fillStyle=`rgba(${dormant?'226,64,42':'255,195,67'},${[0,.4,.2,.08][distance]*shimmer})`;
    ctx.fillRect(x+4,y+4,1,1);
  }
  pixels.forEach((color,i)=>{if(color){
    const x=i%SUN_GRID,y=Math.floor(i/SUN_GRID);
    const radius=Math.hypot(x-40,y-40)*SUN_PIXEL;
    const glint=!dormant&&color>=3&&radius<42&&Math.sin(Math.atan2(y-40,x-40)*2-rotation*3)>.93;
    ctx.fillStyle=glint?'#fff6cf':palette[color];ctx.fillRect(x+4,y+4,1,1);
    if(!dormant&&color>=3){const white=Math.pow(Math.max(0,1-radius/48),2)*.8;ctx.fillStyle=`rgba(255,255,247,${white})`;ctx.fillRect(x+4,y+4,1,1);}
  }});
  return canvas;
}
