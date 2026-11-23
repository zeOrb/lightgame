import {PAD_DEFAULTS} from './gamepad-input.js';
import {gamepadIcon} from './gamepad-icons.js';
import {normalizeSettings,assignBinding,canonicalKey,DEFAULT_BINDINGS,RESOLUTIONS} from './settings-store.js';
import {translate,setLanguage,localizeDOM,tr} from './i18n.js';
import './settings.css';
import './gold-controls.css';
const STORAGE='sunny.settings.v1';
let raw;try{raw=JSON.parse(localStorage.getItem(STORAGE)||'{}');}catch{}
export const preferences=normalizeSettings(raw);
setLanguage(preferences.language);
export const mapGameKey=code=>canonicalKey(preferences,code);
export const t=key=>translate(preferences.language,key);
export function initializeSettings({onOpen,onClose,onChange}){
  let currentTab='game',returnFocus=null,capture=null,controlDevice='keyboard',padConnected=false;
  let nativeGraphics=null;
  const root=document.createElement('section');root.id='settings';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  document.body.append(root);
  if(window.sunnyDesktop){
    const bar=document.createElement('div');bar.id='desktop-bar';bar.innerHTML='<span>Sunny</span><button aria-label="Minimize">−</button><button aria-label="Close">×</button>';
    bar.children[1].onclick=()=>window.sunnyDesktop.minimize();bar.children[2].onclick=()=>window.sunnyDesktop.close();document.body.append(bar);
    const updateBar=()=>{bar.hidden=preferences.mode!=='windowed'||!!document.fullscreenElement;};updateBar();addEventListener('resize',updateBar);
  }
  const persist=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(preferences));}catch{}onChange?.(preferences);};
  const button=(id,label,parent)=>{const b=document.createElement('button');b.id=id;b.textContent=t(label);b.type='button';parent.append(b);return b;};
  const introButton=button('intro-settings','settings',document.querySelector('#intro .menu-actions'));
  document.getElementById('start').after(introButton);
  const pauseButton=button('pause-settings','settings',document.querySelector('#modal .menu-actions'));
  document.getElementById('main-menu').before(pauseButton);
  const localize=()=>{
    setLanguage(preferences.language);localizeDOM();
    document.documentElement.lang=preferences.language;
    for(const [id,key] of Object.entries({start:'start',resume:'resume',restart:'restart','main-menu':'menu','intro-settings':'settings','pause-settings':'settings'}))document.getElementById(id).textContent=t(key);
  };
  function close(){capture=null;root.hidden=true;onClose?.();returnFocus?.focus();}
  function render(){
    const scrollTop=root.querySelector('.settings-card')?.scrollTop??0;
    root.dataset.tab=currentTab;
    root.innerHTML=`<div class="settings-card"><h2>${t('settings')}</h2><div class="menu-divider"></div><nav role="tablist"></nav><div class="settings-content" role="tabpanel"></div><p class="settings-status" role="status"></p><div class="settings-actions"><button class="settings-apply">${t('apply')}</button><button class="settings-back">${t('backButton')}</button></div></div>`;
    root.setAttribute('aria-label',t('settings'));
    const tabs=root.querySelector('nav'),body=root.querySelector('.settings-content');
    let displayMode=preferences.mode,displayResolution=preferences.resolution,displayVsync=preferences.vsync;
    for(const tab of ['game','graphics','sounds','controls']){const b=button('settings-tab-'+tab,tab,tabs);b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===currentTab));b.onclick=()=>{capture=null;currentTab=tab;render();root.querySelector('#settings-tab-'+tab).focus();};}
    body.setAttribute('aria-labelledby','settings-tab-'+currentTab);
    const row=(label,control)=>{
      const line=document.createElement('div');line.className='settings-row';
      const field=control.matches('select,input');const text=document.createElement(field?'label':'span');text.textContent=t(label);
      if(field){control.id='settings-field-'+label;text.htmlFor=control.id;}
      else{line.setAttribute('role','group');line.setAttribute('aria-label',t(label));}
      line.append(text,control);body.append(line);
    };
    const select=(options,value)=>{
      const s=document.createElement('select');
      for(const [v,label] of options)s.add(new Option(label,v));
      s.value=value;
      // A label may forward CSS :hover to its select even outside its bounds.
      s.onpointerenter=e=>{const r=s.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom)s.dataset.pointerHover='';};
      s.onpointerleave=()=>delete s.dataset.pointerHover;
      return s;
    };
    const note=text=>{const p=document.createElement('p');p.className='settings-note';p.textContent=text;body.append(p);};
    if(currentTab==='game'){
      const language=select([['ru','Русский'],['en','English']],preferences.language);row('language',language);
      language.onchange=()=>{preferences.language=language.value;persist();localize();render();};note(t('languageNote'));
    }
    if(currentTab==='graphics'){
      const native=!!window.sunnyDesktop;
      const mode=select((native?['windowed','borderless','fullscreen']:['windowed','fullscreen']).map(v=>[v,t(v)]),preferences.mode);
      const resolution=select(RESOLUTIONS.map(v=>[v,v==='auto'?t('auto'):v.replace('x',' × ')]),preferences.resolution);
      row('mode',mode);row('resolution',resolution);if(!native)note(t('browser'));
      mode.onchange=()=>{displayMode=mode.value;};resolution.onchange=()=>{displayResolution=resolution.value;};
      const vsync=select([['on',tr('On')],['off',tr('Off')]],native?(preferences.vsync?'on':'off'):'on');
      vsync.disabled=!native||!nativeGraphics;row('VSync',vsync);
      vsync.onchange=()=>{displayVsync=vsync.value==='on';};
      note(native?tr('Changing VSync requires restarting the game.'):tr('VSync is controlled by the browser.'));
    }
    if(currentTab==='sounds'){
      const range=document.createElement('input');range.type='range';range.min=0;range.max=100;range.value=Math.round(preferences.volume*100);range.style.setProperty('--volume-progress',range.value+'%');row('volume',range);
      const value=document.createElement('output');value.textContent=range.value+'%';body.append(value);
      range.oninput=()=>{preferences.volume=Number(range.value)/100;range.style.setProperty('--volume-progress',range.value+'%');value.textContent=range.value+'%';persist();};
    }
    if(currentTab==='controls'){
      const device=select([['keyboard',t('keyboard')],['xbox','Xbox'],['playstation','PlayStation']],controlDevice);row('device',device);
      device.onchange=()=>{capture=null;controlDevice=device.value;render();};
      if(controlDevice!=='keyboard'){note(t(padConnected?'padConnected':'padDisconnected'));body.lastElementChild.dataset.padStatus='';}
      const bindings=controlDevice==='keyboard'?preferences.bindings:preferences.gamepads[controlDevice];
      for(const action of Object.keys(DEFAULT_BINDINGS)){
        const group=document.createElement('span');group.className='settings-bindings';
        for(let slot=0;slot<2;slot++){
          const b=document.createElement('button');if(controlDevice==='keyboard')b.textContent=keyName(bindings[action][slot]);
          else{
            b.className='gamepad-binding';const url=gamepadIcon(controlDevice,bindings[action][slot]);
            if(url){const image=document.createElement('img');image.src=url;image.alt=bindings[action][slot];b.append(image);}else{
              b.classList.add('gamepad-add');b.innerHTML='<span class="gamepad-add-square" aria-hidden="true">+</span>';
            }
            b.title=t(action)+' · '+(bindings[action][slot]??'—');
          }
          b.setAttribute('aria-label',t(action)+' '+(slot+1)+(controlDevice!=='keyboard'&&!bindings[action][slot]?' · '+t('addBinding'):''));
          b.onclick=()=>{capture={action,slot,device:controlDevice};root.querySelectorAll('.is-binding').forEach(el=>el.classList.remove('is-binding'));b.classList.add('is-binding');if(controlDevice==='keyboard')b.textContent=t('press');root.querySelector('.settings-status').textContent=t(controlDevice==='keyboard'?'cancel':'padPress');};group.append(b);
        }row(action,group);
      }
      button('settings-reset','reset',body).onclick=()=>{if(controlDevice==='keyboard')preferences.bindings=structuredClone(DEFAULT_BINDINGS);else preferences.gamepads[controlDevice]=structuredClone(PAD_DEFAULTS);persist();capture=null;render();};
    }
    const apply=root.querySelector('.settings-apply');
    apply.onclick=async()=>{apply.disabled=true;try{
      if(currentTab==='graphics'){
        if(window.sunnyDesktop)await window.sunnyDesktop.setDisplay({mode:displayMode,resolution:displayResolution});
        else if(displayMode==='fullscreen'&&!document.fullscreenElement)await document.documentElement.requestFullscreen();
        else if(displayMode==='windowed'&&document.fullscreenElement)await document.exitFullscreen();
        preferences.mode=displayMode;preferences.resolution=displayResolution;
        if(window.sunnyDesktop?.setVsync){nativeGraphics=await window.sunnyDesktop.setVsync(displayVsync);preferences.vsync=nativeGraphics.vsync;}
      }
      persist();
      const bar=document.getElementById('desktop-bar');if(bar)bar.hidden=preferences.mode!=='windowed';
      root.querySelector('.settings-status').textContent=t('saved');
      offerRestart();
    }catch{root.querySelector('.settings-status').textContent=t('failed');}finally{apply.disabled=false;}};
    root.querySelector('.settings-back').onclick=close;
    root.querySelector('.settings-card').scrollTop=scrollTop;
    offerRestart();
  }
  function offerRestart(){
    const existing=root.querySelector('.settings-restart');
    if(currentTab!=='graphics'||!nativeGraphics?.restartRequired){existing?.remove();return;}
    root.querySelector('.settings-status').textContent=tr('VSync saved. Restart the game to apply.');
    if(!existing){const b=document.createElement('button');b.className='settings-restart';b.textContent=tr('Restart game');b.onclick=()=>window.sunnyDesktop.restart();root.querySelector('.settings-actions').prepend(b);}
  }
  function open(){returnFocus=document.activeElement;onOpen?.();root.hidden=false;render();root.querySelector('[role=tab][aria-selected=true]').focus();}
  introButton.onclick=pauseButton.onclick=open;
  root.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;const focusables=[...root.querySelectorAll('button:not(:disabled),select,input')];const i=focusables.indexOf(document.activeElement);
    if(e.shiftKey&&i===0){e.preventDefault();focusables.at(-1).focus();}else if(!e.shiftKey&&i===focusables.length-1){e.preventDefault();focusables[0].focus();}
  });
  addEventListener('keydown',e=>{if(root.hidden)return;if(capture)return;if(e.code==='Tab')e.stopImmediatePropagation();
    if(!capture&&e.code==='Tab'){
      const items=[...root.querySelectorAll('button:not(:disabled),select,input')];const i=items.indexOf(document.activeElement);
      if(e.shiftKey&&i===0){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&i===items.length-1){e.preventDefault();items[0].focus();}
    }

  },true);
  localize();onChange?.(preferences);
  if(window.sunnyDesktop?.getGraphics)window.sunnyDesktop.getGraphics().then(value=>{
    nativeGraphics=value;preferences.vsync=value.vsync;persist();if(!root.hidden)render();
  }).catch(()=>{});
  if(window.sunnyDesktop)window.sunnyDesktop.setDisplay({mode:preferences.mode,resolution:preferences.resolution}).catch(()=>{});
  return {get isOpen(){return !root.hidden;},get isCapturing(){return !!capture;},close,captureRaw(control){
    if(!capture||control.device!=='keyboardMouse')return false;
    if(control.code==='Escape'){capture=null;render();return true;}
    if(capture.device!=='keyboard')return true;
    if(control.repeat)return true;
    if(!['F11','F5','MetaLeft','MetaRight','Unidentified'].includes(control.code)){
      assignBinding(preferences.bindings,capture.action,capture.slot,control.code);persist();
    }
    capture=null;render();return true;
  },handleInput(sample){
    padConnected=sample.connected;
    const status=root.querySelector('[data-pad-status]');if(status)status.textContent=t(padConnected?'padConnected':'padDisconnected');
    if(root.hidden)return false;
    if(capture&&capture.device!=='keyboard'){
      const code=sample.tokens[0];
      if(code){assignBinding(preferences.gamepads[capture.device],capture.action,capture.slot,code);capture=null;persist();render();}
      return true;
    }
    if(capture)return true;
    const ui=sample.uiPressed;
    if(ui.has('cancel')||ui.has('menu')||sample.pressed.has('pause')){close();return true;}
    const horizontal=ui.has('right')?1:ui.has('left')?-1:0;
    if(horizontal){
      const tabs=['game','graphics','sounds','controls'];
      currentTab=tabs[(tabs.indexOf(currentTab)+horizontal+tabs.length)%tabs.length];
      render();root.querySelector('#settings-tab-'+currentTab).focus({preventScroll:true});
      return true;
    }
    const direction=ui.has('down')?1:ui.has('up')?-1:0;
    if(direction){
      const items=[...root.querySelectorAll('.settings-content button:not(:disabled),.settings-content select,.settings-content input,.settings-actions button:not(:disabled)')];
      const i=items.indexOf(document.activeElement);
      items[i<0?(direction>0?0:items.length-1):(i+direction+items.length)%items.length]?.focus();
    }
    if(ui.has('submit')&&document.activeElement?.tagName==='BUTTON')document.activeElement.click();
    return true;
  }};
}
export function keyName(code){return code?code.replace(/^Key|^Digit/,'').replace('Arrow','').replace('ShiftLeft','L Shift').replace('ShiftRight','R Shift').replace('Space','Space'):'—';}
