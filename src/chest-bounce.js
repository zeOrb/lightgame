// Match the platformer's asymmetric ascent/descent gravity and air steering.
export function chestBounce(previousVelocity,startY,targetY,distance,input,maxSpeed){
  const velocity=previousVelocity/Math.sqrt(3),up=velocity/20;
  const flight=up+Math.sqrt(2*Math.max(0,startY+velocity*velocity/40-targetY)/28);
  const dir=Math.sign(distance)||1,target=input*maxSpeed,rate=input?5:1.2;
  function travel(speed){let v=speed*dir,x=0;const dt=flight/240;for(let i=0;i<240;i++){v+=Math.sign(target-v)*Math.min(Math.abs(target-v),rate*dt);x+=v*dt;}return x*dir;}
  let lo=0,hi=12;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(travel(mid)<Math.abs(distance))lo=mid;else hi=mid;}
  return {velocity,rail:dir*(lo+hi)/2};
}
