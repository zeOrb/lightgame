import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translate,translateParts,term,GAME_TERMS} from '../src/i18n.js';
import {categoryForEntry,readCatalogGroup} from '../scripts/locale-categories.mjs';
import {renderLocalized} from '../src/localized-text.js';

test('terms translate independently and work in plain messages and rich text tokens',()=>{
  assert.equal(translate('ru','{Dash} · {Light} · {Damage}'),'Дэш · Свет · Урон');
  assert.equal(translate('en','{Dash} · {Light}'),'Dash · Light');
  assert.deepEqual(translateParts('ru','{DashDistance} +15%.'),[{text:'Дальность дэша',term:'DashDistance'},{text:' +15%.',term:null}]);
  assert.deepEqual(translateParts('en','{name}: {count}',{name:term('Dash'),count:3}),[{text:'Dash',term:'Dash'},{text:': ',term:null},{text:'3',term:null}]);
});
test('runtime placeholders take precedence over terms and never become markup',()=>{
  assert.deepEqual(translateParts('ru','{damage} {name}',{damage:12,name:'<img src=x onerror=alert(1)>'}),[{text:'12',term:null},{text:' ',term:null},{text:'<img src=x onerror=alert(1)>',term:null}]);
  assert.equal(translate('ru','{dash} {unknown}'),'Дэш {unknown}');assert.throws(()=>term('not-a-term'),/Unknown/);
});
test('glossary entries live in the terms PO category with matching placeholders',()=>{
  const ru=readCatalogGroup('locales/ru','po');
  for(const [id,definition] of Object.entries(GAME_TERMS)){
    assert.match(definition.color,/^#[a-f0-9]{6}$/i);const entry=ru.translations['term.'+id][definition.source];
    assert.ok(entry.msgstr[0]);assert.equal(categoryForEntry(entry),'terms');
  }
});

test('rich labels create strong term nodes and keep supplied HTML as literal text',()=>{
  const previous=globalThis.document;
  globalThis.document={createDocumentFragment:()=>({children:[],append(node){this.children.push(node);}}),createElement:tag=>({tag,dataset:{},style:{setProperty(){}}}),createTextNode:text=>({text})};
  const target={replaceChildren(fragment){this.nodes=fragment.children;}};
  try{
    renderLocalized(target,'{Dash}: {name}',{name:'<b>literal</b>'});
    assert.equal(target.nodes[0].tag,'strong');assert.equal(target.nodes[0].dataset.term,'Dash');assert.deepEqual(target.nodes.at(-1),{text:'<b>literal</b>'});
    renderLocalized(target,'{Dash}',{},false);assert.equal(target.nodes[0].tag,undefined);assert.equal(target.nodes[0].text,'Дэш');
  }finally{globalThis.document=previous;}
});
