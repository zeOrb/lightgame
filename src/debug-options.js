import {tr,onLanguageChange} from './i18n.js';
const KEY='sunny.debug-options.v1';
export function readDebugOptions(){try{return {chestEveryStep:JSON.parse(localStorage.getItem(KEY)??'{}').chestEveryStep===true};}catch{return {chestEveryStep:false};}}
let current=readDebugOptions();
export function debugOptions(){return {...current};}
export function initializeDebugOptions(){
  const button=document.createElement('button');button.id='debug-chests';button.className='text-button';
  const sync=()=>{button.textContent=tr('Chest on every step · debug')+(current.chestEveryStep?' ✓':'');button.setAttribute('aria-pressed',String(current.chestEveryStep));};
  button.onclick=()=>{current={...current,chestEveryStep:!current.chestEveryStep};try{localStorage.setItem(KEY,JSON.stringify(current));}catch{}sync();};
  onLanguageChange(sync);sync();document.getElementById('debug-boss').after(button);
}
