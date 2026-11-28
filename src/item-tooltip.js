import {tr} from './i18n.js';
import {renderLocalized} from './localized-text.js';
import {RunItemBranch} from './run-item-branch.js';
import './item-tooltip.css';
const branches=new WeakMap();
export function renderItemTooltip(element,item,rarity,count){
 element.classList.add('item-tooltip');element.style.setProperty('--item-color',rarity.color);element.style.setProperty('--rarity-color',rarity.color);
 const text=document.createElement('div');text.className='item-tooltip-text';const title=document.createElement('strong');title.textContent=tr(item.name);const label=document.createElement('small');label.className='item-tooltip-rarity';label.textContent=tr(rarity.name);const effect=document.createElement('div');effect.className='item-tooltip-effect';renderLocalized(effect,item.description);const amount=document.createElement('small');amount.className='item-tooltip-count';amount.textContent='×'+count;title.append(amount);text.append(title,label,effect);
 let branch=branches.get(element);if(!branch){branch=new RunItemBranch();branches.set(element,branch);}branch.reset();element.replaceChildren(text,branch.element);branch.setActive(true);
}
