import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import gettext from 'gettext-parser';
import {readCatalogGroup} from './locale-categories.mjs';

export const localesDirectory=fileURLToPath(new URL('../locales/',import.meta.url));
const destination=new URL('../src/locales.generated.json',import.meta.url);
export function parseCatalog(source){
  const po=gettext.po.parse(source,{validation:true}),entries=new Map();
  for(const [context,translations] of Object.entries(po.translations)){
    for(const entry of Object.values(translations)){
      if(!entry.msgid)continue;
      const key=context||entry.msgid;
      if(entries.has(key))throw new Error(`Duplicate translation key: ${key}`);
      if(entry.msgid_plural)throw new Error(`Plural messages need a plural-aware UI call: ${context}`);
      const fuzzy=entry.comments?.flag?.split(',').some(flag=>flag.trim()==='fuzzy');
      entries.set(key,{source:entry.msgid,value:fuzzy?'':entry.msgstr[0]??''});
    }
  }
  return entries;
}
export function compileCatalogs(){
  const template=parseCatalog(gettext.po.compile(readCatalogGroup(path.join(localesDirectory,'templates'),'pot'))),messages={};
  for(const language of readdirSync(localesDirectory,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&entry.name!=='templates').map(entry=>entry.name).sort()){
    const file=language+'/*.po',catalog=parseCatalog(gettext.po.compile(readCatalogGroup(path.join(localesDirectory,language),'po')));
    messages[language]={};
    for(const [key,entry] of catalog){
      if(!template.has(key))throw new Error(`${file}: unknown msgctxt ${key}`);
      if(template.get(key).source!==entry.source)throw new Error(`${file}: outdated msgid for ${key}; update from templates/*.pot`);
      const placeholders=text=>[...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort().join(',');
      if(entry.value&&placeholders(entry.value)!==placeholders(entry.source))throw new Error(`${file}: changed placeholders in ${key}`);
    }
    for(const [key,entry] of template){
      const translated=catalog.get(key)?.value;
      // English msgid is authoritative; unfinished/fuzzy translations fall back to it.
      messages[language][key]=language==='en'?entry.source:translated||entry.source;
    }
  }
  if(!messages.ru||!messages.en)throw new Error('Both ru/ and en/ PO catalogs are required');
  const json=JSON.stringify(messages,null,2)+'\n';
  let previous;try{previous=readFileSync(destination,'utf8');}catch{}
  if(previous!==json)writeFileSync(destination,json);
  return messages;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))compileCatalogs();
