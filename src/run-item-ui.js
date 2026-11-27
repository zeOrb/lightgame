import {tr,onLanguageChange} from './i18n.js';
import {renderLocalized} from './localized-text.js';
import {RunItemBranch} from './run-item-branch.js';
import {createGlintOrnament} from './ui-leaf-glints.js';
import cornerArt from './run-item-frame-corner.svg?raw';
import lowerArt from './run-item-frame-lower.svg?raw';
import sideArt from './run-item-frame-side.svg?raw';
import './localized-text.css';
import './run-item-ui.css';

export class RunItemUI {
  constructor(items,onChoose,onOpen=()=>{}){
    this.items=items;this.onChoose=onChoose;this.onOpen=onOpen;this.version=-1;this.branches=new Map();
    this.element=document.createElement('section');this.element.id='run-item-choice';this.element.hidden=true;this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');this.element.setAttribute('aria-labelledby','run-item-title');
    document.body.append(this.element);
    this.element.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();this.navigate(event.shiftKey?-1:1);}});
    this.element.addEventListener('focusin',event=>this.activateOption(event.target.closest('.run-item-option')));
    onLanguageChange(()=>{this.version=-1;this.sync();});
  }
  get isOpen(){return !this.element.hidden;}
  buttons(){return [...this.element.querySelectorAll('button:not(:disabled)')];}
  activateOption(target){for(const button of this.element.querySelectorAll('.run-item-option')){const active=button===target;if(button.hasAttribute('data-active')!==active)button.toggleAttribute('data-active',active);this.branches.get(button)?.setActive(active);}}
  clearBranches(){for(const branch of this.branches.values())branch.dispose();this.branches.clear();}
  navigate(step){const buttons=this.buttons(),index=buttons.indexOf(document.activeElement),target=buttons[(index+step+buttons.length)%buttons.length];target?.focus({preventScroll:true});this.activateOption(target?.closest('.run-item-option'));}
  handleInput(frame){
    if(this.element.contains(document.activeElement))this.activateOption(document.activeElement.closest('.run-item-option'));
    const keys=frame.uiPressed;
    if(keys.has('right')||keys.has('down'))this.navigate(1);
    else if(keys.has('left')||keys.has('up'))this.navigate(-1);
    if(keys.has('submit')){const buttons=this.buttons();(buttons.includes(document.activeElement)?document.activeElement:buttons[0])?.click();}
  }
  sync(){
    const pending=this.items.pending;
    if(this.version===this.items.version)return !!pending;
    this.version=this.items.version;
    if(!pending){this.clearBranches();this.element.hidden=true;return false;}
    const opening=this.element.hidden;if(opening)this.onOpen();this.clearBranches();this.element.hidden=false;this.element.replaceChildren();
    const panel=document.createElement('div');panel.className='run-item-panel';
    const frame=document.createElement('div');frame.className='run-item-frame';frame.setAttribute('aria-hidden','true');
    for(const [corner,direction] of [['top-left','up'],['top-right','left'],['bottom-right','down'],['bottom-left','right']]){const detail=document.createElement('span');detail.className=`run-item-frame-corner ${corner}`;detail.append(createGlintOrnament(corner.startsWith('bottom')?lowerArt:cornerArt,direction));frame.append(detail);}panel.append(frame);
    for(const side of ['left','right']){const rail=document.createElement('span');rail.className=`run-item-frame-rail ${side}`;frame.prepend(rail);const detail=document.createElement('span');detail.className=`run-item-frame-side ${side}`;detail.append(createGlintOrnament(sideArt));frame.append(detail);}
    const title=document.createElement('h2');title.id='run-item-title';title.textContent=tr('Choose an item');panel.append(title);
    const options=document.createElement('div');options.className='run-item-options';
    for(const [index,id] of pending.options.entries()){const item=this.items.items.get(id),button=document.createElement('button');button.className='run-item-option';button.dataset.rarity=item.rarity;button.dataset.leaves=String(1+(index+[...String(pending.source)].reduce((sum,c)=>sum+c.charCodeAt(0),0))%4);button.style.setProperty('--rarity-color',this.items.rarity(id).color);
      if(index>0){const divider=document.createElement('div');divider.className='run-item-divider';divider.setAttribute('aria-hidden','true');options.append(divider);}
      button.dataset.focusPresentation='self';button.dataset.trim=String(index%3);const trim=document.createElement('i');trim.className='run-item-card-trim';trim.setAttribute('aria-hidden','true');for(const side of ['upper','lower']){const branch=document.createElement('i');branch.className=side;trim.append(branch);}button.append(trim);
      const icon=document.createElement('span');icon.className='run-item-icon';const glyph=document.createElement('span');glyph.textContent=item.symbol;icon.append(glyph);icon.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.className='run-item-name';name.textContent=tr(item.name);const rarity=document.createElement('small');rarity.className='run-item-rarity';rarity.textContent=tr(this.items.rarity(id).name);name.append(rarity);const effect=document.createElement('span');effect.className='run-item-effect';renderLocalized(effect,item.description);
      button.append(icon,name,effect);
      const branch=new RunItemBranch();this.branches.set(button,branch);button.append(branch.element);
      button.onpointerenter=()=>{button.focus({preventScroll:true});this.activateOption(button);};
      if(item.rarity!=='common'){
        const rim=document.createElement('i');rim.className='run-item-rim-sweep';rim.setAttribute('aria-hidden','true');button.append(rim);
      }
      button.onclick=()=>{if(this.items.pending!==pending)return;this.onChoose(id);this.sync();};options.append(button);
    }
    panel.append(options);const reroll=document.createElement('button');reroll.className='run-item-reroll';reroll.dataset.focusPresentation='self';reroll.textContent=tr('Reroll · {count}',{count:this.items.rerolls});reroll.disabled=!this.items.canReroll;reroll.onpointerenter=()=>{if(!reroll.disabled)reroll.focus({preventScroll:true});};
    reroll.onclick=()=>{if(this.items.reroll())this.sync();};panel.append(reroll);this.element.append(panel);this.buttons()[0]?.focus({preventScroll:true});return true;
  }
}

