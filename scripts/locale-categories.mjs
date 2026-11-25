import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import gettext from 'gettext-parser';

export const CATALOG_CATEGORIES=Object.freeze({
  buttons:'Кнопки и меню',settings:'Настройки и управление',
  skills:'Навыки: названия и описания',
  gameplay:'Игровые сообщения и HUD',bestiary:"Bestiary",
  terms:'Игровые термины и характеристики',
});
const names=new Set(),descriptions=new Set(),skillOrder=new Map(),sharedDescriptions=new Map();
let nextSkillOrder=0;
for(const file of ['skill-tree.json','treasury-tree.json']){
  const config=JSON.parse(readFileSync(new URL('../src/'+file,import.meta.url),'utf8'));
  for(const node of [config.root,...config.branches.flatMap(branch=>[branch,...branch.nodes])]){
    if(node.name)names.add(node.name);if(node.description)descriptions.add(node.description);
    if(node.name&&!skillOrder.has(node.name))skillOrder.set(node.name,nextSkillOrder++);
    if(node.description){
      if(skillOrder.has(node.description)){
        const key=`skill.${node.id}.description`;sharedDescriptions.set(key,node.description);skillOrder.set(key,nextSkillOrder++);
      }else skillOrder.set(node.description,nextSkillOrder++);
    }
  }
}
const buttons=new Set(['addBinding','settings','backButton','apply','reset','start','resume','restart','menu',
  'Restart game',
  "Preparing run…","☀ To the sun","Skill tree","Light tree","Next run →","Bestiary",
  "Close","Main menu","SUN","BUNNY","Actions","Start run","Reset points and learned skills",
  "Reset skill tree · debug","Boss fight · debug","Enable sound","Sound: off · debug",
  "Pause","Pause menu","Resume","Restart run","Return to main menu","Back to menu · Esc"]);
export function categoryForEntry(entry){
  if(entry.msgctxt?.startsWith('term.'))return 'terms';
  if(sharedDescriptions.has(entry.msgctxt)||descriptions.has(entry.msgid)||names.has(entry.msgid))return 'skills';
  if(buttons.has(entry.msgctxt||entry.msgid))return 'buttons';
  if(entry.msgctxt?.startsWith('hud.'))return 'gameplay';
  if(entry.msgctxt)return 'settings';
  if(entry.comments?.reference?.includes('src/settings.js'))return 'settings';
  if(entry.comments?.reference?.includes('src/bestiary.js')||entry.comments?.reference?.includes('src/enemies.json'))return 'bestiary';
  return 'gameplay';
}
export function readCatalogGroup(directory,extension){
  let merged;
  for(const category of Object.keys(CATALOG_CATEGORIES)){
    const file=path.join(directory,category+'.'+extension),po=gettext.po.parse(readFileSync(file),{validation:true});
    merged??={...po,translations:{}};
    for(const [context,entries] of Object.entries(po.translations)){
      merged.translations[context]??={};
      for(const [id,entry] of Object.entries(entries)){
        if(!id){merged.translations[context][id]??=entry;continue;}
        if(merged.translations[context][id])throw new Error(`${file}: duplicate translation across categories: ${context||id}`);
        merged.translations[context][id]=entry;
      }
    }
  }
  return merged;
}
export function writeCatalogGroup(directory,extension,po){
  mkdirSync(directory,{recursive:true});
  // A reused description gets a standard gettext context so both skills retain a pair.
  for(const [context,source] of sharedDescriptions){
    po.translations[context]??={};
    if(!po.translations[context][source]){
      const original=po.translations['']?.[source];
      if(original)po.translations[context][source]={...original,msgctxt:context};
    }
  }
  for(const [category,label] of Object.entries(CATALOG_CATEGORIES)){
    const group={...po,headers:{...po.headers,'X-Sunny-Category':label},translations:{'':{}}};
    if(po.translations['']?.[''])group.translations['']['']=po.translations[''][''];
    for(const [context,entries] of Object.entries(po.translations))for(const [id,entry] of Object.entries(entries)){
      if(!id||categoryForEntry(entry)!==category)continue;
      group.translations[context]??={};group.translations[context][id]=entry;
    }
    const order=entry=>skillOrder.get(entry.msgctxt||entry.msgid)??Number.MAX_SAFE_INTEGER;
    const sort=category==='skills'?(a,b)=>order(a)-order(b):true;
    writeFileSync(path.join(directory,category+'.'+extension),gettext.po.compile(group,{sort}));
  }
}
