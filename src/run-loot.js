// Stable object identity, so opening one chest never advances another chest.
export function rollChestLoot(manager,floorId,section,[min,max],poolSize){
  if(!Number.isInteger(poolSize)||poolSize<1)throw new RangeError('Empty chest gem pool');
  const rng=manager.create('chests',floorId,section),count=rng.int(min,max);
  return Array.from({length:count},()=>rng.int(0,poolSize-1));
}
