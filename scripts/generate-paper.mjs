import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../src/torn-paper.svg',import.meta.url);
const hash=(x,y)=>{let h=Math.imul(x+17,374761393)^Math.imul(y+71,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);const mix=(a,b,t)=>a+(b-a)*t;return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}
let tiles='<g shape-rendering="crispEdges" mask="url(#texture-interior)">';
for(let y=0;y<180;y+=4.5)for(let x=0;x<500;x+=4.5){
  const stain=Math.max(0,noise(x/85,y/65)-.37)*.85;
  const grain=(noise(x/18,y/12)-.5)*.09+(hash(x,y)-.5)*.035;
  const shade=Math.max(0,Math.min(.55,stain+grain+y/180*.07));
  const rgb=[231,205,160].map((v,i)=>v+([145,101,53][i]-v)*shade);
  const luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  const color=rgb.map(v=>Math.round(luminance+(v-luminance)*.48).toString(16).padStart(2,'0')).join('');
  tiles+=`<path fill="#${color}" d="M${x} ${y}h4.5v4.5h-4.5z"/>`;
}
tiles+='</g>';
let svg=readFileSync(file,'utf8').replace(/<!-- pixel-paper:start -->[\s\S]*?<!-- pixel-paper:end -->/,`<!-- pixel-paper:start -->${tiles}<!-- pixel-paper:end -->`);
// Fine torn fibres with only a subtle stepped raster silhouette.
const tear=(t,side)=>Math.round((4+noise(t/19,side)*5+hash(t,side)*3+(hash(t,side+9)>.975?7:0))/2.25)*2.25;
let outline='M9 9';
for(let x=9;x<=492;x+=4.5){outline+=`L${x} ${tear(x,2)}`;}
for(let y=9;y<=171;y+=4.5){outline+=`L${500-tear(y,3)} ${y}`;}
for(let x=492;x>=9;x-=4.5){outline+=`L${x} ${180-tear(x,4)}`;}
for(let y=171;y>=9;y-=4.5){outline+=`L${tear(y,5)} ${y}`;}
outline+='Z';
svg=svg.replace(/(<path id="paper-outline" d=")[^"]*/,`$1${outline}`);
svg=svg.replace('<g filter="url(#eat-edge)"><g clip-path="url(#edge)">','<g><g clip-path="url(#edge)" shape-rendering="crispEdges">');
svg=svg.replace('stroke-width="19" opacity=".66"','stroke-width="9" opacity=".23"').replace('stroke-width="7" opacity=".85"','stroke-width="2" opacity=".18"');
svg=svg.replace('stroke-width="24"','stroke-width="6"');
writeFileSync(file,svg);
