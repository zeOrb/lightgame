import {tr,onLanguageChange} from './i18n.js';
import {renderLocalized} from './localized-text.js';
import './localized-text.css';
import './run-item-ui.css';

export class RunItemUI {
  constructor(items,onChoose,onOpen=()=>{}){
    this.items=items;this.onChoose=onChoose;this.onOpen=onOpen;this.version=-1;
    this.element=document.createElement('section');this.element.id='run-item-choice';this.element.hidden=true;this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');this.element.setAttribute('aria-labelledby','run-item-title');
    document.body.append(this.element);
    this.element.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();this.navigate(event.shiftKey?-1:1);}});
    onLanguageChange(()=>{this.version=-1;this.sync();});
  }
  get isOpen(){return !this.element.hidden;}
  buttons(){return [...this.element.querySelectorAll('button:not(:disabled)')];}
  navigate(step){const buttons=this.buttons(),index=buttons.indexOf(document.activeElement);buttons[(index+step+buttons.length)%buttons.length]?.focus();}
  handleInput(frame){
    const keys=frame.uiPressed;
    if(keys.has('right')||keys.has('down'))this.navigate(1);
    else if(keys.has('left')||keys.has('up'))this.navigate(-1);
    if(keys.has('submit')){const buttons=this.buttons();(buttons.includes(document.activeElement)?document.activeElement:buttons[0])?.click();}
  }
  sync(){
    const pending=this.items.pending;
    if(this.version===this.items.version)return !!pending;
    this.version=this.items.version;
    if(!pending){this.element.hidden=true;return false;}
    const opening=this.element.hidden;if(opening)this.onOpen();this.element.hidden=false;this.element.replaceChildren();
    const panel=document.createElement('div');panel.className='run-item-panel';
    const title=document.createElement('h2');title.id='run-item-title';title.textContent=tr('Choose an item');panel.append(title);
    const options=document.createElement('div');options.className='run-item-options';
    for(const [index,id] of pending.options.entries()){const item=this.items.items.get(id),button=document.createElement('button');button.className='run-item-option';button.dataset.rarity=item.rarity;button.dataset.leaves=String(1+(index+[...String(pending.source)].reduce((sum,c)=>sum+c.charCodeAt(0),0))%4);button.style.setProperty('--rarity-color',this.items.rarity(id).color);
      const icon=document.createElement('span');icon.className='run-item-icon';const glyph=document.createElement('span');glyph.textContent=item.symbol;icon.append(glyph);icon.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.className='run-item-name';name.textContent=tr(item.name);const rarity=document.createElement('small');rarity.className='run-item-rarity';rarity.textContent=tr(this.items.rarity(id).name);name.append(rarity);const effect=document.createElement('span');effect.className='run-item-effect';renderLocalized(effect,item.description);
      button.append(icon,name,effect);
      if(item.rarity!=='common'){
        const rim=document.createElement('i');rim.className='run-item-rim-sweep';rim.setAttribute('aria-hidden','true');button.append(rim);
      }
      button.onclick=()=>{if(this.items.pending!==pending)return;this.onChoose(id);this.sync();};options.append(button);
    }
    panel.append(options);const reroll=document.createElement('button');reroll.className='run-item-reroll';reroll.textContent=tr('Reroll · {count}',{count:this.items.rerolls});reroll.disabled=!this.items.canReroll;
    reroll.onclick=()=>{if(this.items.reroll())this.sync();};panel.append(reroll);this.element.append(panel);this.buttons()[0]?.focus({preventScroll:true});return true;
  }
}
