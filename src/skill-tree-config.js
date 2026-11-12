import {SKILL_ICONS,LEGACY_SKILL_ICONS} from './skill-icons.js';
const fail=message=>{throw new Error('skill-tree.json: '+message);};
const text=value=>typeof value==='string'&&value.trim().length>0;

export function compileSkillTree(config){
  if(!config?.baseStats||typeof config.baseStats!=='object'||Array.isArray(config.baseStats))fail('нужен объект baseStats');
  for(const [key,value] of Object.entries(config.baseStats))if(typeof value!=='boolean'&&!Number.isFinite(value))fail('некорректный baseStats.'+key);
  if(!Array.isArray(config.branches)||!config.branches.length)fail('branches должен содержать хотя бы одну ветку');
  const ids=new Set(),branchIds=new Set();
  const branches=config.root?[{id:'source',name:'Источник',nodes:[config.root],isRoot:true},...config.branches]:config.branches;
  const skills=branches.flatMap((branch,index)=>{
    const ray=index-(config.root?1:0);
    if(!text(branch.id)||branchIds.has(branch.id))fail('повторяющийся или пустой id ветки: '+branch.id);
    branchIds.add(branch.id);
    if(!text(branch.name)||!Array.isArray(branch.nodes)||!branch.nodes.length)fail('у ветки '+branch.id+' нужны name и непустой nodes');
    return branch.nodes.map((node,tier)=>{
      if(!text(node.id)||ids.has(node.id))fail('повторяющийся или пустой id навыка: '+node.id);
      ids.add(node.id);
      if(!text(node.name)||!text(node.description))fail('у '+node.id+' нужны name и description');
      const cost=node.cost??1,requires=Object.hasOwn(node,'requires')?node.requires:(tier?branch.nodes[tier-1].id:branch.isRoot?null:config.root?.id??null),icon=node.icon??'sun-core';
      if(!Number.isInteger(cost)||cost<0)fail('cost у '+node.id+' должен быть целым числом от 0');
      if(requires!==null&&!text(requires))fail('requires у '+node.id+' должен быть id или null');
      if(!(typeof icon==='string'&&Object.hasOwn(SKILL_ICONS,icon))&&!(Number.isInteger(icon)&&icon>=0&&icon<LEGACY_SKILL_ICONS.length))fail('неизвестный icon у '+node.id+': '+icon);
      const effects=node.effects??{};
      if(typeof effects!=='object'||!effects||Array.isArray(effects))fail('effects у '+node.id+' должен быть объектом');
      for(const [stat,effect] of Object.entries(effects)){
        if(!Object.hasOwn(config.baseStats,stat))fail('неизвестный параметр '+stat+' у '+node.id);
        const ops=effect&&typeof effect==='object'?Object.keys(effect):[];
        if(ops.length!==1||!['add','multiply','set'].includes(ops[0]))fail('эффект '+node.id+'.'+stat+' должен содержать одну операцию: add, multiply или set');
        const op=ops[0],value=effect[op],type=typeof config.baseStats[stat];
        if(type==='boolean'?(op!=='set'||typeof value!=='boolean'):!Number.isFinite(value))fail('неверное значение эффекта '+node.id+'.'+stat);
      }
      return Object.freeze({id:node.id,name:node.name,description:node.description,cost,requires,icon,effects,isRoot:!!branch.isRoot,branch:branch.name,branchId:branch.id,ray,tier,tiers:branch.nodes.length});
    });
  });
  const byId=new Map(skills.map(s=>[s.id,s])),done=new Set(),visiting=new Set();
  const visit=skill=>{
    if(done.has(skill.id))return;
    if(visiting.has(skill.id))fail('цикл зависимостей у '+skill.id);
    visiting.add(skill.id);
    if(skill.requires){const parent=byId.get(skill.requires);if(!parent)fail('не найден requires '+skill.requires+' у '+skill.id);visit(parent);}
    visiting.delete(skill.id);done.add(skill.id);
  };
  skills.forEach(visit);
  return {skills:Object.freeze(skills),branchCount:config.branches.length,baseStats:Object.freeze({...config.baseStats})};
}

export function evaluateSkillEffects(baseStats,skills,owned){
  const result={...baseStats},learned=new Set(owned),done=new Set(),byId=new Map(skills.map(s=>[s.id,s]));
  const apply=skill=>{
    if(!learned.has(skill.id)||done.has(skill.id))return;
    if(skill.requires)apply(byId.get(skill.requires));
    for(const [stat,effect] of Object.entries(skill.effects)){
      if(Object.hasOwn(effect,'set'))result[stat]=effect.set;
      else if(Object.hasOwn(effect,'add'))result[stat]+=effect.add;
      else result[stat]*=effect.multiply;
    }
    done.add(skill.id);
  };
  // Editing the visual order must not change how existing effects combine.
  [...skills].sort((a,b)=>a.id.localeCompare(b.id)).forEach(apply);
  return Object.freeze(result);
}
