import {SKILLS,progression,isSkillVisible,isSkillPreview} from './progression.js';
import {TreeViewport} from './tree-viewport.js';
import {PixelSkillArt,skillPosition} from './pixel-skill-art.js';
import {createSkillStarfield} from './skill-stars.js';
export class SkillTree {
  constructor(onNext){
    this.onNext=onNext;this.selected=SKILLS[0].id;
    this.element=document.createElement('section');this.element.id='skill-tree';this.element.hidden=true;this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');this.element.setAttribute('aria-label','Древо солнечного света');
    this.element.innerHTML=`<header class="tree-header"><div><small id="tree-outcome"></small><h2>Древо света</h2><p>Осколок — одно очко. Знания остаются после заката.</p></div><strong id="tree-points"></strong><button id="tree-next" class="primary">Следующий забег →</button></header><div class="tree-body"><div class="tree-scroll"><div class="tree-map"><svg viewBox="0 0 1000 1000" class="tree-lines" aria-hidden="true"></svg><div class="tree-root"><span>☀</span><small>ИСТОЧНИК</small></div></div></div><aside class="tree-detail"><small id="tree-branch"></small><h3 id="tree-name"></h3><p id="tree-description"></p><p id="tree-requirement"></p><button id="tree-buy" class="primary"></button><small>Улучшения вступят в силу в следующем забеге.<br>Неиспользованные очки сохраняются.</small></aside></div>`;
    document.body.append(this.element);this.map=this.element.querySelector('.tree-map');this.svg=this.element.querySelector('svg');this.buttons=new Map();
    for(const skill of SKILLS){
      const angle=-Math.PI/2+skill.ray*Math.PI*2/5,radius=180+skill.tier*180,{x,y}=skillPosition(skill);
      const previousRadius=skill.tier?radius-180:55;
      const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d',`M${800+Math.cos(angle)*previousRadius} ${800+Math.sin(angle)*previousRadius}L${x} ${y}`);line.dataset.skill=skill.id;this.svg.append(line);
      const button=document.createElement('button');button.className='skill-node';button.style.left=x/16+'%';button.style.top=y/16+'%';button.innerHTML=`<span>${['✦','✧','✶','☼'][skill.tier]}</span><b>${skill.name}</b><small>1 очко</small>`;button.setAttribute('aria-label',skill.name);button.title=skill.name+': '+skill.description;button.onclick=()=>{this.selected=skill.id;this.render();};this.map.append(button);this.buttons.set(skill.id,button);
    }
    this.svg.setAttribute('viewBox','0 0 1600 1600');
    this.art=new PixelSkillArt(this.map,()=>!this.element.hidden);
    this.viewport=this.element.querySelector('.tree-scroll');this.camera=new TreeViewport();this.bindNavigation();
    this.viewport.style.backgroundImage=createSkillStarfield();
    const center=document.createElement('button');center.className='text-button';center.textContent='☀ К солнцу';center.onclick=()=>this.center();this.element.querySelector('.tree-header').insertBefore(center,this.element.querySelector('#tree-next'));
    this.element.querySelector('#tree-buy').onclick=()=>{if(progression.buy(this.selected)){this.render();const child=SKILLS.find(s=>s.requires===this.selected);if(child){this.interruptCamera();const p=skillPosition(child);this.map.classList.add('is-guiding');this.camera.x=this.viewport.clientWidth/2-p.x*this.camera.zoom;this.camera.y=this.viewport.clientHeight/2-p.y*this.camera.zoom;this.applyCamera();}}};
    this.element.querySelector('#tree-next').onclick=()=>{this.art.stop();this.onNext();};
  }
  applyCamera(){this.map.style.transform=this.camera.transform();}
  interruptCamera(){if(!this.map.classList.contains('is-guiding'))return;const m=new DOMMatrixReadOnly(getComputedStyle(this.map).transform);this.camera.x=m.e;this.camera.y=m.f;this.camera.zoom=m.a;this.map.classList.remove('is-guiding');this.applyCamera();}
  center(){this.camera.zoom=1;this.camera.center(this.viewport.clientWidth,this.viewport.clientHeight);this.applyCamera();}
  bindNavigation(){
    let drag=null,suppressClick=false,lastWidth=0,lastHeight=0,skyX=0,skyY=0;
    this.viewport.addEventListener('pointerdown',event=>{if(event.button!==0)return;this.interruptCamera();suppressClick=false;drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,moved:false};});
    this.viewport.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<5)return;
      if(!drag.moved){drag.moved=true;this.viewport.setPointerCapture(event.pointerId);this.viewport.classList.add('is-dragging');}
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      this.camera.pan(dx,dy);skyX+=dx;skyY+=dy;
      this.viewport.style.setProperty('--sky-near-x',skyX*.15+'px');this.viewport.style.setProperty('--sky-near-y',skyY*.15+'px');
      this.viewport.style.setProperty('--sky-far-x',skyX*.065+'px');this.viewport.style.setProperty('--sky-far-y',skyY*.065+'px');
      drag.x=event.clientX;drag.y=event.clientY;this.applyCamera();event.preventDefault();
    });
    const stop=event=>{if(!drag||drag.id!==event.pointerId)return;suppressClick=drag.moved;if(this.viewport.hasPointerCapture(event.pointerId))this.viewport.releasePointerCapture(event.pointerId);drag=null;this.viewport.classList.remove('is-dragging');};
    this.viewport.addEventListener('pointerup',stop);this.viewport.addEventListener('pointercancel',stop);
    this.viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
    this.viewport.addEventListener('click',event=>{if(event.button===0&&!event.target.closest('.skill-node')){this.element.querySelector('.skill-node:focus')?.blur();this.selected=null;this.render();}});
    this.viewport.addEventListener('wheel',event=>{event.preventDefault();this.interruptCamera();const rect=this.viewport.getBoundingClientRect(),delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?this.viewport.clientHeight:1);this.camera.zoomAt(event.clientX-rect.left,event.clientY-rect.top,Math.exp(-delta*.0015));this.applyCamera();},{passive:false});
    this.observer=new ResizeObserver(()=>{const w=this.viewport.clientWidth,h=this.viewport.clientHeight;if(!w||!h)return;if(lastWidth&&lastHeight)this.camera.pan((w-lastWidth)/2,(h-lastHeight)/2);else this.camera.center(w,h);lastWidth=w;lastHeight=h;this.applyCamera();});this.observer.observe(this.viewport);
  }
  open(won,collected){
    this.element.hidden=false;this.element.querySelector('#tree-outcome').textContent=(won?'КРИСТАЛЛ ПРОБУЖДЁН':'ЗАБЕГ ЗАВЕРШЁН')+' · СОБРАНО '+collected;
    this.render();this.center();this.art.start();this.element.querySelector('#tree-next').focus();
  }
  render(){
    this.element.querySelector('#tree-points').textContent='✦ '+progression.state.points+' очк.';
    for(const skill of SKILLS){const owned=progression.state.owned.includes(skill.id),ready=progression.canBuy(skill.id),visible=isSkillVisible(progression.state,skill.id),preview=isSkillPreview(progression.state,skill.id),button=this.buttons.get(skill.id);button.hidden=!visible&&!preview;button.dataset.status=owned?'owned':preview?'preview':ready?'ready':'locked';button.setAttribute('aria-pressed',String(this.selected===skill.id));button.querySelector('small').textContent=owned?'ИЗУЧЕНО':'1 очко';const line=this.svg.querySelector(`[data-skill="${skill.id}"]`);line.style.display=visible||preview?'':'none';line.setAttribute('class',owned?'owned':preview?'preview':ready?'ready':'');}
    this.art.sync(SKILLS.map(skill=>{const button=this.buttons.get(skill.id);return {id:skill.id,status:button.hidden?'hidden':button.dataset.status,selected:this.selected===skill.id,unaffordable:!progression.state.owned.includes(skill.id)&&progression.state.points<skill.cost};}));
    const selected=SKILLS.find(s=>s.id===this.selected),buy=this.element.querySelector('#tree-buy');
    buy.hidden=!selected;
    if(!selected){this.element.querySelector('#tree-name').textContent='Выбери навык';this.element.querySelector('#tree-branch').textContent='Древо света';this.element.querySelector('#tree-description').textContent='Нажми на ромб, чтобы узнать о навыке и условиях изучения.';this.element.querySelector('#tree-requirement').textContent='';buy.disabled=true;return;}
    const owned=progression.state.owned.includes(selected.id);
    this.element.querySelector('#tree-name').textContent=selected.name;this.element.querySelector('#tree-branch').textContent=selected.branch+' · '+(selected.tier+1)+'/4';this.element.querySelector('#tree-description').textContent=selected.description;
    const conditions=[];
    if(selected.requires&&!progression.state.owned.includes(selected.requires))conditions.push('Условие: изучить «'+SKILLS.find(s=>s.id===selected.requires).name+'».');
    if(!owned&&progression.state.points<selected.cost)conditions.push('Нужно '+selected.cost+' очко. Сейчас: '+progression.state.points+'.');
    this.element.querySelector('#tree-requirement').textContent=conditions.join('\n');
    buy.disabled=!progression.canBuy(selected.id);buy.textContent=owned?'Изучено':'Изучить · 1 ✦';
  }
}
