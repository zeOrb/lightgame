const branches=[
  ['Жизнь',[
    ['heart','Тёплое сердце','Максимальный свет +25 HP.'],['heart2','Ядро солнца','Ещё +25 максимального HP.'],['lasting','Долгий закат','Пассивный расход света меньше на 18%.'],['shade','Янтарная кожа','Тени и удары снимают на 25% меньше света.'],
  ]],
  ['Движение',[
    ['speed','Быстрые лапки','Скорость движения по спирали +15%.'],['jump','Высокий прыжок','Начальная сила прыжка +15%.'],['double','Двойной прыжок','Пробел в воздухе: один дополнительный прыжок.'],['clarity','Ясный луч','Замедление и инверсия от склянок длятся вдвое меньше.'],
  ]],
  ['Phasing',[
    ['phaseCool','Короткая тень','Перезарядка Phasing на 25% быстрее.'],['phaseReach','Длинный луч','Дальность Phasing +20%.'],['phaseHeal','Свет из тени','Убийство дэшем восстанавливает 10 HP.'],['resonance','Резонанс','Каждое убийство дэшем сокращает его перезарядку на 0,5 с.'],
  ]],
  ['Свет',[
    ['shard','Полные осколки','Осколок лечит на 12 HP больше и по-прежнему даёт 1 очко.'],['magnet','Притяжение','Дальность подбора осколков увеличена.'],['regen','Цветение света','Лечение витража ускоряется на 30%.'],['flare','Солнечная вспышка','Новая способность E: уничтожает тени в радиусе 3 м. Кулдаун 8 с.'],
  ]],
  ['Башня',[
    ['floors','Выше башня','Следующий забег: ещё 2 этажа с полками и угрозами.'],['floors2','Бесконечная спираль','Ещё 2 этажа: всего 16.'],['abundance','Созвездие бликов','Осколки встречаются чаще: каждые 4 секции вместо 5.'],['lastLight','Последний огонёк','Один раз за забег при исчерпании HP возвращает 30% света. Не спасает от падения.'],
  ]],
];
export const SKILLS=branches.flatMap(([branch,nodes],ray)=>nodes.map(([id,name,description],tier)=>({id,name,description,branch,ray,tier,cost:1,requires:tier?nodes[tier-1][0]:null})));
export const PROGRESS_KEY='sunny.skill-tree.v1';
export function isSkillVisible(progress,id){const skill=SKILLS.find(s=>s.id===id);return !!skill&&(!skill.requires||progress.owned.includes(skill.requires));}
export function isSkillPreview(progress,id){const skill=SKILLS.find(s=>s.id===id);return !!skill?.requires&&!isSkillVisible(progress,id)&&isSkillVisible(progress,skill.requires);}
export function cleanProgress(value={}){
  const owned=[];for(const skill of SKILLS)if(Array.isArray(value?.owned)&&value.owned.includes(skill.id)&&(!skill.requires||owned.includes(skill.requires)))owned.push(skill.id);
  return {points:Number.isFinite(value?.points)?Math.min(100000,Math.max(0,Math.floor(value.points))):0,owned};
}
export function skillStats(progress){
  const has=id=>progress.owned.includes(id);
  return Object.freeze({maxHP:100+(has('heart')?25:0)+(has('heart2')?25:0),drainScale:has('lasting')?.82:1,damageScale:has('shade')?.75:1,speed:has('speed')?1.15:1,jump:has('jump')?1.15:1,doubleJump:has('double'),potionScale:has('clarity')?.5:1,phaseCooldown:has('phaseCool')?.75:1,phaseDistance:has('phaseReach')?1.2:1,phaseHeal:has('phaseHeal')?10:0,resonance:has('resonance'),shardHeal:has('shard')?34:22,magnet:has('magnet')?1.05:.65,regen:has('regen')?1.3:1,flare:has('flare'),extraFloors:(has('floors')?2:0)+(has('floors2')?2:0),glintSpacing:has('abundance')?4:5,lastLight:has('lastLight')});
}
export class SkillProgression {
  constructor(storage=null){this.storage=storage;let data;try{data=JSON.parse(storage?.getItem(PROGRESS_KEY)??'{}');}catch{}this.state=cleanProgress(data);}
  save(){try{this.storage?.setItem(PROGRESS_KEY,JSON.stringify(this.state));}catch{}}
  reset(){this.state=cleanProgress();this.save();}
  award(){this.state.points++;this.save();}
  canBuy(id){const skill=SKILLS.find(s=>s.id===id);return !!skill&&!this.state.owned.includes(id)&&this.state.points>=skill.cost&&(!skill.requires||this.state.owned.includes(skill.requires));}
  buy(id){if(!this.canBuy(id))return false;const skill=SKILLS.find(s=>s.id===id);this.state.points-=skill.cost;this.state.owned.push(id);this.save();return true;}
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const progression=new SkillProgression(storage);
export const RUN_UPGRADES=skillStats(progression.state);
