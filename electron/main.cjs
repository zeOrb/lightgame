const {app,BrowserWindow,session}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

app.setName('Sunny');
function openGame(){
  const entry=path.join(__dirname,'data','index.html');
  const entryURL=pathToFileURL(entry).href;
  const window=new BrowserWindow({
    title:'Sunny — Солнечный зайчик',width:1440,height:900,minWidth:800,minHeight:600,
    backgroundColor:'#000000',show:false,autoHideMenuBar:true,
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true},
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{
    if(url.split('?')[0].split('#')[0]!==entryURL)event.preventDefault();
  });
  window.webContents.on('before-input-event',(event,input)=>{
    if(input.type==='keyDown'&&input.key==='F11'){
      event.preventDefault();window.setFullScreen(!window.isFullScreen());
    }
  });
  window.once('ready-to-show',()=>window.show());
  window.loadFile(entry);
}
app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  openGame();
});
app.on('window-all-closed',()=>app.quit());
