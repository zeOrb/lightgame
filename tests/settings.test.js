import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSettings,assignBinding,canonicalKey} from '../src/settings-store.js';
import {messages,translate} from '../src/i18n.js';
test('settings validate damaged storage and keep keyboard controls isolated',()=>{
  const a=normalizeSettings(null),b=normalizeSettings({volume:9,mode:'wrong',resolution:'garbage'});
  assert.equal(b.volume,1);assert.equal(b.mode,'windowed');assert.equal(b.resolution,'auto');
  assignBinding(a.bindings,'jump',0,'KeyD');
  assert.equal(canonicalKey(a,'KeyD'),'Space');assert.equal(canonicalKey(a,'Space'),'KeyD');
  assert.equal(canonicalKey(b,'KeyD'),'KeyD');
  assignBinding(a.bindings,'jump',1,'KeyW');
  assert.equal(canonicalKey(a,'KeyW'),'Space');assert.equal(canonicalKey(a,'ArrowUp'),'KeyW');
  assert.equal(canonicalKey(a,'UnboundKey'),null);
});
test('English localization has all Russian settings keys and a fallback',()=>{
  assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages.ru).sort());
  assert.equal(translate('xx','settings'),'Settings');
});
