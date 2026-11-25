import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assertGameArtifacts} from '../scripts/game-artifact-policy.mjs';
test('game build guard rejects local feedback tools and records',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'sunny-build-policy-'));
  try{
    await writeFile(path.join(dir,'index.html'),'game');await assertGameArtifacts(dir);
    for(const name of ['feedback-server.mjs','feedback-sunny.bat','cards.json','cards.json.backup']){
      const file=path.join(dir,name);await writeFile(file,'private');await assert.rejects(assertGameArtifacts(dir),/feedback files/);await rm(file);
    }
    await mkdir(path.join(dir,'feedback'));await assert.rejects(assertGameArtifacts(dir),/feedback files/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
