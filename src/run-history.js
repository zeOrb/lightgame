export const RUN_HISTORY_KEY='sunny.run-history.v1';
const fresh=()=>({version:1,recent:[],lifetime:{runs:0,wins:0,duration:0,floors:0,totals:{},items:{}}});
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export function validRun(run){return run&&typeof run.id==='string'&&typeof run.date==='string'&&Number.isFinite(Date.parse(run.date))&&number(run.duration)&&['won','lost'].includes(run.outcome)&&run.totals&&Object.values(run.totals).every(number)&&Array.isArray(run.events)&&run.events.every(e=>e&&typeof e.type==='string'&&number(e.time)&&e.time<=run.duration&&e.data&&typeof e.data==='object');}
export class RunHistory {
  constructor(storage=null){this.storage=storage;this.state=fresh();try{const data=JSON.parse(storage?.getItem(RUN_HISTORY_KEY)??'null');if(data?.version===1&&Array.isArray(data.recent)&&data.recent.every(validRun)&&data.lifetime&&['runs','wins','duration','floors'].every(k=>number(data.lifetime[k]))&&data.lifetime.totals&&Object.values(data.lifetime.totals).every(number)&&data.lifetime.items&&Object.values(data.lifetime.items).every(number))this.state={...data,recent:data.recent.slice(0,5)};}catch{}}
  record(snapshot,{id=snapshot.meta?.runId,date=new Date().toISOString()}={}){
    if(!id)throw Error('Finished run needs a unique ID');const record=structuredClone({...snapshot,id,date});if(!validRun(record))throw Error('Invalid finished run');
    if(this.state.recent.some(run=>run.id===id))return false;
    const next=structuredClone(this.state),totals=next.lifetime;totals.runs++;totals.wins+=record.outcome==='won'?1:0;totals.duration+=record.duration;
    for(const [key,value] of Object.entries(record.totals))totals.totals[key]=(totals.totals[key]??0)+value;
    totals.floors+=new Set(record.events.filter(e=>e.type==='floor.completed').map(e=>e.data.id)).size;
    for(const event of record.events)if(event.type==='item.acquired'&&typeof event.data.id==='string'){const id=event.data.id;Object.defineProperty(totals.items,id,{value:(Object.hasOwn(totals.items,id)?totals.items[id]:0)+1,writable:true,enumerable:true,configurable:true});}
    next.recent=[record,...next.recent].slice(0,5);this.state=next;this.save();return true;
  }
  save(){try{this.storage?.setItem(RUN_HISTORY_KEY,JSON.stringify(this.state));this.saved=true;}catch{this.saved=false;}}
  snapshot(){return structuredClone(this.state);}
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const runHistory=new RunHistory(storage);
