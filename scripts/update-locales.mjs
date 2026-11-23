import {readFileSync,writeFileSync} from 'node:fs';
import {parseAst} from 'rollup/parseAst';
import gettext from 'gettext-parser';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const template=gettext.po.parse(read('locales/messages.pot'));
template.translations['']??={};
function add(text,reference){
  if(!/[А-Яа-яЁё]/.test(text)||/[<>]/.test(text))return;
  const old=template.translations[''][text];
  template.translations[''][text]={...old,msgid:text,msgstr:[''],comments:{reference}};
}
const files=['src/main.js','src/skill-tree.js','src/bestiary.js','src/shard-counter.js','src/level-diagnostics.js','src/threats.js'];
for(const file of files){
  const source=read(file),ast=parseAst(source);
  function visit(node){
    if(!node||typeof node!=='object')return;
    if(node.type==='Literal'&&typeof node.value==='string')add(node.value,file+':'+(source.slice(0,node.start).split('\n').length));
    for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);
  }
  visit(ast);
}
for(const file of ['index.html',...files])for(const match of read(file).matchAll(/data-i18n(?:-(?:aria-label|title|content))?="([^"]+)"/g))add(match[1],file);
for(const file of ['src/skill-tree.json','src/treasury-tree.json','src/enemies.json','src/collectibles.json','src/floors.json']){
  function visit(value){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(['name','description'].includes(key)&&typeof item==='string')add(item,file);else if(typeof item==='object')visit(item);}}
  visit(JSON.parse(read(file)));
}
writeFileSync(new URL('locales/messages.pot',root),gettext.po.compile(template));
for(const language of ['ru','en']){
  const po=gettext.po.parse(read(`locales/${language}.po`));
  for(const [context,entries] of Object.entries(template.translations)){
    po.translations[context]??={};
    for(const [id,entry] of Object.entries(entries)){
      if(!id)continue;
      po.translations[context][id]??={...entry,msgstr:[language==='ru'?id:'']};
      po.translations[context][id].comments={...po.translations[context][id].comments,reference:entry.comments?.reference};
    }
  }
  writeFileSync(new URL(`locales/${language}.po`,root),gettext.po.compile(po));
}
