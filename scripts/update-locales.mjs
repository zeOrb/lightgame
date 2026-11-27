import {readFileSync} from 'node:fs';
import {parseAst} from 'rollup/parseAst';
import {readCatalogGroup,writeCatalogGroup} from './locale-categories.mjs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const template=readCatalogGroup(fileURLToPath(new URL('locales/templates/',root)),'pot');
template.translations['']??={};
for(const [id,term] of Object.entries(JSON.parse(read('src/game-terms.json')))){
  const context='term.'+id;template.translations[context]??={};
  template.translations[context][term.source]={msgctxt:context,msgid:term.source,msgstr:[''],comments:{reference:'src/game-terms.json',extracted:'Use {'+id+'} in messages. Lowercase aliases are also supported; explicit runtime values take precedence.'}};
}
function add(text,reference){
  if(!text||/[<>]/.test(text))return;
  if(/[А-Яа-яЁё]/.test(text))throw new Error(`Localization source must be English: ${reference}: ${text}`);
  // Explicit contexts are runtime keys, not new source strings.
  if(template.translations[text])return;
  const old=template.translations[''][text];
  template.translations[''][text]={...old,msgid:text,msgstr:[''],comments:{...old?.comments,reference}};
}
const files=['src/debug-options.js','src/run-statistics.js','src/run-summary.js','src/settings.js','src/run-item-ui.js','src/combo-hud.js','src/tower-descent-hud.js','src/main.js','src/skill-tree.js','src/bestiary.js','src/shard-counter.js','src/level-diagnostics.js','src/threats.js'];
for(const file of files){
  const source=read(file),ast=parseAst(source);
  function visit(node){
    if(!node||typeof node!=='object')return;
    const reference=file+':'+(source.slice(0,node.start).split('\n').length);
    if(node.type==='Literal'&&typeof node.value==='string'&&template.translations[''][node.value])add(node.value,reference);
    if(node.type==='CallExpression'&&['tr','toastLocalized'].includes(node.callee?.name)){
      const collect=value=>{if(value?.type==='Literal'&&typeof value.value==='string')add(value.value,reference);else if(value?.type==='ConditionalExpression'){collect(value.consequent);collect(value.alternate);}};
      collect(node.arguments[0]);
    }
    if(node.type==='Property'&&['name','hint'].includes(node.key?.name)&&typeof node.value?.value==='string')add(node.value.value,reference);
    for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);
  }
  visit(ast);
}
for(const file of ['index.html',...files])for(const match of read(file).matchAll(/data-i18n(?:-(?:aria-label|title|content))?="([^"]+)"/g))add(match[1],file);
for(const file of ['src/run-items.json','src/skill-tree.json','src/treasury-tree.json','src/enemies.json','src/collectibles.json','src/floors.json']){
  function visit(value){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(['name','description'].includes(key)&&typeof item==='string')add(item,file);else if(typeof item==='object')visit(item);}}
  visit(JSON.parse(read(file)));
}
writeCatalogGroup(fileURLToPath(new URL('locales/templates/',root)),'pot',template);
for(const language of ['ru','en']){
  const po=readCatalogGroup(fileURLToPath(new URL(`locales/${language}/`,root)),'po');
  for(const [context,entries] of Object.entries(template.translations)){
    po.translations[context]??={};
    for(const [id,entry] of Object.entries(entries)){
      if(!id)continue;
      po.translations[context][id]??={...entry,msgstr:[language==='en'?id:'']};
      po.translations[context][id].comments={...po.translations[context][id].comments,reference:entry.comments?.reference};
    }
  }
  writeCatalogGroup(fileURLToPath(new URL(`locales/${language}/`,root)),'po',po);
}
