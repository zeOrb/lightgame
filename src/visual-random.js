// One fresh cosmetic seed per page load; named streams do not affect each other.
const entropy=new Uint32Array(1);
globalThis.crypto.getRandomValues(entropy);
export const visualSeed=entropy[0];
function hash(name){
  let value=visualSeed;
  for(let i=0;i<name.length;i++)value=Math.imul(value^name.charCodeAt(i),16777619);
  return value>>>0;
}
export function createVisualRandom(name){
  let state=hash(name);
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
export function visualSample(name,index){
  let value=Math.imul((index+1)^hash(name),374761393);
  value=Math.imul(value^(value>>>13),1274126177);
  return ((value^(value>>>16))>>>0)/4294967296;
}
