const {app,BrowserWindow,session,ipcMain,screen}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

app.setName('Sunny');
function openGame(){
  const entry=path.join(__dirname,'data','index.html');
  const entryURL=pathToFileURL(entry).href;
  const window=new BrowserWindow({
    title:'Sunny — Солнечный зайчик',width:1440,height:900,minWidth:800,minHeight:600,
    backgroundColor:'#000000',show:false,autoHideMenuBar:true,frame:false,
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,preload:path.join(__dirname,'preload.cjs')},
  });
  window.removeMenu();
  let windowBounds=null;
  const allowed=event=>event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame;
  ipcMain.handle('sunny:focused',event=>allowed(event)&&window.isFocused());
  ipcMain.handle('sunny:toggle-fullscreen',event=>{if(allowed(event))window.setFullScreen(!window.isFullScreen());});
  for(const type of ['focus','blur'])window.on(type,()=>{
    if(!window.webContents.isDestroyed())window.webContents.send('sunny:focus',window.isFocused());
  });
  ipcMain.handle('sunny:display',async(event,options)=>{
    if(!allowed(event)||!options||!['windowed','borderless','fullscreen'].includes(options.mode)
      ||!['auto','1280x720','1600x900','1920x1080','2560x1440','3840x2160'].includes(options.resolution))throw new Error('Invalid display settings');
    const display=screen.getDisplayMatching(window.getBounds());
    if(options.mode!=='windowed'&&!window.isFullScreen()&&window.isResizable())windowBounds=window.getBounds();
    if(window.isFullScreen()&&options.mode!=='fullscreen'){
      await new Promise(resolve=>{window.once('leave-full-screen',resolve);window.setFullScreen(false);});
    }
    if(options.mode==='fullscreen')window.setFullScreen(true);
    else if(options.mode==='borderless'){window.setResizable(false);window.setBounds(display.bounds);}
    else{
      window.setResizable(true);
      const [width,height]=options.resolution==='auto'?[windowBounds?.width??1440,windowBounds?.height??900]:options.resolution.split('x').map(Number);
      window.setSize(Math.min(width,display.workArea.width),Math.min(height,display.workArea.height));window.center();windowBounds=window.getBounds();
    }
    return {mode:options.mode};
  });
  ipcMain.on('sunny:minimize',event=>{if(allowed(event))window.minimize();});
  ipcMain.on('sunny:close',event=>{if(allowed(event))window.close();});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{
    if(url.split('?')[0].split('#')[0]!==entryURL)event.preventDefault();
  });
  window.once('ready-to-show',()=>window.show());
  window.loadFile(entry);
}
app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  openGame();
});
app.on('window-all-closed',()=>app.quit());
