import {RandomManager} from './random-manager.js';

// CSS moves small, preblurred layers; no canvas, WebGL or per-frame JS work.
export function initializeMenuBackground(){
  const root=document.getElementById('menu-background'),intro=document.getElementById('intro');
  if(!root||!intro||root.dataset.initialized)return;
  root.dataset.initialized='true';
  const random=RandomManager.graphics,fragment=document.createDocumentFragment();
  for(let i=0;i<46;i++){
    const depth=i<24?'far':i<40?'middle':'near',near=depth==='near',far=depth==='far';
    const size=near?16+random()*22:far?2+random()*3:4+random()*5;
    const duration=near?17+random()*10:far?28+random()*22:21+random()*15;
    const particle=document.createElement('i');particle.className='menu-firefly';particle.dataset.depth=depth;
    const hue=random()<.22?165+random()*22:38+random()*15;
    for(const [key,value] of Object.entries({
      x:(random()*100).toFixed(2)+'%',size:size.toFixed(1)+'px',
      blur:(near?3+random()*4:far?.15+random()*.35:.2+random()*.7).toFixed(2)+'px',
      alpha:(near?.12+random()*.2:far?.22+random()*.3:.45+random()*.4).toFixed(2),
      duration:duration.toFixed(2)+'s',delay:(-random()*duration).toFixed(2)+'s',
      drift:((random()-.5)*(near?150:95)).toFixed(1)+'px',
      sway:((random()-.5)*75).toFixed(1)+'px',hue:hue.toFixed(1),rest:(random()*95).toFixed(1)+'vh'
    }))particle.style.setProperty('--'+key,value);
    fragment.append(particle);
  }
  root.append(fragment);
  const sync=()=>{root.hidden=intro.hidden||document.body.classList.contains('playing');root.dataset.running=String(!root.hidden&&!document.hidden);};
  const observer=new MutationObserver(sync);
  observer.observe(intro,{attributes:true,attributeFilter:['hidden']});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);sync();
}
