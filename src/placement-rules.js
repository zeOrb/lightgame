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
// Keep authored data in the JSON intact; corrections belong to the compiled floor.
export function repairAuthoredPlacements(floor,rules,used){
  const items=Object.entries(floor.placements).flatMap(([key,entries])=>entries.map((item,index)=>({key,index,item,original:item.offset})));
  floor.placementWarnings=[];
  if(items.every((entry,i)=>compatible(entry.key,entry.original,items.slice(0,i).map(e=>({key:e.key,offset:e.original})),rules)))return;
  const blocked=new Set(floor.holes);blocked.add(floor.count-1);
  if(floor.secret?.enabled)blocked.add(floor.secret.offset??Math.min(5,floor.count-3));
  const placed=[];let visits=0,exhausted=false;
  const domains=items.map(entry=>Array.from({length:floor.count},(_,i)=>i).filter(offset=>offset===entry.original||!blocked.has(offset)).sort((a,b)=>Math.abs(a-entry.original)-Math.abs(b-entry.original)||a-b));
  function search(index){
    if(++visits>100000){exhausted=true;return false;}
    if(index===items.length)return true;
    const entry=items[index];
    for(const offset of domains[index]){
      if(!compatible(entry.key,offset,placed,rules))continue;
      // Preserve existing permitted overlaps, but do not introduce new ones.
      if(placed.some(other=>other.offset===offset&&(offset!==entry.original||offset!==other.original)))continue;
      placed.push({...entry,offset});
      if(search(index+1))return true;
      placed.pop();if(exhausted)return false;
    }
    return false;
  }
  if(!search(0))throw new Error('floors.json: '+floor.id+(exhausted?' authored repair search limit reached':' has no valid placement: cannot repair authored placementRules'));
  for(const entry of placed)if(entry.offset!==entry.original){
    entry.item.offset=entry.offset;entry.item.s=floor.start+entry.offset;
    floor.placementWarnings.push({code:'authored-placement-adjusted',floorId:floor.id,category:entry.key,index:entry.index,fromOffset:entry.original,toOffset:entry.offset});
  }
  used.clear();for(const offset of blocked)used.add(offset);for(const entry of placed)used.add(entry.offset);
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
