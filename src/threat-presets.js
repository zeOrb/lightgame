import catalog from './threat-presets.json' with {type:'json'};
import {THREAT_TYPES} from './threat-types.js';

function checkPool(pool,valid,label,allowEmpty=false){
  if(!Array.isArray(pool)||(!allowEmpty&&!pool.length))throw new Error('threat-presets.json: invalid '+label);
  const ids=new Set();
  for(const item of pool){
    if(!item||!valid(item.id)||ids.has(item.id)||!Number.isFinite(item.weight)||item.weight<0)throw new Error('threat-presets.json: invalid '+label+' entry');
    ids.add(item.id);
  }
  if(pool.length&&!pool.some(item=>item.weight>0))throw new Error('threat-presets.json: no positive weights in '+label);
}

export function validateThreatPresets(source){
  if(source.version!==1||!source.presets||!source.pools)throw new Error('threat-presets.json: invalid catalog');
  for(const [id,preset] of Object.entries(source.presets)){
    const counts=Array.isArray(preset.count)?preset.count:[preset.count,preset.count];
    if(counts.length!==2||counts.some(n=>!Number.isInteger(n)||n<0)||counts[1]<counts[0])throw new Error('threat-presets.json: invalid count for '+id);
    checkPool(preset.pool,id=>THREAT_TYPES.includes(id),id,counts[1]===0);
  }
  for(const [id,pool] of Object.entries(source.pools))checkPool(pool,id=>Object.hasOwn(source.presets,id),id);
}
validateThreatPresets(catalog);

export function resolveThreatPreset(rule,rng,source=catalog){
  if(rule.mode==='explicit')return rule;
  let id=rule.preset;
  if(rule.presetPool){
    const pool=source.pools[rule.presetPool];
    if(!pool)throw new Error('floors.json: unknown threat preset pool '+rule.presetPool);
    id=rng.weightedPick(pool);
  }
  if(!id)return rule;
  const preset=source.presets[id];
  if(!preset)throw new Error('floors.json: unknown threat preset '+id);
  return {
    ...rule,mode:'generated',presetId:id,
    count:rule.count??preset.count,
    pool:rule.pool??preset.pool.map(item=>item.id),
    weights:rule.weights??Object.fromEntries(preset.pool.map(item=>[item.id,item.weight]))
  };
}
