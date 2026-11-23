import {normalizePadBindings} from './gamepad-input.js';
export const DEFAULT_BINDINGS={left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],forward:['KeyW','ArrowUp'],back:['KeyS','ArrowDown'],jump:['Space'],dash:['ShiftLeft','ShiftRight'],flare:['KeyE'],pause:['Escape']};
export const ACTION_CODES={left:'KeyA',right:'KeyD',forward:'KeyW',back:'KeyS',jump:'Space',dash:'ShiftLeft',flare:'KeyE',pause:'Escape'};
export const RESOLUTIONS=['auto','1280x720','1600x900','1920x1080','2560x1440','3840x2160'];
export function normalizeSettings(raw={}){
  if(!raw||typeof raw!=='object')raw={};
  const result={vsync:raw.vsync!==false,language:raw.language==='en'?'en':'ru',mode:['windowed','borderless','fullscreen'].includes(raw.mode)?raw.mode:'windowed',resolution:RESOLUTIONS.includes(raw.resolution)?raw.resolution:'auto',volume:Number.isFinite(raw.volume)?Math.min(1,Math.max(0,raw.volume)):0,bindings:{}};
  const used=new Set();
  for(const [action,defaults] of Object.entries(DEFAULT_BINDINGS)){
    const list=Array.isArray(raw.bindings?.[action])?raw.bindings[action]:defaults;
    result.bindings[action]=list.filter(code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Escape|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Enter|Tab|Backspace|CapsLock|Numpad[0-9]|[A-Za-z]+)$/.test(code)&&!used.has(code)&&used.add(code)).slice(0,2);
  }
  result.gamepads={xbox:normalizePadBindings(raw.gamepads?.xbox),playstation:normalizePadBindings(raw.gamepads?.playstation)};
  return result;
}
export function assignBinding(bindings,action,slot,code){
  const previous=bindings[action][slot];
  for(const [other,list] of Object.entries(bindings)){
    const index=list.indexOf(code);
    if(index>=0){if(previous)list[index]=previous;else list.splice(index,1);}
  }
  bindings[action][slot]=code;
}
export function canonicalKey(settings,code){
  const action=Object.keys(ACTION_CODES).find(action=>settings.bindings[action].includes(code));
  return action?ACTION_CODES[action]:null;
}
