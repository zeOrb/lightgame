import {readdir} from 'node:fs/promises';
import path from 'node:path';

// Game packages must never contain the local feedback tool or its private records.
export async function assertGameArtifacts(directory){
  async function inspect(folder){
    for(const entry of await readdir(folder,{withFileTypes:true})){
      const name=entry.name.toLowerCase(),full=path.join(folder,entry.name);
      if(name==='feedback'||name==='feedback-server.mjs'||name==='feedback-sunny.bat'||/^cards\.json(?:\.|$)/.test(name))throw new Error('Local feedback files must not enter a game build: '+full);
      if(entry.isDirectory())await inspect(full);
    }
  }
  await inspect(directory);
}
