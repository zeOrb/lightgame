import {readPlacementRules,repairAuthoredPlacements,solveFloorPlacements} from './placement-rules.js';
import {RandomManager,randomManager} from './random-manager.js';
import config from './floors.json' with {type:'json'};
import {RUN_UPGRADES} from './progression.js';
import {STEPS_PER_WALL_BAY} from './wall-layout.js';

export const FLOOR_CONFIG=config;
const categories=['windows','loot','enemies','shadows','chests','bottles','books','springboards','threats'];
function merge(base,override){const out=structuredClone(base);for(const [k,v] of Object.entries(override??{}))out[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(base?.[k]??{},v):v;return out;}
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
  readPlacementRules(source.defaults.placementRules);
  const manager=new RandomManager(seed),result=[];let start=0;
  for(let index=0;index<source.baseFloors+extraFloors;index++){
    const custom=source.floors[index]??{};
    if(Object.hasOwn(custom,'placementRules'))readPlacementRules(custom.placementRules);
    const rule=merge(source.defaults,custom),count=rule.steps.count;
    if(!Number.isInteger(count)||count<4||count>128)throw new Error('floors.json: steps.count must be 4..128');
    if(!Number.isFinite(rule.rotationYDegrees??0))throw new Error('floors.json: invalid rotation');
    if(rule.lighting?.daylight!==null&&rule.lighting?.daylight!==undefined&&(!Number.isFinite(rule.lighting.daylight)||rule.lighting.daylight<0||rule.lighting.daylight>1))throw new Error('floors.json: daylight must be 0..1 or null');
    const checkStep=item=>{if(item.innerRadius!==undefined&&(!Number.isFinite(item.innerRadius)||item.innerRadius<1||item.innerRadius>=16.5))throw new Error('floors.json: invalid step innerRadius');if(item.style!==undefined&&!['carved','plain'].includes(item.style))throw new Error('floors.json: unknown step style '+item.style);};
    checkStep(rule.steps);if(rule.steps.styles?.some(style=>!['carved','plain'].includes(style))||rule.steps.styles?.length===0)throw new Error('floors.json: invalid step styles');
    const placementRules=readPlacementRules(rule.placementRules);
    const floor={...rule,id:custom.id??'floor-'+(index+1),index,start,count,end:start+count-1,rotationYDegrees:rule.rotationYDegrees??0,placements:{}};
    if(result.some(f=>f.id===floor.id))throw new Error('floors.json: duplicate floor id '+floor.id);
    let stream=manager.create('layout',String(source.seed),floor.id,'steps');
    const used=new Set();
    const valid=(offset)=>Number.isInteger(offset)&&offset>=0&&offset<count;
    const select=(n,min=1,max=count-3)=>{const available=Array.from({length:count},(_,i)=>i).filter(i=>i>=min&&i<=max&&!used.has(i));for(let i=available.length-1;i>0;i--){const j=stream.int(0,i);[available[i],available[j]]=[available[j],available[i]];}return available.slice(0,n).sort((a,b)=>a-b);};
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
    // Reserve authored placements first so generated content cannot overwrite them.
    for(const key of categories){const r=rule[key];if(r.mode!=='explicit'&&r.mode!=='generated')throw new Error('floors.json: unknown mode for '+key);if(r.mode==='explicit'){
      if(!Array.isArray(r.items))throw new Error('floors.json: explicit '+key+' requires items');
      floor.placements[key]=r.items.map(item=>{const value=typeof item==='number'?{offset:item}:item;if(!valid(value.offset)||floor.holes.includes(value.offset)||!Number.isFinite(value.lane??0)||Math.abs(value.lane??0)>1.2)throw new Error('floors.json: invalid '+key+' offset '+value.offset);used.add(value.offset);return {...value,s:start+value.offset};});
    }}
    const authoredRules=[...placementRules,...['enemies','shadows','threats','books'].map(key=>({between:['windows',key],minDistance:1}))];
    repairAuthoredPlacements(floor,authoredRules,used);
    const requests=[];
    let budget=Array.from({length:count},(_,i)=>i).filter(i=>i>=1&&i<=count-3&&!used.has(i)).length;
    for(const key of categories){const r=rule[key];if(r.mode==='explicit')continue;
      const random=manager.create('layout',String(source.seed),floor.id,key);
      const remainingMinimum=categories.slice(categories.indexOf(key)+1).reduce((sum,k)=>sum+(rule[k].mode==='generated'?(Array.isArray(rule[k].count)?rule[k].count[0]:rule[k].count??0):0),0);
      const n=amount(r.count,random,budget-remainingMinimum);if(!Number.isInteger(n)||n<0)throw new Error('floors.json: invalid count for '+key);
      if(n>budget)throw new Error('floors.json: '+floor.id+' has no space for '+key);
      budget-=n;requests.push({key,count:n,random});
    }
    const generated=solveFloorPlacements(floor,requests,used,placementRules);
    for(const {key,random} of requests){
      const pool=rule[key].pool;
      if(pool!==null&&pool!==undefined&&!pool.length)throw new Error('floors.json: empty pool for '+key);
      floor.placements[key]=generated.get(key).map(offset=>({offset,s:start+offset,...(pool?.length?{id:random.pick(pool)}:{})}));
    }
    for(const item of floor.placements.threats)if(!['moving-platform','pendulum','ink-wave','thorns'].includes(item.id))throw new Error('floors.json: unknown threat '+item.id);
    for(const item of floor.placements.loot)if(item.count!==undefined&&(!Number.isInteger(item.count)||item.count<1||item.count>64))throw new Error('floors.json: invalid loot count');
    if(index>=source.baseFloors){floor.arena.enabled=(index+1)%(source.extraFloor?.arena?.every??10)===0;floor.secret.enabled=index%(source.extraFloor?.secret?.every??3)===0;}
    result.push(floor);start+=count;
  }
  return result;
}
export const FLOORS=buildFloorLayout(config,RUN_UPGRADES.extraFloors);
export const LEVEL_DIAGNOSTICS=FLOORS.flatMap(floor=>floor.placementWarnings);
export const TOTAL_SECTIONS=FLOORS.reduce((n,f)=>n+f.count,0);
export function floorForSection(s){return FLOORS.find(f=>s<f.start+f.count)??FLOORS.at(-1);}
export function floorForHeight(y,top=100+(TOTAL_SECTIONS-140)*.5){return floorForSection((top-y)*2);}
export function placementAt(category,s){return floorForSection(s).placements[category].find(item=>item.s===s);}
export function stepAt(s){const f=floorForSection(s);const styles=f.steps.styles??['carved'];return {style:styles[Math.abs(Math.floor(s))%styles.length],innerRadius:f.steps.innerRadius,decorations:f.steps.decorations,...f.stepItems?.get(s-f.start)};}
