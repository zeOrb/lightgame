import settings from './threat-settings.json' with {type:'json'};
import {THREAT_TYPES} from './threat-types.js';

const rules=settings.adjacency;
for(const [id,rule] of Object.entries(rules)){
  if(!THREAT_TYPES.includes(id)||!Array.isArray(rule.cannotNeighbor)||rule.cannotNeighbor.some(other=>!THREAT_TYPES.includes(other)))throw new Error('threat-settings.json: invalid adjacency rule for '+id);
}

export function threatsCanNeighbor(a,b,config=rules){
  return !config[a]?.cannotNeighbor.includes(b)&&!config[b]?.cannotNeighbor.includes(a);
}
