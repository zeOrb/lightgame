import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {normalizeSettings} from '../src/settings-store.js';
const {loadGraphics,saveGraphics,vsyncSwitches,relaunchArgs}=createRequire(import.meta.url)('../electron/graphics.cjs');
test('VSync defaults on, persists between launches and rejects malformed settings',()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'sunny-graphics-')),file=path.join(directory,'graphics.json');
 try{
  assert.equal(loadGraphics(file).vsync,true);
  saveGraphics(file,false);assert.equal(loadGraphics(file).vsync,false);
  assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),{vsync:false});
  saveGraphics(file,true);assert.equal(loadGraphics(file).vsync,true);
  assert.throws(()=>saveGraphics(file,'off'),/Invalid/);
  writeFileSync(file,'broken');assert.equal(loadGraphics(file).vsync,true);
 }finally{rmSync(directory,{recursive:true,force:true});}
 assert.equal(normalizeSettings({vsync:false}).vsync,false);
 assert.equal(normalizeSettings({vsync:'bad'}).vsync,true);
});
test('turning VSync back on does not inherit the old disabling flags on relaunch',()=>{
 assert.deepEqual(vsyncSwitches(true),[]);
 assert.deepEqual(vsyncSwitches(false),['disable-gpu-vsync','disable-frame-rate-limit']);
 assert.deepEqual(relaunchArgs(['app','--disable-gpu-vsync','--disable-frame-rate-limit=1','--seed=demo']),['app','--seed=demo']);
});
