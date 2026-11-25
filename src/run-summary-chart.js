// Presentation interpolation only: recorded values and event times stay exact.
export function summarySeries(snapshot){let value=0;const points=[{time:0,value:0}];for(const event of snapshot.events)if(event.type==='points.earned'){value+=event.data.amount;const last=points.at(-1);if(last.time===event.time)last.value=value;else points.push({time:event.time,value});}if(points.at(-1).time!==snapshot.duration)points.push({time:snapshot.duration,value});return points;}
export function summaryCurve(points,x,y){
  const p=points.map(point=>({x:x(point.time),y:y(point.value)}));
  const slopes=p.slice(1).map((point,i)=>(point.y-p[i].y)/(point.x-p[i].x));
  const tangents=p.map((_,i)=>i===0?(slopes[0]??0):i===p.length-1?slopes.at(-1):slopes[i-1]*slopes[i]<=0?0:2/(1/slopes[i-1]+1/slopes[i]));
  let path=`M ${p[0].x} ${p[0].y}`;const segments=[];
  for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],width=b.x-a.x;if(width<=0)continue;const c1=a.y+tangents[i-1]*width/3,c2=b.y-tangents[i]*width/3;segments.push({a,b,c1,c2});path+=` C ${a.x+width/3} ${c1}, ${b.x-width/3} ${c2}, ${b.x} ${b.y}`;}
  return {path,at(time){const px=x(time),s=segments.find(s=>px<=s.b.x)??segments.at(-1);if(!s)return p[0].y;const t=Math.max(0,Math.min(1,(px-s.a.x)/(s.b.x-s.a.x))),u=1-t;return u*u*u*s.a.y+3*u*u*t*s.c1+3*u*t*t*s.c2+t*t*t*s.b.y;}};
}
