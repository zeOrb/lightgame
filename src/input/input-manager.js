// Engine-independent arbitration. No DOM, game state, key codes or pad indices.
export class InputManager{
  constructor(){this.contexts=new Map();this.activeContext=null;this.blocked=new Set();this.lastHeld=new Set();this.previousHeld=new Set();this.scheme='keyboardMouse';}
  register(context){
    if(!context.id||this.contexts.has(context.id))throw new Error('Duplicate/missing input context: '+context.id);
    this.contexts.set(context.id,context);return ()=>this.contexts.delete(context.id);
  }
  resolve(){return [...this.contexts.values()].filter(c=>c.modal!==false&&c.enabled()).sort((a,b)=>b.priority-a.priority)[0]??null;}
  dispatchRaw(control){
    for(const context of [...this.contexts.values()].filter(c=>c.modal===false&&c.enabled()).sort((a,b)=>b.priority-a.priority)){
      if(context.handleRaw?.(control)===true)return true;
    }
    return this.resolve()?.handleRaw?.(control)===true;
  }
  clear(){for(const action of this.lastHeld)this.blocked.add(action);this.previousHeld.clear();}
  update(frame){
    // Application-level actions always run first, even with a modal or lost focus.
    for(const global of [...this.contexts.values()].filter(c=>c.modal===false&&c.enabled()).sort((a,b)=>b.priority-a.priority)){
      global.handle({...frame,context:global.id,map:global.map});
    }
    const context=frame.focused?this.resolve():null;
    const held=new Set([...frame.held,...frame.uiHeld]);
    if(context?.id!==this.activeContext?.id){
      // An input already down on the previous screen must be released first.
      for(const action of this.lastHeld)this.blocked.add(action);
      this.previousHeld.clear();this.activeContext=context;
    }
    for(const action of this.blocked)if(!held.has(action))this.blocked.delete(action);
    const filter=values=>new Set([...values].filter(a=>!this.blocked.has(a)));
    const gameplayHeld=filter(frame.held),uiHeld=filter(frame.uiHeld);
    const pressed=filter([...frame.pressed].filter(a=>!this.previousHeld.has(a))),uiPressed=filter(frame.uiPressed);
    const currentHeld=new Set([...gameplayHeld,...uiHeld]);
    const released=new Set([...this.previousHeld].filter(a=>!currentHeld.has(a)));
    this.lastHeld=held;this.previousHeld=context?currentHeld:new Set();
    if(frame.activity&&frame.focused)this.scheme=frame.scheme;
    if(!context)return false;
    context.handle({...frame,held:gameplayHeld,pressed,uiHeld,uiPressed,released,scheme:this.scheme,context:context.id,map:context.map,
      move:{x:Number(gameplayHeld.has('right'))-Number(gameplayHeld.has('left')),y:Number(gameplayHeld.has('forward'))-Number(gameplayHeld.has('back'))}});
    return true;
  }
}
