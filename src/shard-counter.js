import {tr,onLanguageChange} from './i18n.js';
import './shard-counter.css';
import {Color} from 'three';

export class ShardCounter {
  constructor(element,value=0){
    this.element=element;
    onLanguageChange(()=>element.setAttribute('aria-label',tr('Очки прогрессии: {points}',{points:this.value})));
    element.innerHTML='<svg class="shard-counter-icon" viewBox="0 0 24 28" aria-hidden="true"><path class="gem-body" d="M5 3h14l4 8-11 16L1 11z" stroke="#171512" stroke-width="2"/><path class="gem-seams" d="M5 3l7 8 7-8M1 11h22M12 11v16" fill="none" stroke-width="1.5"/><path class="gem-light" d="M5 3l7 8H1z"/></svg><span class="shard-counter-total">0</span><span class="shard-counter-gains" aria-hidden="true"></span>';
    element.setAttribute('role','status');element.setAttribute('aria-label',tr('Собрано бликов: {count}',{count:0}));
    this.number=element.querySelector('.shard-counter-total');this.gains=element.querySelector('.shard-counter-gains');this.reset(value);
  }
  add(amount,textColor='#fff7d7'){
    if(!(amount>0))return;
    const label=document.createElement('span');label.className='shard-counter-gain';label.textContent='+'+amount;this.gains.append(label);
    label.style.setProperty('--gain-color',textColor);
    const previous=this.active[this.active.length-1];
    this.active.push({amount,label,textColor,age:previous?Math.min(0,previous.age-.18):0});
  }
  update(dt){
    this.colorAge+=dt;
    if(this.tint&&this.colorAge>1){
      const t=Math.min(1,(this.colorAge-1)/.6),ease=t*t*(3-2*t);
      this.blended.copy(this.tint).lerp(this.defaultTint,ease);
      this.element.style.setProperty('--counter-color','#'+this.blended.getHexString());
      if(t>=1){this.tint=null;this.element.style.removeProperty('--counter-color');}
    }
    this.pulse=Math.max(0,this.pulse-dt);
    for(let i=this.active.length-1;i>=0;i--){
      const gain=this.active[i];gain.age+=dt;
      if(gain.age<0){gain.label.style.opacity=0;continue;}
      const t=Math.min(1,gain.age/.52),ease=t*t*(3-2*t);
      gain.label.style.transform=`translateY(${30*(1-ease)}px) scale(${.85+.15*ease})`;
      gain.label.style.opacity=String(Math.min(1,t/.14)*(1-Math.max(0,(t-.72)/.28)));
      if(t>=1){this.value+=gain.amount;this.number.textContent=this.value;this.tint=new Color(gain.textColor);this.colorAge=0;this.element.style.setProperty('--counter-color',gain.textColor);this.element.setAttribute('aria-label',tr('Очки прогрессии: {points}',{points:this.value}));this.pulse=.22;gain.label.remove();this.active.splice(i,1);}
    }
    this.element.style.setProperty('--pickup-pulse',Math.sin((1-this.pulse/.22)*Math.PI));
  }
  reset(value=0){this.value=value;this.pulse=0;this.colorAge=0;this.tint=null;this.defaultTint=new Color('#fff0be');this.blended=new Color();this.active=[];this.gains.replaceChildren();this.number.textContent=String(value);this.number.style.transform='';this.element.style.setProperty('--pickup-pulse',0);this.element.style.removeProperty('--counter-color');this.element.setAttribute('aria-label',tr('Очки прогрессии: {points}',{points:value}));}
}
