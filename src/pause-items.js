import {renderItemTooltip} from './item-tooltip.js';
import {tr,onLanguageChange} from './i18n.js';
import {renderLocalized} from './localized-text.js';
import './pause-items.css';

export class PauseItems {
  constructor(items,surface){
    this.items=items;this.version=-1;this.hovered=null;this.focused=null;
    this.element=document.createElement('section');this.element.id='pause-run-items';this.element.hidden=true;
    this.strip=document.createElement('div');this.strip.className='pause-item-strip';
    this.tooltip=document.createElement('div');this.tooltip.id='pause-item-tooltip';this.tooltip.setAttribute('role','tooltip');this.tooltip.setAttribute('aria-hidden','true');
    this.element.append(this.strip,this.tooltip);(surface.parentElement??surface).prepend(this.element);
    onLanguageChange(()=>{this.version=-1;});
  }
  sync(paused){
    this.element.hidden=!paused||this.items.stacks.size===0;
    if(this.element.hidden){this.hovered=this.focused=null;this.show(null);return;}
    if(this.version===this.items.version)return;this.version=this.items.version;this.strip.replaceChildren();
    this.hovered=this.focused=null;this.show(null);
    for(const [id,count] of this.items.stacks){
      const item=this.items.items.get(id),button=document.createElement('button');button.type='button';button.className='pause-item';button.dataset.item=id;button.dataset.rarity=item.rarity;button.style.setProperty('--rarity-color',this.items.rarity(id).color);
      button.setAttribute('aria-label',`${tr(item.name)} ×${count}`);button.setAttribute('aria-describedby','pause-item-tooltip');
      const diamond=document.createElement('span');diamond.className='pause-item-diamond';diamond.setAttribute('aria-hidden','true');const glyph=document.createElement('span');glyph.textContent=item.symbol;diamond.append(glyph);
      button.append(diamond);
      button.onpointerenter=()=>{this.hovered=id;this.show(id);};button.onpointerleave=()=>{this.hovered=null;this.show(this.focused);};
      button.onfocus=()=>{this.focused=id;this.show(id);};button.onblur=()=>{this.focused=null;this.show(this.hovered);};button.onclick=()=>button.focus();this.strip.append(button);
    }
  }
  show(id){
    this.tooltip.classList.toggle('is-visible',!!id);this.tooltip.setAttribute('aria-hidden',String(!id));
    if(!id)return;
    const item=this.items.items.get(id);this.tooltip.dataset.rarity=item.rarity;renderItemTooltip(this.tooltip,item,this.items.rarity(id),this.items.stacks.get(id)??0);
  }
  handleInput(frame){
    const buttons=[...this.strip.querySelectorAll('button')],active=document.activeElement,keys=frame.uiPressed;
    if(!buttons.length)return false;
    if(keys.has('left')||keys.has('right')){const direction=keys.has('right')?1:-1,index=buttons.indexOf(active);buttons[index<0?(direction>0?0:buttons.length-1):(index+direction+buttons.length)%buttons.length].focus();return true;}
    if(buttons.includes(active)&&keys.has('down')){document.getElementById('resume')?.focus();return true;}
    return false;
  }
}
