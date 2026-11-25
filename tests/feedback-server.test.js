import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

test('feedback persists cards, preserves a backup and rejects stale or foreign writes',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sunny-feedback-')),port=26000+Math.floor(Math.random()*20000),origin=`http://127.0.0.1:${port}`;
  let child;
  async function start(){child=spawn(process.execPath,[fileURLToPath(new URL('../scripts/feedback-server.mjs',import.meta.url))],{env:{...process.env,SUNNY_FEEDBACK_PORT:String(port),SUNNY_FEEDBACK_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Server exited');})]);}
  async function stop(){if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}}
  const post=(data,source=origin)=>fetch(origin+'/api/cards',{method:'POST',headers:{'Content-Type':'application/json',Origin:source},body:JSON.stringify(data)});
  try{
    await start();assert.equal((await (await fetch(origin+'/api/cards')).json()).cards.length,0);
    const data={author:'Тестер',text:'<script>не исполнять</script>',type:'bug',status:'new',build:'001',comment:''};
    assert.equal((await post(data,'https://example.com')).status,403);
    const created=await (await post(data)).json();assert.ok(created.id);
    const updated=await (await post({...created,status:'review'})).json();assert.equal(updated.status,'review');
    const rejected=await post({...created,status:'closed',updatedAt:'old'});assert.equal(rejected.status,400);
    const backup=JSON.parse(await fs.readFile(path.join(dir,'cards.json.backup'),'utf8'));assert.equal(backup.cards[0].status,'new');
    await stop();await start();const saved=await (await fetch(origin+'/api/cards')).json();assert.equal(saved.cards[0].status,'review');assert.equal(saved.cards[0].text,data.text);
    assert.equal((await fetch(origin+'/')).status,200);assert.equal((await fetch(origin+'/../package.json')).status,404);
  }finally{if(child)await stop();await fs.rm(dir,{recursive:true,force:true});}
});
