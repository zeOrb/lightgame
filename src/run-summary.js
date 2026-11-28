import {renderItemTooltip} from './item-tooltip.js';
import {RandomManager} from './random-manager.js';
import {summarySeries,summaryCurve} from './run-summary-chart.js';
import {tr,onLanguageChange} from './i18n.js';
import {renderLocalized} from './localized-text.js';
import './run-report.css';
const NS='http://www.w3.org/2000/svg';
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const svgNode=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
function eventIcon(kind,x=0,y=0){
  const group=svgNode('g',{transform:'translate('+x+' '+y+')',class:'summary-event-icon'});
  if(kind==='kill'){
    group.append(svgNode('circle',{r:10,fill:'#672e2b',stroke:'#e18477','stroke-width':1.5}),svgNode('path',{d:'M-6-2L-7-7L-2-5Q0-6 2-5L7-7L6-2Q8 6 0 7Q-8 6-6-2Z',fill:'#231b1a'}),svgNode('path',{d:'M-5-1L-1 0L-2 2L-5 1ZM5-1L1 0L2 2L5 1Z',fill:'#ffe6d4'}));
  }else if(kind==='chest'){
    group.append(svgNode('circle',{r:10,fill:'#55401f',stroke:'#e9c574','stroke-width':1.5}),svgNode('path',{d:'M-6-2Q-6-6 0-6T6-2V5H-6Z',fill:'#b7803b',stroke:'#f6db9a','stroke-width':1}),svgNode('path',{d:'M-6-1H6M0-2V2',fill:'none',stroke:'#f6db9a','stroke-width':1.2}));
  }else if(kind==='death'){
    group.append(svgNode('path',{d:'M-8-2C-8-13 8-13 8-2Q8 3 5 4L5 9L-5 9L-5 4Q-8 3-8-2Z',fill:'#eee8d7',stroke:'#201b17','stroke-width':1.2}),svgNode('ellipse',{cx:-3.5,cy:-1,rx:2.2,ry:2.7,fill:'#28201a'}),svgNode('ellipse',{cx:3.5,cy:-1,rx:2.2,ry:2.7,fill:'#28201a'}),svgNode('path',{d:'M0 2L-1.8 5L1.8 5ZM-2 6V9M2 6V9',fill:'#28201a',stroke:'#28201a','stroke-width':1}));
  }else group.append(svgNode('path',{d:'M9-16Q3-8-1 3L-9 17Q-6 2-2-6Z',fill:'#fffaf0',stroke:'#fffaf0','stroke-width':1.2}));
  return group;
}
export function runTime(seconds){const total=Math.floor(seconds);return total>=3600?`${Math.floor(total/3600)}:${String(Math.floor(total/60)%60).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`:`${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;}
export class RunSummary {
  constructor(items,onContinue,{id='run-summary'}={}){this.items=items;this.onContinue=onContinue;this.floorAngles=new Map();this.element=node('section');this.element.id=id;this.element.className='run-report';this.element.hidden=true;this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');this.element.setAttribute('aria-labelledby',id+'-title');document.body.append(this.element);onLanguageChange(()=>{if(this.isOpen)this.render();});this.element.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();this.navigate(e.shiftKey?-1:1);}});}
  get isOpen(){return !this.element.hidden;}
  open(snapshot){this.snapshot=snapshot;this.element.hidden=false;this.render();}
  close(){this.element.hidden=true;}
  buttons(){return [...this.element.querySelectorAll('button')];}
  navigate(direction){const buttons=this.buttons(),index=buttons.indexOf(document.activeElement);buttons[(index+direction+buttons.length)%buttons.length]?.focus();}
  handleInput(frame){const keys=frame.uiPressed;if(keys.has('down')||keys.has('right'))this.navigate(1);else if(keys.has('up')||keys.has('left'))this.navigate(-1);if(keys.has('submit')){const buttons=this.buttons();(buttons.includes(document.activeElement)?document.activeElement:buttons.at(-1))?.click();}}
  render(){
    const snapshot=this.snapshot;this.element.replaceChildren();const panel=node('div','run-summary-panel');const title=node('h2',null,tr('Run summary'));title.id=this.element.id+'-title';panel.append(title,node('div','summary-ornament'),node('p','summary-outcome',tr(snapshot.outcome==='won'?'Crystal awakened':'Run ended')));
    const metrics=node('div','summary-metrics');for(const [label,value] of [[tr('Run time'),runTime(snapshot.duration)],[tr('Gems collected'),snapshot.totals.gems],[tr('Run points'),snapshot.totals.points],[tr('Enemies defeated'),snapshot.totals.kills]]){const metric=node('div');metric.append(node('strong',null,String(value)),node('span',null,label));metrics.append(metric);}panel.append(metrics);
    panel.append(node('h3',null,tr('Run points')));this.drawChart(panel);
    const legend=node('div','summary-legend');for(const [kind,label] of [['kill',tr('Enemy defeated')],['chest',tr('Chest opened')],['floor',tr('Floor completed')],...(snapshot.outcome==='lost'?[['death',tr('Death')]]:[])]){const entry=node('span'),icon=svgNode('svg',{viewBox:'-12 -12 24 24','aria-hidden':'true'});icon.append(eventIcon(kind));entry.append(icon,document.createTextNode(label));legend.append(entry);}panel.append(legend,node('h3',null,tr('Collected items')));
    const inventory=node('div','summary-inventory'),counts=new Map();for(const event of snapshot.events)if(event.type==='item.acquired')counts.set(event.data.id,(counts.get(event.data.id)??0)+1);
    const detail=node('div','summary-item-detail');detail.setAttribute('aria-live','polite');let hovered=null,focused=null;
    const show=id=>{detail.classList.toggle('is-visible',!!id);if(!id)return;const item=this.items.items.get(id);renderItemTooltip(detail,item,this.items.rarity(id),counts.get(id));};
    for(const [id,count] of counts){const item=this.items.items.get(id);if(!item)continue;const button=node('button','summary-item');button.style.setProperty('--item-color',this.items.rarity(id).color);button.setAttribute('aria-label',tr(item.name)+' ×'+count);const icon=node('span','summary-diamond');icon.append(node('span',null,item.symbol));button.append(icon);button.onclick=()=>button.focus();button.onpointerenter=()=>{hovered=id;show(id)};button.onpointerleave=()=>{hovered=null;show(focused)};button.onfocus=()=>{focused=id;show(id)};button.onblur=()=>{focused=null;show(hovered)};inventory.append(button);}
    if(!counts.size)inventory.append(node('p','summary-empty',tr('No items collected')));panel.append(inventory,detail);
    if(this.history?.state.recent.length>1){const compare=node('button','summary-compare',tr('Compare recent runs'));compare.onclick=()=>this.onCompare?.();panel.append(compare);}
    if(this.onRestart){
      const restart=node('button','summary-compare',tr('Restart run'));
      restart.onclick=()=>{
        if(restart.disabled)return;
        for(const button of this.buttons())button.disabled=true;
        this.onRestart();
      };
      panel.append(restart);
    }
    const next=node('button','summary-continue',tr(this.continueLabel??'Continue to upgrades'));next.onclick=()=>{this.close();this.onContinue();};panel.append(next);this.element.append(panel);next.focus({preventScroll:true});
  }
  drawChart(panel,comparisons=[]){
    const snap=this.snapshot,series=summarySeries(snap),duration=Math.max(snap.duration,...comparisons.map(run=>run.duration),1),maximum=Math.max(snap.totals.points,...comparisons.map(run=>run.totals.points),1),x=t=>36+t/duration*850,y=v=>214-v/maximum*166,curve=summaryCurve(series,x,y);
    const chart=node('div','summary-chart'),svg=svgNode('svg',{viewBox:'0 0 950 260',role:'img','aria-label':tr('Points earned over run time')});
    const defs=svgNode('defs'),gradient=svgNode('linearGradient',{id:'summary-fill',x1:0,y1:0,x2:0,y2:1});for(const [offset,opacity] of [['0%','.23'],['75%','.04'],['100%','0']])gradient.append(svgNode('stop',{offset,'stop-color':'#d6b56e','stop-opacity':opacity}));const fade=svgNode('linearGradient',{id:'summary-edge-fade',gradientUnits:'userSpaceOnUse',x1:36,y1:0,x2:886,y2:0});for(const [offset,color] of [['0%','black'],['9%','white'],['88%','white'],['100%','black']])fade.append(svgNode('stop',{offset,'stop-color':color}));const mask=svgNode('mask',{id:'summary-edge-mask',maskUnits:'userSpaceOnUse',x:0,y:0,width:950,height:260});mask.append(svgNode('rect',{width:950,height:260,fill:'url(#summary-edge-fade)'}));for(const [id,color] of [['floor','#ffe28a'],['kill','#f06455']]){const glow=svgNode('radialGradient',{id:'summary-glow-'+id});for(const [offset,opacity] of [['0%','.55'],['30%','.29'],['65%','.1'],['100%','0']])glow.append(svgNode('stop',{offset,'stop-color':color,'stop-opacity':opacity}));defs.append(glow);}defs.append(gradient,fade,mask);svg.append(defs);const glows=svgNode('g',{'aria-hidden':'true'});svg.append(glows);
    const comparisonEnds=svgNode('g');
    const occupiedEnds=[{x:x(snap.duration),y:curve.at(snap.duration),width:Math.max(46,String(snap.totals.points).length*9+14)}];
    for(const other of comparisons){
      const otherCurve=summaryCurve(summarySeries(other),x,y);
      const lowerScore=other.totals.points<snap.totals.points;
      svg.append(svgNode('path',{d:otherCurve.path,class:lowerScore?'summary-comparison is-lower-score':'summary-comparison',mask:'url(#summary-edge-mask)'}));
      if(other.outcome==='lost'){
        const endX=x(other.duration),endY=otherCurve.at(other.duration);
        const width=Math.max(46,String(other.totals.points).length*9+14);
        const offsets=[0,-24,24,-48,48,-72,72,-96,96];
        const labelY=offsets.map(offset=>endY+offset).find(candidate=>candidate>=20&&candidate<=226&&occupiedEnds.every(placed=>
          endX+width<placed.x-12||placed.x+placed.width<endX-12||Math.abs(candidate-placed.y)>=23
        ))??endY;
        occupiedEnds.push({x:endX,y:labelY,width});
        if(labelY!==endY)comparisonEnds.append(svgNode('line',{x1:endX,y1:endY,x2:endX,y2:labelY,class:'summary-comparison-leader'}));
        const skull=eventIcon('death',endX,labelY);
        skull.classList.add('summary-comparison-skull');
        const score=svgNode('text',{x:endX+12,y:labelY+5,class:'summary-comparison-score'});
        score.textContent=String(other.totals.points);
        comparisonEnds.append(skull,score);
      }
    }
    const ribbon=svgNode('g',{mask:'url(#summary-edge-mask)'});ribbon.append(svgNode('path',{d:curve.path+' L '+x(snap.duration)+' 232 L 36 232 Z',fill:'url(#summary-fill)'}),svgNode('path',{d:curve.path,class:'summary-line-halo'}),svgNode('path',{d:curve.path,class:'summary-line-edge'}),svgNode('path',{d:curve.path,class:'summary-line'}));svg.append(ribbon);
    for(const event of snap.events){const px=x(event.time),py=curve.at(event.time);
      if(event.type==='floor.completed'){glows.append(svgNode('circle',{cx:px,cy:py,r:19,fill:'url(#summary-glow-floor)'}));const tick=eventIcon('floor',px,py),title=svgNode('title');title.textContent=tr('Floor {floor}',{floor:event.data.label})+' · '+runTime(event.time);const key=(snap.meta?.runId??snap.meta?.seed??'')+':'+event.data.id+':'+event.time;if(!this.floorAngles.has(key))this.floorAngles.set(key,-RandomManager.graphics()*15);tick.querySelector('path').setAttribute('transform','rotate('+this.floorAngles.get(key)+')');tick.prepend(title);svg.append(tick);continue;}
      if(event.type!=='enemy.killed'&&event.type!=='chest.opened')continue;
      if(event.type==='chest.opened'){const icon=eventIcon('chest',px,py),title=svgNode('title');title.textContent=tr('Chest opened')+' · '+runTime(event.time);icon.prepend(title);svg.append(icon);continue;}
      glows.append(svgNode('circle',{cx:px,cy:py,r:25,fill:'url(#summary-glow-kill)'}));
      const icon=eventIcon('kill',px,py),title=svgNode('title');title.textContent=tr('Enemy defeated')+' · '+runTime(event.time);icon.prepend(title);svg.append(icon);
    }
    svg.append(comparisonEnds);
    if(snap.outcome==='lost'){const skull=eventIcon('death',x(snap.duration),curve.at(snap.duration)),title=svgNode('title');title.textContent=tr('Death')+' · '+runTime(snap.duration);skull.prepend(title);svg.append(skull);}
    const end=svgNode('text',{x:x(snap.duration)+12,y:y(series.at(-1).value)+5,class:'summary-final-value'});end.textContent=String(snap.totals.points);svg.append(end);
    for(const [time,label] of [[snap.duration,runTime(snap.duration)]]){const text=svgNode('text',{x:x(time),y:255,'text-anchor':time?'end':'start'});text.textContent=label;svg.append(text);}chart.append(svg);panel.append(chart);
  }
}
