import config from './skill-tree.json' with {type:'json'};
import {compileSkillTree,evaluateSkillEffects} from './skill-tree-config.js';
const tree=compileSkillTree(config);
export const SKILLS=tree.skills,SKILL_BRANCH_COUNT=tree.branchCount,BASE_STATS=tree.baseStats;
export const SKILL_MAP_SIZE=Math.max(1600,2*(200+Math.max(...SKILLS.map(s=>s.tier))*170+90));
export const ROOT_SKILL=SKILLS.find(skill=>skill.isRoot);
export const PROGRESS_KEY='sunny.skill-tree.v1';
export function isSkillVisible(progress,id){const skill=SKILLS.find(s=>s.id===id);return !!skill&&(!ROOT_SKILL||skill.isRoot||progress.owned.includes(ROOT_SKILL.id))&&(!skill.requires||progress.owned.includes(skill.requires));}
export function isSkillPreview(progress,id){const skill=SKILLS.find(s=>s.id===id);return (!ROOT_SKILL||progress.owned.includes(ROOT_SKILL.id))&&!!skill?.requires&&!isSkillVisible(progress,id)&&isSkillVisible(progress,skill.requires);}
export function cleanProgress(value={}){
  const owned=[];for(const skill of SKILLS)if(Array.isArray(value?.owned)&&value.owned.includes(skill.id))owned.push(skill.id);
  // Existing learned trees keep their upgrades without paying a new entry fee.
  if(ROOT_SKILL&&owned.length&&!owned.includes(ROOT_SKILL.id))owned.unshift(ROOT_SKILL.id);
  return {points:Number.isFinite(value?.points)?Math.min(100000,Math.max(0,Math.floor(value.points))):0,owned};
}
export function skillStats(progress){return evaluateSkillEffects(BASE_STATS,SKILLS,progress.owned);}
export class SkillProgression {
  constructor(storage=null){this.storage=storage;let data;try{data=JSON.parse(storage?.getItem(PROGRESS_KEY)??'{}');}catch{}this.state=cleanProgress(data);}
  save(){try{this.storage?.setItem(PROGRESS_KEY,JSON.stringify(this.state));}catch{}}
  reset(){this.state=cleanProgress();this.save();}
  award(amount=1){this.state.points+=Math.max(0,Math.floor(amount));this.save();}
  canBuy(id){const skill=SKILLS.find(s=>s.id===id);return !!skill&&!this.state.owned.includes(id)&&this.state.points>=skill.cost&&(!skill.requires||this.state.owned.includes(skill.requires));}
  buy(id){if(!this.canBuy(id))return false;const skill=SKILLS.find(s=>s.id===id);this.state.points-=skill.cost;this.state.owned.push(id);this.save();return true;}
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const progression=new SkillProgression(storage);
export const RUN_UPGRADES=skillStats(progression.state);
