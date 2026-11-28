import {JumpAction} from './monster.js';
import config from './enemy-state-trees.json' with {type:'json'};
import {StateTree,validateStateTree} from './state-tree.js';
const conditions={
 'player-near':(c,n)=>Math.abs(c.playerS-c.enemy.s)<=n.sections&&Math.hypot(c.dx,c.dz)<=n.radius&&Math.abs(c.dy)<=n.verticalRange
};
const actions={
 jump(c,dt,m,n){const parameters=n.params??{...(n.duration!==undefined?{duration:n.duration}:{}),...(n.height!==undefined?{height:n.height}:{})};return c.enemy.performAction('jump',c,dt,m,parameters);}
};
for(const tree of Object.values(config.trees)){
 validateStateTree(tree,actions,conditions);
 const check=n=>{if(n.type==='action'&&n.action==='jump'){const action=new JumpAction();action.validate({...action.defaults,...(n.params??n)});}if(n.type==='condition'&&[n.sections,n.radius,n.verticalRange].some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid enemy range');for(const child of n.children??[])check(child);if(n.child)check(n.child);};check(tree);
}
export const ENEMY_STATE_TREES=config.trees;
export class EnemyBehavior {
 constructor(id){const tree=config.trees[id];if(!tree)throw Error('Unknown enemy state tree '+id);this.runtime=new StateTree(tree,{actions,conditions});this.pose={leap:0,height:0};this.context={pose:this.pose};}
 reset(){this.runtime.reset();this.pose.leap=0;this.pose.height=0;}
 update(dt,enemy,playerS,playerLane,dx,dy,dz){Object.assign(this.context,{enemy,playerS,playerLane,dx,dy,dz});this.pose.leap=0;this.runtime.tick(dt,this.context);return this.pose;}
}
