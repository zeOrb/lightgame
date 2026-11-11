import test from 'node:test';
import assert from 'node:assert/strict';
import {nextRunURL} from '../src/run-navigation.js';

test('next run keeps localhost and GitHub Pages paths, query settings and fragment',()=>{
  for(const address of ['http://127.0.0.1:5173/','https://zeorb.github.io/lightgame/?sound=off#play']){
    const before=new URL(address),after=new URL(nextRunURL(address,123));
    assert.equal(after.origin,before.origin);assert.equal(after.pathname,before.pathname);
    assert.equal(after.hash,before.hash);assert.equal(after.searchParams.get('sound'),before.searchParams.get('sound'));
    assert.equal(after.searchParams.get('sunny-run'),'123');
  }
  assert.equal(new URL(nextRunURL(nextRunURL('https://zeorb.github.io/lightgame/',1),2)).searchParams.getAll('sunny-run').length,1);
});
