const {contextBridge,ipcRenderer}=require('electron');
let windowFocused=false,receivedFocusEvent=false;
ipcRenderer.on('sunny:focus',(_event,value)=>{receivedFocusEvent=true;windowFocused=value===true;});
ipcRenderer.invoke('sunny:focused').then(value=>{if(!receivedFocusEvent)windowFocused=value===true;}).catch(()=>{});
contextBridge.exposeInMainWorld('sunnyDesktop',{
  getGraphics:()=>ipcRenderer.invoke('sunny:graphics'),
  setVsync:value=>ipcRenderer.invoke('sunny:vsync',value),
  restart:()=>ipcRenderer.invoke('sunny:restart'),
  toggleFullscreen:()=>ipcRenderer.invoke('sunny:toggle-fullscreen'),
  isFocused:()=>windowFocused,
  setDisplay:options=>ipcRenderer.invoke('sunny:display',options),
  minimize:()=>ipcRenderer.send('sunny:minimize'),
  close:()=>ipcRenderer.send('sunny:close'),
});
