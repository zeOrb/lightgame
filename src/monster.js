export class EnemyAction {
 constructor(name,defaults){this.name=name;this.defaults=Object.freeze({...defaults});}
 parameters(monster,requested){return {...this.defaults,...requested};}
 validate(){}
 tick(){throw Error('Action.tick must be implemented');}
}
export class JumpAction extends EnemyAction {
 constructor(){super('jump',{height:.8,duration:.6});}
 parameters(monster,requested){return {...this.defaults,height:monster.stats?.hopHeight??this.defaults.height,...requested};}
 validate(p){if(!Number.isFinite(p.height)||p.height<0||!Number.isFinite(p.duration)||p.duration<=0)throw Error('Invalid jump parameters');}
 tick(monster,context,dt,state,requested){
  if(!state.parameters){state.parameters=monster.resolveActionParameters(this.name,requested);state.from=monster.lane;state.to=context.playerLane??monster.lane;}
  state.age=(state.age??0)+dt;const t=Math.min(1,state.age/state.parameters.duration),leap=t>=1?0:Math.sin(Math.PI*t);
  context.pose.leap=leap;context.pose.height=leap*state.parameters.height;monster.lane=state.from+(state.to-state.from)*t;return t>=1?'success':'running';
 }
}
// Shared action implementations are stateless; execution memory belongs to each tree node.
const commonActions=new Map([['jump',new JumpAction()]]);
export class Monster {
 constructor(){this.actions=new Map(commonActions);}
 modifyActionParameters(name,parameters){
  for(const [key,modifier] of Object.entries(this.stats?.actionModifiers?.[name]??{})){
   if(typeof modifier==='number')parameters[key]=modifier;
   else parameters[key]=parameters[key]*(modifier.multiply??1)+(modifier.add??0);
  }
  return parameters;
 }
 resolveActionParameters(name,requested={}){const action=this.actions.get(name);if(!action)throw Error('Unknown monster action '+name);const parameters=this.modifyActionParameters(name,action.parameters(this,requested));action.validate(parameters);return Object.freeze({...parameters});}
 performAction(name,context,dt,state,parameters){const action=this.actions.get(name);if(!action)throw Error('Unknown monster action '+name);return action.tick(this,context,dt,state,parameters);}
}
