// Pure run-scoped state. No DOM, Three.js, storage or persistent skill mutations.
export function requirementsMet(requirements={},stats={},unlocks=new Set()){
  if(![...(requirements.skills??[]),...(requirements.unlocks??[])].every(id=>unlocks.has(id)))return false;
  return Object.entries(requirements.stats??{}).every(([key,condition])=>{
    const value=stats[key];if(typeof condition==='boolean')return value===condition;
    if(typeof value!=='number'||!Number.isFinite(value))return false;
    return (condition.min===undefined||value>=condition.min)&&(condition.max===undefined||value<=condition.max)&&(condition.gt===undefined||value>condition.gt);
  });
}
function validateRequirements(rule={}){
  if(!rule||typeof rule!=='object'||Array.isArray(rule)||Object.keys(rule).some(k=>!['stats','skills','unlocks'].includes(k)))throw Error('Invalid item requirements');
  for(const key of ['skills','unlocks'])if(rule[key]!==undefined&&(!Array.isArray(rule[key])||rule[key].some(id=>typeof id!=='string'||!id)))throw Error('Invalid requirement '+key);
  if(rule.stats!==undefined&&(!rule.stats||typeof rule.stats!=='object'||Array.isArray(rule.stats)))throw Error('Invalid stat requirements');
  for(const condition of Object.values(rule.stats??{}))if(typeof condition!=='boolean'&&(!condition||typeof condition!=='object'||!Object.keys(condition).length||Object.entries(condition).some(([k,v])=>!['min','max','gt'].includes(k)||!Number.isFinite(v))))throw Error('Invalid stat requirement condition');
}
export class RunItems {
  constructor(config,random){
    this.config=config;this.random=random;this.items=new Map(config.items.map(item=>[item.id,item]));
    if(this.items.size!==config.items.length)throw Error('Duplicate run item');
    if(!Number.isInteger(config.choices)||config.choices<1||!Number.isInteger(config.rerollsPerRun)||config.rerollsPerRun<0)throw Error('Invalid item choice settings');
    for(const [id,pool] of Object.entries(config.pools)){if(!pool.items.length||pool.items.some(item=>!this.items.has(item)))throw Error('Invalid item pool: '+id);}
    for(const definition of [...config.items,...Object.values(config.pools)])validateRequirements(definition.requirements);
    for(const [id,rarity] of Object.entries(config.rarities))if(!Number.isFinite(rarity.weight)||rarity.weight<0||!Number.isFinite(rarity.luckPower)||rarity.luckPower<0)throw Error('Invalid rarity: '+id);
    for(const item of config.items)if(!config.rarities[item.rarity])throw Error('Unknown item rarity: '+item.id);
    for(const pool of Object.values(config.pools)){
      for(const [id,weight] of Object.entries(pool.rarityWeights??{}))if(!config.rarities[id]||!Number.isFinite(weight)||weight<0)throw Error('Invalid pool rarity weight: '+id);
      for(const [id,weight] of Object.entries(pool.itemWeights??{}))if(!pool.items.includes(id)||!Number.isFinite(weight)||weight<0)throw Error('Invalid pool item weight: '+id);
    }
    for(const item of config.items)for(const effect of Object.values(item.effects))if(!Object.values(effect).every(Number.isFinite)||(effect.multiply??1)<=0)throw Error('Invalid item effect: '+item.id);
    this.reset({});
  }
  reset(base,unlocks=[]){this.base={...base};this.unlocks=new Set(unlocks);this.stacks=new Map();this.queue=[];this.seen=new Set();this.rerolls=this.config.rerollsPerRun;this.version=(this.version??0)+1;}
  eligible(poolIds=this.config.activePools){
    if(!Array.isArray(poolIds)||!poolIds.length)throw Error('No item pools selected');
    const result=new Set();
    const stats=this.stats(),allowed=definition=>(definition.requires??[]).every(key=>this.unlocks.has(key))&&requirementsMet(definition.requirements,stats,this.unlocks);
    for(const id of poolIds){const pool=this.config.pools[id];if(!pool)throw Error('Unknown item pool: '+id);if(!allowed(pool))continue;
      for(const itemId of pool.items){const item=this.items.get(itemId);if(allowed(item)&&(pool.itemWeights?.[itemId]??1)>0&&(pool.rarityWeights?.[item.rarity]??this.config.rarities[item.rarity].weight)>0)result.add(itemId);}}
    return [...result];
  }
  request(source,pools=this.config.activePools){
    if(this.seen.has(source))return false;
    const eligible=this.eligible(pools);if(!eligible.length)throw Error('Selected item pools contain no unlocked items');
    const offer={source,pools:[...pools],roll:0,options:[]};this.draw(offer,eligible);this.seen.add(source);this.queue.push(offer);this.version++;return true;
  }
  draw(offer,eligible=this.eligible(offer.pools)){
    const old=new Set(offer.options),fresh=eligible.filter(id=>!old.has(id));
    const candidates=fresh.length>=Math.min(this.config.choices,eligible.length)?fresh:[...eligible];
    const rng=this.random.create('run-items',offer.source,offer.roll);
    const luck=Math.max(0,this.stats().luck??0),pools=offer.pools.map(id=>this.config.pools[id]).filter(pool=>(pool.requires??[]).every(id=>this.unlocks.has(id))&&requirementsMet(pool.requirements,this.stats(),this.unlocks));
    const pick=entries=>{let total=entries.reduce((sum,[,weight])=>sum+weight,0);if(!Number.isFinite(total)||total<=0)throw Error('No positive item weights');let roll=rng.float()*total;for(const [id,weight] of entries){roll-=weight;if(roll<0)return id;}return entries.at(-1)[0];};
    offer.options=[];while(candidates.length&&offer.options.length<this.config.choices){
      const groups=new Map();for(const id of candidates){const rarity=this.items.get(id).rarity;if(!groups.has(rarity))groups.set(rarity,[]);groups.get(rarity).push(id);}
      const weights=[...groups].map(([id,ids])=>{const rarity=this.config.rarities[id],owners=pools.filter(pool=>ids.some(item=>pool.items.includes(item)&&(pool.itemWeights?.[item]??1)>0));return [id,owners.reduce((sum,pool)=>sum+(pool.rarityWeights?.[id]??rarity.weight),0)/owners.length*Math.pow(1+luck/100,rarity.luckPower)];});
      const rarity=pick(weights),ids=groups.get(rarity);
      const id=pick(ids.map(id=>{const owners=pools.filter(pool=>pool.items.includes(id)&&(pool.rarityWeights?.[rarity]??this.config.rarities[rarity].weight)>0);return [id,owners.reduce((sum,pool)=>sum+(pool.itemWeights?.[id]??1),0)/owners.length];}));
      offer.options.push(id);candidates.splice(candidates.indexOf(id),1);
    }
  }
  rarity(id){return this.config.rarities[this.items.get(id).rarity];}
  get pending(){return this.queue[0]??null;}
  get canReroll(){return !!this.pending&&this.rerolls>0&&this.eligible(this.pending.pools).some(id=>!this.pending.options.includes(id));}
  reroll(){if(!this.canReroll)return false;this.pending.roll++;this.draw(this.pending);this.rerolls--;this.version++;return true;}
  choose(id){
    if(!this.pending?.options.includes(id)||!this.eligible(this.pending.pools).includes(id))return null;
    const item=this.items.get(id);this.stacks.set(id,(this.stacks.get(id)??0)+1);this.queue.shift();this.version++;return item;
  }
  stats(){const result={...this.base};for(const [id,count] of this.stacks)for(const [stat,effect] of Object.entries(this.items.get(id).effects)){
    if(typeof this.base[stat]!=='number')throw Error('Unknown run item stat: '+stat);
    // Additions stack linearly, percentage effects stack multiplicatively.
    result[stat]=(result[stat]??0)+(effect.add??0)*count;
  }
    for(const [id,count] of this.stacks)for(const [stat,effect] of Object.entries(this.items.get(id).effects))result[stat]*=Math.pow(effect.multiply??1,count);
    return result;
  }
  apply(target){Object.assign(target,this.stats());}
}
