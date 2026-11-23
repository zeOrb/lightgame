const fs=require('node:fs');
const path=require('node:path');
function loadGraphics(file){try{const data=JSON.parse(fs.readFileSync(file,'utf8'));return {vsync:data?.vsync!==false};}catch{return {vsync:true};}}
function saveGraphics(file,vsync){
  if(typeof vsync!=='boolean')throw new Error('Invalid VSync setting');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file+'.tmp',JSON.stringify({vsync}));fs.renameSync(file+'.tmp',file);
}
const vsyncSwitches=vsync=>vsync?[]:['disable-gpu-vsync','disable-frame-rate-limit'];
const relaunchArgs=args=>args.filter(arg=>!/^--(?:disable-gpu-vsync|disable-frame-rate-limit)(?:=|$)/.test(arg));
module.exports={loadGraphics,saveGraphics,vsyncSwitches,relaunchArgs};
