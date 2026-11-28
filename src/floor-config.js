import {readPlacementRules,repairAuthoredPlacements,solveFloorPlacements} from './placement-rules.js';
import {RandomManager,randomManager} from './random-manager.js';
import config from './floors.json' with {type:'json'};
import {RUN_UPGRADES} from './progression.js';
import {STEPS_PER_WALL_BAY} from './wall-layout.js';
import {ThreatType,THREAT_TYPES} from './threat-types.js';
import {resolveThreatPreset} from './threat-presets.js';
import {threatsCanNeighbor} from './threat-adjacency.js';

export const FLOOR_CONFIG=config;
const categories=['windows','loot','enemies','shadows','chests','bottles','books','springboards','threats'];
function merge(base,override){const out=structuredClone(base);for(const [k,v] of Object.entries(override??{}))out[k]=k==='threats'&&(v?.preset||v?.presetPool)?structuredClone(v):v&&typeof v==='object'&&!Array.isArray(v)?merge(base?.[k]??{},v):v;return out;}
function amount(value,stream,capacity=Infinity){
  if(Array.isArray(value)){
    if(value.length!==2||!value.every(Number.isInteger)||value[0]<0||value[1]<value[0])throw new Error('floors.json: invalid count range');
    if(value[0]>capacity)throw new Error('floors.json: no space for count range');
    return stream.int(value[0],Math.min(value[1],capacity));
  }
  return value??0;
}
export function buildFloorLayout(source,extraFloors=0,seed=randomManager.seed){
  if(!Number.isInteger(source.baseFloors)||source.baseFloors<1||!Number.isInteger(extraFloors)||extraFloors<0)throw new Error('floors.json: invalid floor count');
  const stageSize=source.stageSize??10;
  if(!Number.isInteger(stageSize)||stageSize<1)throw new Error('floors.json: invalid stageSize');
  readPlacementRules(source.defaults.placementRules);
  const manager=new RandomManager(seed),result=[];let start=0;
  for(let index=0;index<source.baseFloors+extraFloors;index++){
    const custom=source.floors[index]??{};
    if(Object.hasOwn(custom,'placementRules'))readPlacementRules(custom.placementRules);
    const stageIndex=Math.floor(index/stageSize);
    const stage=stageIndex===0?source.stages?.first:source.stages?.later;
    const rule=merge(merge(source.defaults,stage),custom);
    rule.shadows??={mode:'generated',count:0};
    rule.threats??={mode:'generated',count:0};
    rule.threats=resolveThreatPreset(rule.threats,manager.create('layout',String(source.seed),custom.id??'floor-'+(index+1),'threat-preset'));
    if(rule.threats.pool?.some(id=>!THREAT_TYPES.includes(id)))throw new Error('floors.json: unknown threat in pool');
    if(stage?.stairTheme)rule.stairTheme=stage.stairTheme;
    const count=rule.steps.count;
    const props=rule.backgroundProps??{density:.78,types:['books','scrolls','lantern']};
    const propTypes=['books','scrolls','lantern','arch','stone','candles','urn','hourglass','candlestick','brick'];
    if(!Number.isFinite(props.density)||props.density<0||props.density>1||!Array.isArray(props.types)||props.types.some(type=>!propTypes.includes(type)))throw new Error('floors.json: invalid backgroundProps');
    if(props.weights!==undefined&&(!props.weights||typeof props.weights!=='object'||Array.isArray(props.weights)||Object.entries(props.weights).some(([type,weight])=>!propTypes.includes(type)||!Number.isFinite(weight)||weight<0)))throw new Error('floors.json: invalid backgroundProps weights');
    if(!['wood','stone'].includes(rule.stairTheme??'wood'))throw new Error('floors.json: unknown stairTheme '+rule.stairTheme);
    if(!Number.isInteger(count)||count<4||count>128)throw new Error('floors.json: steps.count must be 4..128');
    if(!Number.isFinite(rule.rotationYDegrees??0))throw new Error('floors.json: invalid rotation');
    if(rule.lighting?.daylight!==null&&rule.lighting?.daylight!==undefined&&(!Number.isFinite(rule.lighting.daylight)||rule.lighting.daylight<0||rule.lighting.daylight>1))throw new Error('floors.json: daylight must be 0..1 or null');
    const checkStep=item=>{if(item.innerRadius!==undefined&&(!Number.isFinite(item.innerRadius)||item.innerRadius<1||item.innerRadius>=16.5))throw new Error('floors.json: invalid step innerRadius');if(item.style!==undefined&&!['carved','plain'].includes(item.style))throw new Error('floors.json: unknown step style '+item.style);};
    checkStep(rule.steps);if(rule.steps.styles?.some(style=>!['carved','plain'].includes(style))||rule.steps.styles?.length===0)throw new Error('floors.json: invalid step styles');
    const placementRules=readPlacementRules(rule.placementRules);
    const floor={...rule,id:custom.id??'floor-'+(index+1),index,stageIndex,start,count,end:start+count-1,rotationYDegrees:rule.rotationYDegrees??0,placements:{}};
    if(result.some(f=>f.id===floor.id))throw new Error('floors.json: duplicate floor id '+floor.id);
    let stream=manager.create('layout',String(source.seed),floor.id,'steps');
    const used=new Set();
    const valid=(offset)=>Number.isInteger(offset)&&offset>=0&&offset<count;
    const select=(n,min=1,max=count-3)=>{
      const available=stream.shuffle(Array.from({length:count},(_,i)=>i).filter(i=>i>=min&&i<=max&&!used.has(i)));
      const selected=[];
      function search(index){
        if(selected.length===n)return true;
        for(let i=index;i<available.length;i++){
          const offset=available[i];
          if(selected.some(other=>Math.abs(offset-other)===1&&!threatsCanNeighbor(ThreatType.HOLE,ThreatType.HOLE)))continue;
          if(result.at(-1)?.placements.threats.some(other=>Math.abs(start+offset-other.s)===1&&!threatsCanNeighbor(ThreatType.HOLE,other.id)))continue;
          selected.push(offset);if(search(i+1))return true;selected.pop();
        }
        return false;
      }
      if(!search(0))throw new Error('floors.json: '+floor.id+' has no space satisfying threat adjacency');
      return selected.sort((a,b)=>a-b);
    };
    for(const key of categories)if(rule[key].mode==='explicit'&&Array.isArray(rule[key].items))for(const item of rule[key].items)used.add(typeof item==='number'?item:item.offset);
    if(rule.secret?.enabled)used.add(rule.secret.offset??Math.min(5,count-3));
    const stepRule=rule.steps;
    if(stepRule.mode==='explicit'){
      if(!Array.isArray(stepRule.items))throw new Error('floors.json: explicit steps require items');
      floor.stepItems=new Map(stepRule.items.map(item=>{const value=typeof item==='number'?{offset:item}:item;if(!valid(value.offset))throw new Error('floors.json: invalid step offset');checkStep(value);return [value.offset,value];}));
      if(floor.stepItems.size!==stepRule.items.length)throw new Error('floors.json: duplicate step offset');
      floor.holes=Array.from({length:count},(_,i)=>i).filter(i=>!floor.stepItems.has(i));
    }else if(stepRule.mode==='generated'){
      const centres=Array.from({length:count},(_,i)=>i).filter(i=>(start+i)%STEPS_PER_WALL_BAY===0&&!used.has(i));centres.forEach(i=>used.add(i));
      floor.holes=select(amount(stepRule.holes?.count,stream),stepRule.holes?.safeStart??2,count-1-(stepRule.holes?.safeEnd??2));centres.forEach(i=>used.delete(i));
    }
    else throw new Error('floors.json: unknown steps mode');
    if(floor.holes.includes(count-1))throw new Error('floors.json: final step is required for the floor gate');
    floor.holes.forEach(i=>used.add(i));used.add(count-1);
    const threatId=(key,id)=>key==='threats'?id:key==='shadows'?ThreatType.SHADOW:null;
    const canPlaceThreat=(key,offset,id,placed)=>{
      const type=threatId(key,id);if(!type)return true;
      const neighbors=[
        ...floor.holes.map(offset=>({id:ThreatType.HOLE,s:start+offset})),
        ...(result.at(-1)?.placements.threats??[]),
        ...placed.map(item=>({id:threatId(item.key,item.id??item.item?.id),s:start+item.offset}))
      ];
      return neighbors.every(other=>Math.abs(start+offset-other.s)!==1||threatsCanNeighbor(type,other.id));
    };
    for(const offset of floor.holes)if(!canPlaceThreat('threats',offset,ThreatType.HOLE,[]))throw new Error('floors.json: '+floor.id+' cannot repair authored placementRules: holes violate threat adjacency');
    // Reserve authored placements first so generated content cannot overwrite them.
    for(const key of categories){const r=rule[key];if(r.mode!=='explicit'&&r.mode!=='generated')throw new Error('floors.json: unknown mode for '+key);if(r.mode==='explicit'){
      if(!Array.isArray(r.items))throw new Error('floors.json: explicit '+key+' requires items');
      floor.placements[key]=r.items.map(item=>{const value=typeof item==='number'?{offset:item}:item;if(!valid(value.offset)||floor.holes.includes(value.offset)||!Number.isFinite(value.lane??0)||Math.abs(value.lane??0)>1.2)throw new Error('floors.json: invalid '+key+' offset '+value.offset);used.add(value.offset);return {...value,s:start+value.offset};});
    }}
    const holeRules=floor.placements.threats?.some(item=>item.id===ThreatType.HOLE)?categories.filter(key=>key!=='threats').map(key=>({between:['threats',key],minDistance:1})):[];
    const authoredRules=[...placementRules,...holeRules,...['enemies','shadows','threats','books'].map(key=>({between:['windows',key],minDistance:1}))];
    repairAuthoredPlacements(floor,authoredRules,used,canPlaceThreat);
    const requests=[];
    let budget=Array.from({length:count},(_,i)=>i).filter(i=>i>=1&&i<=count-3&&!used.has(i)).length;
    for(const key of categories){const r=rule[key];if(r.mode==='explicit')continue;
      const random=manager.create('layout',String(source.seed),floor.id,key);
      const remainingMinimum=categories.slice(categories.indexOf(key)+1).reduce((sum,k)=>sum+(rule[k].mode==='generated'?(Array.isArray(rule[k].count)?rule[k].count[0]:rule[k].count??0):0),0);
      const n=amount(r.count,random,budget-remainingMinimum);if(!Number.isInteger(n)||n<0)throw new Error('floors.json: invalid count for '+key);
      if(n>budget)throw new Error('floors.json: '+floor.id+' has no space for '+key);
      const ids=key==='threats'?Array.from({length:n},()=>r.weights?random.weightedPick((r.pool??[]).map(id=>({id,weight:r.weights[id]??1}))):random.pick(r.pool??[])):null;
      const allowedOffset=ids?(offset,index)=>ids[index]!==ThreatType.HOLE||(offset>=(stepRule.holes?.safeStart??2)&&offset<=count-1-(stepRule.holes?.safeEnd??2)&&(start+offset)%STEPS_PER_WALL_BAY!==0):null;
      const minDistance=ids?.length&&ids.every(id=>id===ids[0])&&!threatsCanNeighbor(ids[0],ids[0])?2:1;
      budget-=n;requests.push({key,count:n,random,ids,allowedOffset,minDistance});
    }
    let generated;
    const threatRequest=requests.find(request=>request.key==='threats'),requestedThreats=threatRequest?.count??0;
    for(;;){
      try{generated=solveFloorPlacements(floor,requests,used,placementRules,canPlaceThreat);break;}
      catch(error){
        if(!error.message.includes('no valid placement: no space')||!threatRequest?.count)throw error;
        threatRequest.count--;threatRequest.ids.pop();
      }
    }
    if(threatRequest&&threatRequest.count!==requestedThreats)floor.placementWarnings.push({code:'threat-count-adjusted',floorId:floor.id,fromCount:requestedThreats,toCount:threatRequest.count});
    for(const {key,random,ids} of requests){
      const pool=rule[key].pool;
      if(pool!==null&&pool!==undefined&&!pool.length&&(key!=='threats'||generated.get(key).length))throw new Error('floors.json: empty pool for '+key);
      floor.placements[key]=generated.get(key).map((offset,index)=>({offset,s:start+offset,...(ids?{id:ids[index]}:pool?.length?{id:random.pick(pool)}:{})}));
    }
    for(const item of floor.placements.threats)if(!THREAT_TYPES.includes(item.id))throw new Error('floors.json: unknown threat '+item.id);
    // Compile older floor schemas into the same runtime threat list.
    for(const offset of floor.holes)floor.placements.threats.push({id:ThreatType.HOLE,offset,s:start+offset});
    for(const item of floor.placements.shadows)floor.placements.threats.push({...item,id:ThreatType.SHADOW});
    floor.placements.threats.sort((a,b)=>a.offset-b.offset);
    floor.holes=[...new Set(floor.placements.threats.filter(item=>item.id===ThreatType.HOLE).map(item=>item.offset))].sort((a,b)=>a-b);
    if(floor.holes.includes(count-1))throw new Error('floors.json: final step is required for the floor gate');
    for(const offset of floor.holes)floor.stepItems?.delete(offset);
    floor.placements.shadows=floor.placements.threats.filter(item=>item.id===ThreatType.SHADOW);
    for(const item of floor.placements.loot)if(item.count!==undefined&&(!Number.isInteger(item.count)||item.count<1||item.count>64))throw new Error('floors.json: invalid loot count');
    if(index>=source.baseFloors){floor.arena.enabled=(index+1)%(source.extraFloor?.arena?.every??10)===0;floor.secret.enabled=index%(source.extraFloor?.secret?.every??3)===0;}
    result.push(floor);start+=count;
  }
  return result;
}
export let FLOORS=buildFloorLayout(config,RUN_UPGRADES.extraFloors);
export let LEVEL_DIAGNOSTICS=FLOORS.flatMap(floor=>floor.placementWarnings);
export let TOTAL_SECTIONS=FLOORS.reduce((n,f)=>n+f.count,0);
export function rebuildFloorLayout(){
  const floors=buildFloorLayout(config,RUN_UPGRADES.extraFloors);
  FLOORS=floors;LEVEL_DIAGNOSTICS=floors.flatMap(floor=>floor.placementWarnings);TOTAL_SECTIONS=floors.reduce((n,f)=>n+f.count,0);
}
export function floorForSection(s){return FLOORS.find(f=>s<f.start+f.count)??FLOORS.at(-1);}
export function floorForHeight(y,top=100+(TOTAL_SECTIONS-140)*.5){return floorForSection((top-y)*2);}
export function placementAt(category,s){return floorForSection(s).placements[category].find(item=>item.s===s);}
export function stepAt(s){const f=floorForSection(s);const styles=f.steps.styles??['carved'];return {style:styles[Math.abs(Math.floor(s))%styles.length],innerRadius:f.steps.innerRadius,decorations:f.steps.decorations,...f.stepItems?.get(s-f.start)};}
