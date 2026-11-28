import {tr,onLanguageChange} from './i18n.js';
const labels={windows:"stained glass",loot:"loot",enemies:"enemy",shadows:"shadow",chests:"chest",bottles:"bottle",books:"book",springboards:"springboard",threats:"hazard"};
export function placementWarningText(warning){
  if(warning.code==='threat-count-adjusted')return tr("Floor “{floor}”: threat count reduced from {from} to {to} to satisfy placement rules.",{floor:warning.floorId,from:warning.fromCount,to:warning.toCount});
  return tr("Floor “{floor}”: {category} #{index}, section {from} → {to}.",{floor:warning.floorId,category:tr(labels[warning.category]??warning.category),index:warning.index+1,from:warning.fromOffset,to:warning.toOffset});
}
export function showLevelDiagnostics(diagnostics){
  if(!diagnostics.length)return;
  const panel=document.createElement('details');panel.className='level-diagnostics';panel.open=true;
  const summary=document.createElement('summary');summary.textContent=tr("Placement issues corrected: {count}",{count:diagnostics.length});panel.appendChild(summary);
  const list=document.createElement('ul');
  for(const warning of diagnostics){const text=placementWarningText(warning),item=document.createElement('li');item.textContent=text;list.appendChild(item);console.warn("[Sunny: level issue corrected]",text,warning);}
  panel.appendChild(list);
  const close=document.createElement('button');close.type='button';close.textContent=tr("Close");close.addEventListener('click',()=>{unsubscribe();panel.remove();});panel.appendChild(close);
  const unsubscribe=onLanguageChange(()=>{summary.textContent=tr("Placement issues corrected: {count}",{count:diagnostics.length});[...list.children].forEach((item,i)=>item.textContent=placementWarningText(diagnostics[i]));close.textContent=tr("Close");panel.setAttribute('aria-label',tr("Automatic level corrections"));});
  panel.setAttribute('aria-label',tr("Automatic level corrections"));document.body.appendChild(panel);
}
