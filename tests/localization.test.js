import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCatalog,compileCatalogs} from '../scripts/compile-locales.mjs';
import {messages,translate,tr,setLanguage,onLanguageChange,skillDescription} from '../src/i18n.js';
import {SKILLS} from '../src/progression.js';
import gettext from 'gettext-parser';
import {fileURLToPath} from 'node:url';
import {CATALOG_CATEGORIES,readCatalogGroup,categoryForEntry} from '../scripts/locale-categories.mjs';

test('PO catalogs preserve multiline strings, escapes and contexts; fuzzy is not published',()=>{
  const entries=parseCatalog('msgctxt "hint"\nmsgid "Line\\n"\n"two"\nmsgstr "Строка\\n"\n"два"\n\n#, fuzzy\nmsgid "Draft"\nmsgstr "Черновик"\n');
  assert.equal(entries.get('hint').value,'Строка\nдва');
  assert.equal(entries.get('Draft').value,'');
  assert.throws(()=>parseCatalog('msgid "Broken'),/string|line|file/i);
  assert.throws(()=>parseCatalog('msgctxt "same"\nmsgid "One"\nmsgstr "1"\n\nmsgctxt "same"\nmsgid "Two"\nmsgstr "2"'),/Duplicate translation key/);
});

test('runtime catalogs match PO files and every gameplay skill has an English translation',()=>{
  assert.deepEqual(compileCatalogs(),messages);
  for(const skill of SKILLS)for(const text of [skill.name,skill.description,skill.branch]){
    assert.ok(messages.en[text],text);
    assert.doesNotMatch(translate('en',text),/[А-Яа-яЁё]/);
  }
  const english=readCatalogGroup(fileURLToPath(new URL('../locales/en/',import.meta.url)),'po');
  for(const entry of parseCatalog(gettext.po.compile(english)).values())assert.ok(entry.value,entry.source);
});

test('five PO categories keep every translation key in exactly one file',()=>{
  assert.equal(Object.keys(CATALOG_CATEGORIES).length,5);
  for(const language of ['ru','en','templates']){
    const extension=language==='templates'?'pot':'po',keys=new Set();
    for(const category of Object.keys(CATALOG_CATEGORIES)){
      const po=gettext.po.parse(readFileSync(new URL(`../locales/${language}/${category}.${extension}`,import.meta.url)),{validation:true});
      let count=0;
      for(const entries of Object.values(po.translations))for(const entry of Object.values(entries)){
        if(!entry.msgid)continue;
        assert.doesNotMatch(entry.msgid,/[А-Яа-яЁё]/,'PO source must be English');
        const key=entry.msgctxt||entry.msgid;assert.ok(!keys.has(key),key);keys.add(key);count++;
        assert.equal(categoryForEntry(entry),category,key);
      }
      assert.ok(count>0,category);
    }
    assert.equal(keys.size,Object.keys(messages.en).length);
  }
  assert.equal(categoryForEntry({msgid:'Warm Heart'}),'skills');
  assert.equal(categoryForEntry({msgid:'Maximum Light +25 HP.'}),'skills');
  assert.equal(categoryForEntry({msgctxt:'apply',msgid:'Apply'}),'buttons');
});

test('English msgid is the source and Russian remains its translation',()=>{
  assert.equal(translate('en','Warm Heart'),'Warm Heart');
  assert.equal(translate('ru','Warm Heart'),'Тёплое сердце');
  assert.equal(translate('ru','Maximum Light +25 HP.'),'Максимальный свет +25 HP.');
  assert.equal(translate('ru','Floor {floor} / {total}',{floor:2,total:10}),'Этаж 2 / 10');
  assert.equal(translate('ru','hud.jump'),'прыжок');
  assert.equal(translate('ru','jump'),'Прыжок');
});

test('language switches notify screens once, substitute values safely and fall back',()=>{
  setLanguage('ru');let updates=0;const unsubscribe=onLanguageChange(()=>updates++);
  try{
    setLanguage('en');setLanguage('en');assert.equal(updates,1);
    assert.equal(tr('Floor {floor} / {total}',{floor:2,total:10}),'Floor 2 / 10');
    assert.equal(tr('Learn “{skill}”',{skill:'{unchanged}'}),'Learn “{unchanged}”');
    assert.equal(translate('unknown','settings'),'Settings');
    assert.equal(tr('missing.key'),'missing.key');
    setLanguage('ru');assert.equal(tr('Arena'),'Арена');assert.equal(updates,2);
  }finally{unsubscribe();setLanguage('ru');}
});

test('every skill name is immediately followed by its description in both PO files and POT',()=>{
  for(const language of ['ru','en','templates']){
    const extension=language==='templates'?'pot':'po',source=readFileSync(new URL(`../locales/${language}/skills.${extension}`,import.meta.url),'utf8');
    const ordered=source.split(/\r?\n\r?\n+/).flatMap(block=>[...parseCatalog(block).keys()]);
    for(const skill of SKILLS){
      const contextual=`skill.${skill.id}.description`,description=ordered.includes(contextual)?contextual:skill.description;
      assert.equal(ordered[ordered.indexOf(skill.name)+1],description,`${language}: ${skill.id}`);
    }
  }
  setLanguage('en');
  try{for(const skill of SKILLS)assert.equal(skillDescription(skill),translate('en',skill.description));}
  finally{setLanguage('ru');}
});
