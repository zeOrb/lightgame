import {Preparation} from './preparation.js';
import {localizeDOM,tr} from './i18n.js';
import {preferences,t} from './settings.js';
import './bootstrap.css';
import {initializeMenuBackground} from './menu-background.js';
initializeMenuBackground();
localizeDOM();document.getElementById('intro-settings').textContent=t('settings');
const overlay=document.createElement('div');overlay.id='game-preparation';overlay.hidden=true;overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
const label=document.createElement('span'),retry=document.createElement('button');retry.textContent=preferences.language==='ru'?'Повторить':'Retry';retry.hidden=true;retry.onclick=()=>location.reload();overlay.append(label,retry);document.body.append(overlay);
let requested=false;
const preparation=new Preparation(()=>import('./main.js'));
function showLoading(){overlay.hidden=false;label.textContent=tr('Preparing run…');}
function failed(error){console.error('[Sunny preparation]',error);overlay.hidden=false;label.textContent=preferences.language==='ru'?'Не удалось подготовить игру':'Could not prepare the game';retry.hidden=false;document.documentElement.dataset.preparation='failed';}
async function waitForGame(){document.documentElement.dataset.preparation='loading';try{const game=await preparation.prepare();document.documentElement.dataset.preparation='ready';return game;}catch(error){failed(error);throw error;}}
// Capture remains authoritative while main.js installs handlers during preparation.
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button||!button.closest('#intro')||preparation.state==='ready')return;
 event.preventDefault();event.stopImmediatePropagation();if(requested)return;requested=true;showLoading();
 try{const game=await waitForGame();overlay.hidden=true;if(button.id==='start'||button.id==='debug-boss')game.startPreparedRun({boss:button.id==='debug-boss'});else button.click();}catch{}finally{requested=false;}
},true);
let resume=false;try{resume=sessionStorage.getItem('sunny.next-run')==='1';}catch{}
const direct=new URLSearchParams(location.search).has('sunny-run')||resume;
if(direct)showLoading();
// Give the black menu a chance to paint before importing Three.js and the game.
requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{waitForGame().then(()=>{if(!requested)overlay.hidden=true;}).catch(()=>{});},0)));
