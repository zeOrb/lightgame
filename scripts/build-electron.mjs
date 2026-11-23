import {mkdir,cp,writeFile,readFile,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {packager} from '@electron/packager';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const buildsRoot=path.join(root,'launchers','builds');
await mkdir(buildsRoot,{recursive:true});
let number=1+Math.max(0,...(await readdir(buildsRoot)).map(name=>Number(/^Build-(\d+)$/.exec(name)?.[1]??0)));
let destination,buildName;
// Reserve each number atomically so simultaneous builds cannot overwrite one another.
for(;;number++){
  buildName=`Build-${String(number).padStart(4,'0')}`;
  destination=path.join(buildsRoot,buildName);
  try{await mkdir(destination);break;}catch(error){if(error.code!=='EEXIST')throw error;}
}
const stage=path.join(root,'output','electron-staging',buildName);
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const electron=JSON.parse(await readFile(path.join(root,'node_modules','electron','package.json'),'utf8'));
await mkdir(stage,{recursive:true});
await cp(path.join(root,'dist'),path.join(stage,'data'),{recursive:true});
await cp(path.join(root,'electron','main.cjs'),path.join(stage,'main.cjs'));
await cp(path.join(root,'electron','preload.cjs'),path.join(stage,'preload.cjs'));
await cp(path.join(root,'electron','graphics.cjs'),path.join(stage,'graphics.cjs'));
await writeFile(path.join(stage,'package.json'),JSON.stringify({name:'sunny',productName:'Sunny',author:'Sunny',version:pkg.version,main:'main.cjs'},null,2));
const [built]=await packager({dir:stage,out:destination,name:'Sunny',executableName:'Sunny',
  platform:'win32',arch:'x64',electronVersion:electron.version,asar:false,prune:false,
  appVersion:pkg.version,buildVersion:`${pkg.version}.${number}`,win32metadata:{ProductName:'Sunny',FileDescription:`Sunny — ${buildName}`}});
const locales=path.join(built,'locales');
const keptLocales=new Set(['ru.pak','en-US.pak']);
for(const entry of await readdir(locales,{withFileTypes:true})){
  if(entry.isFile()&&entry.name.endsWith('.pak')&&!keptLocales.has(entry.name)){
    await unlink(path.join(locales,entry.name));
  }
}
await writeFile(path.join(built,'START-HERE.txt'),
  'Sunny — тестовая сборка Windows x64\r\n\r\nРаспакуйте всю папку и запустите Sunny.exe.\r\nИнтернет, Node.js и сервер не нужны.\r\nF11 — полный экран. Esc — пауза.\r\nСохранения: %APPDATA%\\Sunny (отдельно от браузерной версии).\r\nНе удаляйте файлы рядом с Sunny.exe.\r\n');
await writeFile(path.join(built,'build-info.json'),JSON.stringify({number,buildName,stamp,version:pkg.version,locales:[...keptLocales]},null,2));
await writeFile(path.join(buildsRoot,'latest-build.json'),JSON.stringify({directory:built,stamp,number,buildName},null,2));
console.log(`Windows build: ${built}`);
