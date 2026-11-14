import {SKILLS,progression,isSkillVisible,isSkillPreview,SKILL_MAP_SIZE} from './progression.js';
import {TreeViewport,TREE_PAN_KEYS,treeKeyboardDelta,PanTail,SmoothTreeZoom} from './tree-viewport.js';
import {PixelSkillArt,skillPosition} from './pixel-skill-art.js';
import {createSkillStarfield} from './skill-stars.js';
import {StarParallax} from './star-parallax.js';
import {SkillComets} from './skill-comets.js';
export class SkillTree {
  constructor(onNext){
    this.onNext=onNext;this.selected=null;this.hovered=null;this.navKeys=new Set();this.panTail=new PanTail();this.smoothZoom=new SmoothTreeZoom();this.dragging=false;
    this.element=document.createElement('section');this.element.id='skill-tree';this.element.hidden=true;this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');this.element.setAttribute('aria-label','Древо солнечного света');
    this.element.innerHTML=`<header class="tree-header"><div><small id="tree-outcome"></small><h2>Древо света</h2></div><strong id="tree-points"></strong><button id="tree-next" class="primary">Следующий забег →</button></header><div class="tree-body"><div class="tree-scroll"><div class="tree-map"><div class="tree-root"><span>☀</span><small>ИСТОЧНИК</small></div></div></div><aside class="tree-detail"><small id="tree-branch"></small><h3 id="tree-name"></h3><p id="tree-description"></p><p id="tree-requirement"></p><button id="tree-buy" class="primary"></button><small>Улучшения вступят в силу в следующем забеге.<br>Неиспользованные очки сохраняются.</small></aside></div>`;
    document.body.append(this.element);this.map=this.element.querySelector('.tree-map');this.buttons=new Map();
    this.map.style.width=this.map.style.height=SKILL_MAP_SIZE+'px';
    const root=this.map.querySelector('.tree-root');root.style.left=root.style.top=SKILL_MAP_SIZE/2+'px';root.hidden=true;
    this.detail=this.element.querySelector('.tree-detail');this.detail.setAttribute('aria-hidden','true');
    this.detail.querySelector('small:last-child').remove();
    for(const skill of SKILLS){
      const {x,y}=skillPosition(skill);
      const button=document.createElement('button');button.className='skill-node'+(skill.isRoot?' is-root':'');button.style.left=x/SKILL_MAP_SIZE*100+'%';button.style.top=y/SKILL_MAP_SIZE*100+'%';button.innerHTML='<span>✦</span><b></b><small hidden></small>';button.querySelector('b').textContent=skill.name;button.setAttribute('aria-label',skill.name);
      button.onclick=()=>{this.art.pulse(skill.id);this.selected=skill.id;this.hovered=null;this.render();};
      const peek=()=>{if(!this.selected&&!this.viewport.classList.contains('is-dragging')){this.hovered=skill.id;this.renderDetail();}};
      const leave=()=>{if(this.hovered===skill.id){this.hovered=null;this.renderDetail();}};
      button.addEventListener('pointerenter',peek);button.addEventListener('pointerleave',leave);button.addEventListener('focus',peek);button.addEventListener('blur',leave);
      this.map.append(button);this.buttons.set(skill.id,button);
    }
    this.art=new PixelSkillArt(this.map,()=>!this.element.hidden);
    this.viewport=this.element.querySelector('.tree-scroll');this.camera=new TreeViewport(SKILL_MAP_SIZE/2);
    this.comets=new SkillComets(this.viewport);
    this.sky=new StarParallax(this.viewport,createSkillStarfield());this.art.onFrame=dt=>{if(this.smoothZoom.step(this.camera,dt))this.applyCamera();if(this.rootRevealUntil&&this.art.time>this.rootRevealUntil){this.element.classList.remove('is-source-awakening');this.rootRevealUntil=0;}const moving=this.updateKeyboard(dt);if(!moving&&!this.dragging){const tail=this.panTail.step(dt);if(Math.abs(tail.x)+Math.abs(tail.y)>.001)this.panView(tail.x,tail.y);}this.sky.update(dt);this.comets.update(dt,this.sky.motion);};this.bindNavigation();
    const center=document.createElement('button');center.className='text-button';center.textContent='☀ К солнцу';center.onclick=()=>this.center();this.element.querySelector('.tree-header').insertBefore(center,this.element.querySelector('#tree-next'));
    this.element.querySelector('#tree-buy').onclick=()=>{
      const selected=SKILLS.find(skill=>skill.id===this.selected);
      if(!selected||!progression.buy(selected.id))return;
      if(selected.isRoot){this.selected=null;this.hovered=null;this.rootRevealUntil=this.art.time+.9;this.element.classList.add('is-source-awakening');}
      this.render();
      const child=!selected.isRoot&&SKILLS.find(skill=>skill.requires===selected.id);
      if(child){this.smoothZoom.clear();this.interruptCamera();const p=skillPosition(child);this.map.classList.add('is-guiding');this.camera.x=this.viewport.clientWidth/2-p.x*this.camera.zoom;this.camera.y=this.viewport.clientHeight/2-p.y*this.camera.zoom;this.applyCamera();}
    };
    this.element.querySelector('#tree-next').onclick=()=>{this.navKeys.clear();this.art.stop();this.onNext();};
  }
  applyCamera(){this.map.style.transform=this.camera.transform();this.positionDetail();}
  panView(x,y){this.camera.pan(x,y);this.sky.drag(x,y);this.applyCamera();}
  updateKeyboard(dt){
    const delta=treeKeyboardDelta(this.navKeys,dt);if(!delta.x&&!delta.y)return false;
    this.interruptCamera();
    if(this.hovered){this.hovered=null;this.renderDetail();}
    this.panTail.record(delta.x,delta.y,dt);this.panView(delta.x,delta.y);return true;
  }
  positionDetail(){
    const id=this.selected??this.hovered,button=this.buttons.get(id);if(!button||!this.detail.classList.contains('is-visible'))return;
    const area=this.element.querySelector('.tree-body').getBoundingClientRect(),node=button.getBoundingClientRect(),w=this.detail.offsetWidth,h=this.detail.offsetHeight;
    const x=Math.max(12,Math.min(area.width-w-12,node.left+node.width/2-area.left-w/2));
    let y=node.bottom-area.top+25;if(y+h>area.height-20)y=node.top-area.top-h-25;
    this.detail.style.left=x+'px';this.detail.style.top=Math.max(24,Math.min(area.height-h-22,y))+'px';
  }
  interruptCamera(){if(!this.map.classList.contains('is-guiding'))return;const m=new DOMMatrixReadOnly(getComputedStyle(this.map).transform);this.camera.x=m.e;this.camera.y=m.f;this.camera.zoom=m.a;this.map.classList.remove('is-guiding');this.applyCamera();}
  center(){this.smoothZoom.clear();this.panTail.clear();this.camera.zoom=1;this.camera.center(this.viewport.clientWidth,this.viewport.clientHeight);this.applyCamera();}
  bindNavigation(){
    let drag=null,suppressClick=false,lastWidth=0,lastHeight=0;
    addEventListener('keydown',event=>{
      if(this.element.hidden||!TREE_PAN_KEYS.has(event.code)||event.ctrlKey||event.altKey||event.metaKey)return;
      event.preventDefault();
      if(event.repeat&&!this.navKeys.has(event.code))return;
      this.navKeys.add(event.code);
    });
    addEventListener('keyup',event=>this.navKeys.delete(event.code));
    addEventListener('blur',()=>{this.navKeys.clear();this.panTail.clear();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.navKeys.clear();});
    this.viewport.addEventListener('pointerdown',event=>{if(event.button!==0)return;this.smoothZoom.clear();this.interruptCamera();this.panTail.clear();suppressClick=false;drag={time:event.timeStamp,id:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,moved:false};});
    this.viewport.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<5)return;
      if(!drag.moved){drag.moved=true;this.dragging=true;this.hovered=null;this.renderDetail();this.viewport.setPointerCapture(event.pointerId);this.viewport.classList.add('is-dragging');}
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      this.panTail.record(dx,dy,(event.timeStamp-drag.time)/1000);drag.time=event.timeStamp;this.camera.pan(dx,dy);this.sky.drag(dx,dy);
      drag.x=event.clientX;drag.y=event.clientY;this.applyCamera();event.preventDefault();
    });
    const stop=event=>{if(!drag||drag.id!==event.pointerId)return;suppressClick=drag.moved;this.dragging=false;if(event.timeStamp-drag.time>80||event.type==='pointercancel')this.panTail.clear();if(this.viewport.hasPointerCapture(event.pointerId))this.viewport.releasePointerCapture(event.pointerId);drag=null;this.viewport.classList.remove('is-dragging');};
    this.viewport.addEventListener('pointerup',stop);this.viewport.addEventListener('pointercancel',stop);
    this.viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
    this.viewport.addEventListener('click',event=>{if(event.button===0&&!event.target.closest('.skill-node')){this.element.querySelector('.skill-node:focus')?.blur();this.selected=null;this.hovered=null;this.render();}});
    this.map.addEventListener('transitionend',()=>this.positionDetail());
    this.element.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();this.selected=null;this.hovered=null;this.render();}});
    this.viewport.addEventListener('wheel',event=>{event.preventDefault();this.panTail.clear();this.interruptCamera();const rect=this.viewport.getBoundingClientRect(),delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?this.viewport.clientHeight:1);this.smoothZoom.queue(this.camera,event.clientX-rect.left,event.clientY-rect.top,Math.exp(-delta*.0015));},{passive:false});
    this.observer=new ResizeObserver(()=>{const w=this.viewport.clientWidth,h=this.viewport.clientHeight;if(!w||!h)return;if(lastWidth&&lastHeight)this.camera.pan((w-lastWidth)/2,(h-lastHeight)/2);else this.camera.center(w,h);lastWidth=w;lastHeight=h;this.applyCamera();});this.observer.observe(this.viewport);
  }
  open(won,collected,victoryBonus=0){
    this.comets.reset();
    this.navKeys.clear();
    this.selected=null;this.hovered=null;this.rootRevealUntil=0;this.element.classList.remove('is-source-awakening');
    this.element.hidden=false;this.element.querySelector('#tree-outcome').textContent=(won?'КРИСТАЛЛ ПРОБУЖДЁН':'ЗАБЕГ ЗАВЕРШЁН')+' · СОБРАНО '+collected+(victoryBonus?' · ПОБЕДА +'+victoryBonus:'');
    this.render();this.center();this.art.start();this.element.querySelector('#tree-next').focus();
  }
  render(){
    this.element.querySelector('#tree-points').textContent='✦ '+progression.state.points+' очк.';
    for(const skill of SKILLS){const owned=progression.state.owned.includes(skill.id),ready=progression.canBuy(skill.id),visible=isSkillVisible(progression.state,skill.id),preview=isSkillPreview(progression.state,skill.id),button=this.buttons.get(skill.id);button.hidden=!visible&&!preview;button.dataset.status=owned?'owned':preview?'preview':ready?'ready':'locked';button.setAttribute('aria-pressed',String(this.selected===skill.id));button.querySelector('small').hidden=!owned;button.querySelector('small').textContent=owned?'ИЗУЧЕНО':'';}
    this.art.sync(SKILLS.map(skill=>{const button=this.buttons.get(skill.id);return {id:skill.id,status:button.hidden?'hidden':button.dataset.status,selected:this.selected===skill.id,unaffordable:!progression.state.owned.includes(skill.id)&&progression.state.points<skill.cost};}));
    this.renderDetail();
  }
  renderDetail(){
    const selected=SKILLS.find(s=>s.id===(this.selected??this.hovered)),buy=this.element.querySelector('#tree-buy');
    this.detail.classList.toggle('is-visible',!!selected);this.detail.classList.toggle('is-pinned',!!this.selected);this.detail.setAttribute('aria-hidden',String(!selected));
    if(!selected){buy.disabled=true;return;}
    const owned=progression.state.owned.includes(selected.id),canBuy=progression.canBuy(selected.id);
    this.element.querySelector('#tree-name').textContent=selected.name;this.element.querySelector('#tree-branch').textContent=selected.isRoot?'Источник':selected.branch+' · '+(selected.tier+1)+'/'+selected.tiers;this.element.querySelector('#tree-description').textContent=isSkillPreview(progression.state,selected.id)?'???':selected.description;
    const conditions=[];
    if(selected.requires&&!progression.state.owned.includes(selected.requires))conditions.push('Изучи «'+SKILLS.find(s=>s.id===selected.requires).name+'»');
    if(!owned&&progression.state.points<selected.cost)conditions.push('Нужно '+selected.cost+' очко · сейчас '+progression.state.points);
    this.element.querySelector('#tree-requirement').textContent='';
    buy.dataset.requirement=String(conditions.length>0);
    buy.disabled=!this.selected||!canBuy;buy.textContent=owned?'✦ Изучено':conditions.length?conditions.join(' · '):this.selected?'✦ '+selected.cost+' · Изучить':'✦ '+selected.cost+' · Нажми на навык';
    this.positionDetail();
  }
}
