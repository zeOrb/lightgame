let overlay,animation;

export function flashRunStart(){
  if(!overlay){
    overlay=document.createElement('div');overlay.setAttribute('aria-hidden','true');
    Object.assign(overlay.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'100',opacity:'0',background:'radial-gradient(ellipse at 50% 54%, #fffef4 0%, #fff6d5 55%, #f5dfb4 100%)'});
    document.body.appendChild(overlay);
  }
  animation?.cancel();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  animation=overlay.animate([{opacity:reduced?.2:.78},{opacity:0}],{duration:reduced?350:800,easing:'cubic-bezier(.16,.65,.3,1)',fill:'none'});
}
