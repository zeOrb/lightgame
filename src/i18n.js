import catalogs from './locales.generated.json' with {type:'json'};
import terms from './game-terms.json' with {type:'json'};
export const messages=catalogs;
export const GAME_TERMS=terms;
const termIds=new Map(Object.keys(terms).flatMap(id=>[[id,id],[id.toLowerCase(),id]]));
export const term=id=>{const found=termIds.get(id);if(!found)throw Error('Unknown game term: '+id);return Object.freeze({term:found});};
const source=(language,key)=>messages[language]?.[key]??messages.en[key]??key;
const termText=(language,id)=>source(language,'term.'+id)===('term.'+id)?terms[id].source:source(language,'term.'+id);
export function translateParts(language,key,values={}){
  const parts=[],text=source(language,key),pattern=/\{(\w+)\}/g;let cursor=0;
  for(const match of text.matchAll(pattern)){
    if(match.index>cursor)parts.push({text:text.slice(cursor,match.index),term:null});
    const name=match[1],explicit=Object.hasOwn(values,name),value=values[name],id=explicit?(value&&typeof value==='object'?termIds.get(value.term):null):termIds.get(name);
    parts.push(id?{text:termText(language,id),term:id}:{text:explicit?String(value):match[0],term:null});cursor=match.index+match[0].length;
  }
  if(cursor<text.length)parts.push({text:text.slice(cursor),term:null});return parts;
}
export const translate=(language,key,values={})=>translateParts(language,key,values).map(part=>part.text).join('');
let language='ru';
const listeners=new Set();
export const tr=(key,values)=>translate(language,key,values);
export const skillDescriptionKey=skill=>Object.hasOwn(messages.en,`skill.${skill.id}.description`)?`skill.${skill.id}.description`:skill.description;
export const skillDescription=skill=>tr(skillDescriptionKey(skill));
export const getLanguage=()=>language;
export const onLanguageChange=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
export function setLanguage(value){
  const next=Object.hasOwn(messages,value)?value:'ru';if(next===language)return;
  language=next;for(const listener of listeners)listener(language);
}
export function localizeDOM(root=document){
  for(const element of root.querySelectorAll('[data-i18n]'))element.textContent=tr(element.dataset.i18n);
  for(const attribute of ['aria-label','title','content'])for(const element of root.querySelectorAll(`[data-i18n-${attribute}]`))element.setAttribute(attribute,tr(element.getAttribute(`data-i18n-${attribute}`)));
}
