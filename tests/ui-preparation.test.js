import test from 'node:test';
import assert from 'node:assert/strict';
import {UIPreparation} from '../src/ui-preparation.js';

test('UI preparation shares work, preserves order and caches readiness',async()=>{
  const calls=[],job=new UIPreparation([()=>calls.push('assets'),async()=>calls.push('shell'),()=>calls.push('tree')]);
  const first=job.prepare();assert.equal(job.state,'loading');assert.equal(job.prepare(),first);
  await first;assert.deepEqual(calls,['assets','shell','tree']);assert.equal(job.state,'ready');
  await job.prepare();assert.equal(calls.length,3);
});
test('failed UI preparation can retry without reporting ready',async()=>{
  let fail=true;const job=new UIPreparation([()=>{if(fail)throw Error('decode');}]);
  await assert.rejects(job.prepare(),/decode/);assert.equal(job.state,'failed');
  fail=false;await job.prepare();assert.equal(job.state,'ready');
});
