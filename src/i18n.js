import catalogs from './locales.generated.json' with {type:'json'};
export const messages=catalogs;
export const translate=(language,key,values={})=>(messages[language]?.[key]??messages.ru[key]??messages.en[key]??key).replace(/\{(\w+)\}/g,(match,name)=>Object.hasOwn(values,name)?String(values[name]):match);
let language='ru';
const listeners=new Set();
export const tr=(key,values)=>translate(language,key,values);
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
