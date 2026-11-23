import {tr,onLanguageChange} from './i18n.js';
const labels={windows:'витраж',loot:'лут',enemies:'враг',shadows:'тень',chests:'сундук',bottles:'бутылка',books:'книга',springboards:'пружинящая площадка',threats:'опасность'};
export function placementWarningText(warning){
  return tr('Этаж «{floor}»: {category} №{index}, секция {from} → {to}.',{floor:warning.floorId,category:tr(labels[warning.category]??warning.category),index:warning.index+1,from:warning.fromOffset,to:warning.toOffset});
}
export function showLevelDiagnostics(diagnostics){
  if(!diagnostics.length)return;
  const panel=document.createElement('details');panel.className='level-diagnostics';panel.open=true;
  const summary=document.createElement('summary');summary.textContent=tr('Ошибки размещения исправлены: {count}',{count:diagnostics.length});panel.appendChild(summary);
  const list=document.createElement('ul');
  for(const warning of diagnostics){const text=placementWarningText(warning),item=document.createElement('li');item.textContent=text;list.appendChild(item);console.warn('[Sunny: исправлена ошибка уровня]',text,warning);}
  panel.appendChild(list);
  const close=document.createElement('button');close.type='button';close.textContent=tr('Закрыть');close.addEventListener('click',()=>{unsubscribe();panel.remove();});panel.appendChild(close);
  const unsubscribe=onLanguageChange(()=>{summary.textContent=tr('Ошибки размещения исправлены: {count}',{count:diagnostics.length});[...list.children].forEach((item,i)=>item.textContent=placementWarningText(diagnostics[i]));close.textContent=tr('Закрыть');panel.setAttribute('aria-label',tr('Автоматические исправления уровня'));});
  panel.setAttribute('aria-label',tr('Автоматические исправления уровня'));document.body.appendChild(panel);
}
