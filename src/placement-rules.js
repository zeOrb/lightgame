const CATEGORIES=new Set(['windows','loot','enemies','shadows','chests','bottles','books','springboards','threats']);
export function readPlacementRules(value=[]){
  if(!Array.isArray(value))throw new Error('floors.json: placementRules must be an array');
  return value.map(rule=>{
    if(!rule||!Array.isArray(rule.between)||rule.between.length!==2||!rule.between.every(key=>CATEGORIES.has(key))||!Number.isInteger(rule.minDistance)||rule.minDistance<1||rule.minDistance>128)throw new Error('floors.json: invalid placement rule');
    return {between:[...rule.between],minDistance:rule.minDistance};
  });
}
function compatible(key,offset,placed,rules){
  return rules.every(({between:[a,b],minDistance})=>placed.every(item=>{
    const matches=key===a&&item.key===b||key===b&&item.key===a;
    return !matches||Math.abs(offset-item.offset)>=minDistance;
  }));
}
export function solveFloorPlacements(floor,requests,used,rules){
  const placed=Object.entries(floor.placements).flatMap(([key,items])=>items.map(item=>({key,offset:item.offset})));
  for(let i=0;i<placed.length;i++)if(!compatible(placed[i].key,placed[i].offset,placed.slice(0,i),rules))throw new Error('floors.json: authored placements violate placementRules on '+floor.id);
  const available=Array.from({length:floor.count},(_,i)=>i).filter(i=>i>=1&&i<=floor.count-3&&!used.has(i));
  const domains=new Map(requests.map(r=>[r.key,r.random.shuffle(available)]));
  const selected=new Map(requests.map(r=>[r.key,[]])),last=new Map(requests.map(r=>[r.key,-1]));
  const occupied=new Set(used);let visits=0,exhausted=false;
  function capacity(key,domain){
    const distance=rules.reduce((n,r)=>r.between.every(k=>k===key)?Math.max(n,r.minDistance):n,1);
    let count=0,previous=-Infinity;
    for(const {offset} of [...domain].sort((a,b)=>a.offset-b.offset))if(offset-previous>=distance){count++;previous=offset;}
    return count;
  }
  function search(){
    if(++visits>100000){exhausted=true;return false;}
    let next=null;
    for(const r of requests){
      const remaining=r.count-selected.get(r.key).length;if(!remaining)continue;
      const domain=domains.get(r.key).map((offset,rank)=>({offset,rank})).filter(({offset,rank})=>rank>last.get(r.key)&&!occupied.has(offset)&&compatible(r.key,offset,placed,rules));
      const room=capacity(r.key,domain);if(room<remaining)return false;
      const slack=room-remaining;
      if(!next||slack<next.slack)next={...r,domain,slack};
    }
    if(!next)return true;
    for(const {offset,rank} of next.domain){
      const prior=last.get(next.key);last.set(next.key,rank);selected.get(next.key).push(offset);placed.push({key:next.key,offset});occupied.add(offset);
      if(search())return true;
      occupied.delete(offset);placed.pop();selected.get(next.key).pop();last.set(next.key,prior);
      if(exhausted)return false;
    }
    return false;
  }
  if(!search())throw new Error('floors.json: '+floor.id+(exhausted?' placementRules search limit reached':' has no valid placement: no space satisfying placementRules'));
  return new Map([...selected].map(([key,offsets])=>[key,offsets.sort((a,b)=>a-b)]));
}
