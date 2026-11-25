import {translateParts,getLanguage,GAME_TERMS} from './i18n.js';

// Only DOM text nodes are created. PO strings and runtime values cannot inject HTML.
export function renderLocalized(element,key,values={},highlight=true){
  const fragment=document.createDocumentFragment();
  for(const part of translateParts(getLanguage(),key,values)){
    if(part.term&&highlight){const node=document.createElement('strong');node.className='game-term';node.dataset.term=part.term;node.style.setProperty('--term-color',GAME_TERMS[part.term].color);node.textContent=part.text;fragment.append(node);}
    else fragment.append(document.createTextNode(part.text));
  }
  element.replaceChildren(fragment);return element;
}
