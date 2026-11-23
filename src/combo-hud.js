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
    this.title.textContent=tr('Combo')+' ×'+combo.multiplier;this.count.textContent=combo.count;
    const names={airGem:tr('Air gem'),stomp:tr('Stomp'),dashKill:tr('Dash kill'),vitral:tr('Stained-glass crossing'),chest:tr('Chest break')};
    this.action.textContent=names[combo.lastAction]??'';this.bar.style.transform=`scaleX(${combo.fraction})`;
    this.element.dataset.boosted=String(combo.multiplier>1);
  }
}
