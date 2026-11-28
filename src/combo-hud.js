import {tr} from './i18n.js';
import './combo-hud.css';
export class ComboHUD {
  constructor(parent){
    this.element=document.createElement('div');this.element.id='combo-hud';this.element.hidden=true;
    this.element.innerHTML='<div><strong></strong><span></span></div><small></small><i><b></b></i>';parent.append(this.element);
    [this.title,this.count,this.action,this.bar]=['strong','span','small','b'].map(selector=>this.element.querySelector(selector));
  }
  update(combo,visible){
    this.element.hidden=!visible||!combo.enabled||!combo.count;if(this.element.hidden)return;
    const title=tr('Combo')+' ×'+combo.multiplier,count=String(combo.count);if(this.title.textContent!==title)this.title.textContent=title;if(this.count.textContent!==count)this.count.textContent=count;
    const names={gem:tr('Gem pickup'),stomp:tr('Stomp'),dashKill:tr('Dash kill'),vitral:tr('Stained-glass crossing'),chest:tr('Chest break')};
    const action=names[combo.lastAction]??'';if(this.action.textContent!==action)this.action.textContent=action;this.bar.style.transform=`scaleX(${combo.fraction})`;
    const boosted=String(combo.multiplier>1);if(this.element.dataset.boosted!==boosted)this.element.dataset.boosted=boosted;
  }
}
