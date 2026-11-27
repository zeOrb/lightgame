import {RandomManager} from './random-manager.js';

const SVG='http://www.w3.org/2000/svg';
let nextId=0;
function node(name,attributes){const element=document.createElementNS(SVG,name);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));return element;}

// The gradient moves through the leaf itself. Its blurred SourceGraphic supplies
// the matching halo; the underlying neutral artwork is never replaced.
export function addLeafGlint(svg,host,shape,direction='up',palette='rainbow'){
  const id=`ui-leaf-glint-${nextId++}`,horizontal=direction==='left'||direction==='right';
  const forward=direction==='up'||direction==='left';
  const from=forward?1.35:-.35,to=forward?-.35:1.35;
  const point=value=>horizontal?`${value} 0`:`0 ${value}`;
  const defs=svg.querySelector('defs');
  const gradient=node('linearGradient',{id:id+'-color',x1:horizontal?'-.24':'0',y1:horizontal?'0':'-.24',x2:horizontal?'.24':'0',y2:horizontal?'0':'.24'});
  const colors=palette==='rarity'
    ?[[0,'currentColor',0],[.18,'currentColor',.9],[.36,'color-mix(in srgb,currentColor 70%,white)',1],[.51,'color-mix(in srgb,currentColor 35%,white)',1],[.65,'color-mix(in srgb,currentColor 65%,white)',1],[.81,'currentColor',.95],[1,'currentColor',0]]
    :[[0,'#7ae4cf',0],[.18,'#7ae4cf',.9],[.36,'#96baff',1],[.51,'#fff5e1',1],[.65,'#d3a2f3',1],[.81,'#ffc5d9',.95],[1,'#ffe7a4',0]];
  for(const [offset,color,alpha] of colors)gradient.append(node('stop',{offset,'stop-color':color,'stop-opacity':alpha}));
  const period=5.5+RandomManager.graphics()*4.5;
  gradient.append(node('animateTransform',{attributeName:'gradientTransform',type:'translate',values:`${point(from)};${point(from)};${point(to)};${point(to)}`,keyTimes:'0;.68;.88;1',dur:`${period}s`,begin:`${-RandomManager.graphics()*period}s`,repeatCount:'indefinite'}));
  const glow=node('filter',{id:id+'-glow',x:'-150%',y:'-100%',width:'400%',height:'300%','color-interpolation-filters':'sRGB'});
  glow.append(node('feGaussianBlur',{in:'SourceGraphic',stdDeviation:3.2,result:'wide'}));
  const soften=node('feComponentTransfer',{in:'wide',result:'soft'});soften.append(node('feFuncA',{type:'linear',slope:.5}));glow.append(soften,node('feGaussianBlur',{in:'SourceGraphic',stdDeviation:1.1,result:'close'}));
  const merge=node('feMerge',{});merge.append(node('feMergeNode',{in:'soft'}),node('feMergeNode',{in:'close'}),node('feMergeNode',{in:'SourceGraphic'}));glow.append(merge);defs.append(gradient,glow);
  const overlay=node('path',{d:shape.getAttribute('d'),class:'ui-leaf-glint',fill:`url(#${id}-color)`,'fill-opacity':1,stroke:`url(#${id}-color)`,'stroke-width':'.8','stroke-opacity':1,filter:`url(#${id}-glow)`,opacity:'.95'});
  host.append(overlay);return overlay;
}

export function createGlintOrnament(source,direction='up'){
  const svg=document.importNode(new DOMParser().parseFromString(source,'image/svg+xml').documentElement,true),prefix=`ui-ornament-${nextId++}-`,ids=new Map();
  for(const element of svg.querySelectorAll('[id]')){ids.set(element.id,prefix+element.id);element.id=prefix+element.id;}
  for(const element of svg.querySelectorAll('*'))for(const attribute of [...element.attributes]){
    if(attribute.value.includes('url(#'))element.setAttribute(attribute.name,attribute.value.replace(/url\(#([^)]*)\)/g,(_,id)=>`url(#${ids.get(id)??id})`));
  }
  const leaves=[...svg.querySelectorAll('path')].filter(shape=>{
    const fill=shape.getAttribute('fill')??shape.parentElement.getAttribute('fill')??'';
    return fill.includes('glass')||fill==='#81718c'||fill==='#648d83';
  });
  for(const leaf of leaves)addLeafGlint(svg,leaf.parentElement,leaf,direction);
  svg.classList.add('run-item-frame-art');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');return svg;
}
