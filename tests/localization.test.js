import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCatalog,compileCatalogs} from '../scripts/compile-locales.mjs';
import {messages,translate,tr,setLanguage,onLanguageChange} from '../src/i18n.js';
import {SKILLS} from '../src/progression.js';

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
    if(/[А-Яа-яЁё]/.test(text))assert.ok(messages.en[text],text);
    assert.doesNotMatch(translate('en',text),/[А-Яа-яЁё]/);
  }
  for(const entry of parseCatalog(readFileSync(new URL('../locales/en.po',import.meta.url))).values())assert.ok(entry.value,entry.source);
});

test('language switches notify screens once, substitute values safely and fall back',()=>{
  setLanguage('ru');let updates=0;const unsubscribe=onLanguageChange(()=>updates++);
  try{
    setLanguage('en');setLanguage('en');assert.equal(updates,1);
    assert.equal(tr('Этаж {floor} / {total}',{floor:2,total:10}),'Floor 2 / 10');
    assert.equal(tr('Изучи «{skill}»',{skill:'{unchanged}'}),'Learn “{unchanged}”');
    assert.equal(translate('unknown','settings'),'Настройки');
    assert.equal(tr('missing.key'),'missing.key');
    setLanguage('ru');assert.equal(tr('Арена'),'Арена');assert.equal(updates,2);
  }finally{unsubscribe();setLanguage('ru');}
});
