// Run-local event log and extensible metrics. No rendering, storage or engine dependencies.
export class RunTelemetry {
  constructor(){
    this.metrics=new Map();
    this.register('gems',0,(value,event)=>value+(event.type==='gem.collected'?(event.data.count??1):0));
    this.register('points',0,(value,event)=>value+(event.type==='points.earned'?event.data.amount:0));
    this.register('kills',0,(value,event)=>value+(event.type==='enemy.killed'?(event.data.count??1):0));
    this.reset();
  }
  register(id,initial,reduce){if(this.metrics.has(id))throw Error('Duplicate run metric: '+id);if(typeof reduce!=='function')throw Error('Metric reducer required');this.metrics.set(id,{initial,reduce});if(this.values)this.values[id]=structuredClone(initial);}
  reset(meta={}){this.meta=structuredClone(meta);this.events=[];this.values=Object.fromEntries([...this.metrics].map(([id,m])=>[id,structuredClone(m.initial)]));this.elapsed=0;this.previous=null;this.active=true;this.completedFloors=new Set();this.result=null;}
  clock(now,running){if(!Number.isFinite(now))return;const previous=this.previous;this.previous=Math.max(previous??now,now);if(this.active&&running&&previous!==null)this.elapsed+=Math.max(0,now-previous)/1000;}
  emit(type,data={}){
    if(!this.active)return null;if(typeof type!=='string'||!type)throw Error('Run event type required');
    const event={type,time:this.elapsed,data:structuredClone(data)};
    const values={...this.values};for(const [id,m] of this.metrics)values[id]=m.reduce(structuredClone(values[id]),structuredClone(event));
    this.values=values;this.events.push(event);return structuredClone(event);
  }
  floorCompleted(id,label){if(this.completedFloors.has(id)||!this.active)return;this.completedFloors.add(id);this.emit('floor.completed',{id,label});}
  finish(outcome){if(!this.active)return this.snapshot();this.emit('run.finished',{outcome});this.result=outcome;this.active=false;return this.snapshot();}
  snapshot(){return structuredClone({meta:this.meta,duration:this.elapsed,totals:this.values,events:this.events,outcome:this.result});}
}
// Any gameplay system can publish events here; UI consumes only the finished snapshot.
export const runTelemetry=new RunTelemetry();
