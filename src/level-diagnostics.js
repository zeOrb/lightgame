const labels={windows:'витраж',loot:'лут',enemies:'враг',shadows:'тень',chests:'сундук',bottles:'бутылка',books:'книга',springboards:'пружинящая площадка',threats:'опасность'};
export function placementWarningText(warning){
  return 'Этаж «'+warning.floorId+'»: '+(labels[warning.category]??warning.category)+' №'+(warning.index+1)+', секция '+warning.fromOffset+' → '+warning.toOffset+'.';
}
export function showLevelDiagnostics(diagnostics){
  if(!diagnostics.length)return;
  const panel=document.createElement('details');panel.className='level-diagnostics';panel.open=true;
  const summary=document.createElement('summary');summary.textContent='Ошибки размещения исправлены: '+diagnostics.length;panel.appendChild(summary);
  const list=document.createElement('ul');
  for(const warning of diagnostics){const text=placementWarningText(warning),item=document.createElement('li');item.textContent=text;list.appendChild(item);console.warn('[Sunny: исправлена ошибка уровня]',text,warning);}
  panel.appendChild(list);
  const close=document.createElement('button');close.type='button';close.textContent='Закрыть';close.addEventListener('click',()=>panel.remove());panel.appendChild(close);
  panel.setAttribute('aria-label','Автоматические исправления уровня');document.body.appendChild(panel);
}
