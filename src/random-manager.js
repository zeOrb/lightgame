// Central entry point for gameplay streams and ordinary graphical randomness.
const SPAN=0xffffffff;
export const RNG_VERSION=1;
function seedText(seed){
  if((typeof seed!=='string'&&typeof seed!=='number')||String(seed).length===0||typeof seed==='number'&&!Number.isFinite(seed))throw new TypeError('Invalid RNG seed');
  return String(seed);
}
function hash(text){
  let n=2166136261;
  for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);
  n=Math.imul(n^(n>>>16),0x85ebca6b);n=Math.imul(n^(n>>>13),0xc2b2ae35);
  return ((n^(n>>>16))>>>0)||0x6d2b79f5;
}
export class RandomStream {
  constructor(seed){this.initial=hash(seedText(seed));this.reset();}
  reset(){this.state=this.initial;this.calls=0;return this;}
  nextUint32(){
    let x=this.state;x^=x<<13;x^=x>>>17;x^=x<<5;
    this.state=x>>>0;this.calls++;return this.state;
  }
  float(){return (this.nextUint32()-1)/SPAN;}
  int(min,max){
    const size=max-min+1;
    if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||!Number.isSafeInteger(size)||size<1||size>SPAN)throw new RangeError('Invalid RNG integer range');
    // xorshift32 visits 1..2^32-1. Reject the incomplete bucket before modulo.
    const limit=SPAN-SPAN%size;let value;
    do{value=this.nextUint32()-1;}while(value>=limit);
    return min+value%size;
  }
  chance(probability){
    if(!Number.isFinite(probability)||probability<0||probability>1)throw new RangeError('Invalid RNG probability');
    return probability===1||probability!==0&&this.float()<probability;
  }
  pick(items){if(!items.length)throw new RangeError('Empty RNG pool');return items[this.int(0,items.length-1)];}
  shuffle(items){const out=[...items];for(let i=out.length-1;i>0;i--){const j=this.int(0,i);[out[i],out[j]]=[out[j],out[i]];}return out;}
  snapshot(){return {state:this.state,calls:this.calls};}
  restore(saved){
    if(!saved||!Number.isInteger(saved.state)||saved.state<1||saved.state>SPAN||!Number.isSafeInteger(saved.calls)||saved.calls<0)throw new TypeError('Invalid RNG state');
    this.state=saved.state;this.calls=saved.calls;return this;
  }
}
export class RandomManager {
  static graphics(){return Math.random();}
  constructor(seed){this.seed=seedText(seed);if(this.seed.length>256)throw new TypeError('RNG seed is too long');this.streams=new Map();}
  create(...path){return new RandomStream(JSON.stringify([RNG_VERSION,this.seed,...path.map(seedText)]));}
  stream(...path){const key=JSON.stringify(path.map(seedText));if(!this.streams.has(key))this.streams.set(key,this.create(...path));return this.streams.get(key);}
  sample(...path){return this.create(...path).float();}
  reset(){for(const stream of this.streams.values())stream.reset();}
  snapshot(){return {version:RNG_VERSION,seed:this.seed,streams:[...this.streams].map(([key,rng])=>({key,...rng.snapshot()}))};}
  restore(saved){
    if(!saved||saved.version!==RNG_VERSION||saved.seed!==this.seed||!Array.isArray(saved.streams))throw new TypeError('Incompatible RNG save');
    const checked=new Map();
    for(const entry of saved.streams){
      const path=JSON.parse(entry.key);
      if(!Array.isArray(path)||JSON.stringify(path.map(seedText))!==entry.key||checked.has(entry.key))throw new TypeError('Invalid RNG stream key');
      checked.set(entry.key,this.create(...path).restore(entry));
    }
    this.reset();
    for(const [key,rng] of checked){if(this.streams.has(key))this.streams.get(key).restore(rng.snapshot());else this.streams.set(key,rng);}
    return this;
  }
}
export function freshRunSeed(){
  const words=new Uint32Array(2);globalThis.crypto.getRandomValues(words);
  return [...words].map(n=>n.toString(16).padStart(8,'0')).join('');
}
export function seedFromURL(href){return new URL(href).searchParams.get('seed')||freshRunSeed();}

// Graphics never advance seeded streams and are intentionally not serialized.
export function createVisualRandom(){return RandomManager.graphics;}
export function visualSample(){return RandomManager.graphics();}
// Initialized before layout modules. A seeded URL reproduces the run.
export const randomManager=new RandomManager(globalThis.location?.href?seedFromURL(globalThis.location.href):freshRunSeed());
