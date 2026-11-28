export const TreeStatus=Object.freeze({RUNNING:'running',SUCCESS:'success',FAILURE:'failure'});
export function validateStateTree(node,actions,conditions,depth=0){
 if(!node||depth>32)throw Error('Invalid state tree depth');
 if(['sequence','selector'].includes(node.type)){if(!Array.isArray(node.children)||!node.children.length)throw Error('Tree composite needs children');for(const child of node.children){if(child.priority!==undefined&&!Number.isFinite(child.priority))throw Error('Invalid tree priority');validateStateTree(child,actions,conditions,depth+1);}}
 else if(node.type==='repeat')validateStateTree(node.child,actions,conditions,depth+1);
 else if(node.type==='wait'){if(!Number.isFinite(node.seconds)||node.seconds<0)throw Error('Invalid wait duration');}
 else if(node.type==='action'){if(typeof actions[node.action]!=='function')throw Error('Unknown tree action '+node.action);}
 else if(node.type==='condition'){if(typeof conditions[node.condition]!=='function')throw Error('Unknown tree condition '+node.condition);}
 else throw Error('Unknown tree node '+node.type);
 return node;
}
export class StateTree {
 constructor(tree,{actions={},conditions={}}={}){validateStateTree(tree,actions,conditions);this.tree=tree;this.actions=actions;this.conditions=conditions;this.order=new WeakMap();const visit=n=>{if(n.children){this.order.set(n,n.type==='selector'?[...n.children].sort((a,b)=>(b.priority??0)-(a.priority??0)):n.children);n.children.forEach(visit);}if(n.child)visit(n.child);};visit(tree);this.reset();}
 reset(){this.memory=new WeakMap();}
 clear(node){this.memory.delete(node);for(const child of node.children??[])this.clear(child);if(node.child)this.clear(node.child);}
 tick(dt,context){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid behavior dt');return this.step(this.tree,dt,context);}
 step(n,dt,c){let m=this.memory.get(n);if(!m)this.memory.set(n,m={age:0,index:0});let result;
  if(n.type==='wait'){m.age+=dt;result=m.age+1e-9>=n.seconds?'success':'running';}
  else if(n.type==='condition')result=this.conditions[n.condition](c,n)?'success':'failure';
  else if(n.type==='action'){result=this.actions[n.action](c,dt,m,n);if(result!=='running'&&result!=='success'&&result!=='failure')throw Error('Invalid tree action result');}
  else if(n.type==='repeat'){result=this.step(n.child,dt,c);if(result!=='running')this.clear(n.child);return 'running';}
  else if(n.type==='sequence'){const children=this.order.get(n);result='success';while(m.index<children.length){result=this.step(children[m.index],dt,c);if(result!=='success')break;m.index++;dt=0;}}
  else {result='failure';for(const child of this.order.get(n)){const state=this.step(child,dt,c);if(state==='failure')continue;if(m.selected&&m.selected!==child)this.clear(m.selected);m.selected=child;result=state;break;}}
  if(result!=='running')this.clear(n);return result;
 }
}
