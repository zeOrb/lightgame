// Screen-space navigation also works for the irregular layout of the skill map.
export function directionalTarget(current,candidates,dx,dy){
  let best=null,bestScore=Infinity;
  for(const candidate of candidates){
    if(candidate.id===current.id)continue;
    const x=candidate.x-current.x,y=candidate.y-current.y;
    const forward=x*dx+y*dy,side=Math.abs(x*dy-y*dx);
    if(forward<=1)continue;
    const score=Math.hypot(x,y)+side*2.5;
    if(score<bestScore){best=candidate;bestScore=score;}
  }return best?.id??null;
}
