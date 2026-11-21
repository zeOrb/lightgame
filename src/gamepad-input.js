export const PAD_DEFAULTS={left:['a0-','b14'],right:['a0+','b15'],forward:['a1-','b12'],back:['a1+','b13'],jump:['b0'],dash:['b2','b5'],flare:['b3'],pause:['b9']};
export const padFamily=id=>/playstation|dualsense|dualshock|sony|054c/i.test(id)?'playstation':'xbox';
export function normalizePadBindings(raw){
  const result={},used=new Set();
  for(const [action,defaults] of Object.entries(PAD_DEFAULTS)){
    const list=Array.isArray(raw?.[action])?raw[action]:defaults;
    result[action]=list.filter(code=>typeof code==='string'&&/^(b([0-9]|1[0-6])|a[0-3][+-])$/.test(code)&&!used.has(code)&&used.add(code)).slice(0,2);
  }return result;
}
export function padTokens(pad,previous=new Set()){
  const result=new Set();
  pad.buttons.forEach((b,i)=>{if(i<=16&&(b.pressed||b.value>.55))result.add('b'+i);});
  pad.axes.slice(0,4).forEach((value,i)=>{for(const sign of [-1,1]){const code=`a${i}${sign<0?'-':'+'}`;if(value*sign>(previous.has(code)?.32:.55))result.add(code);}});
  return result;
}
export class GamepadInput{
  constructor(){this.previousByPad=new Map();this.identity=null;}
  poll(pads,profiles){
    const snapshots=[...pads].filter(p=>p?.connected&&p.mapping==='standard').map(pad=>{
      const identity=`${pad.index}:${pad.id}`,previous=this.previousByPad.get(identity),tokens=padTokens(pad,previous);
      return {pad,identity,tokens,previous:previous??tokens,edges:previous?[...tokens].filter(code=>!previous.has(code)):[]};
    });
    const live=new Set(snapshots.map(p=>p.identity));
    for(const id of this.previousByPad.keys())if(!live.has(id))this.previousByPad.delete(id);
    // Poll EVERY controller. Fresh input can take over from an idle/virtual pad.
    const active=snapshots.find(p=>p.edges.length>0)??snapshots.find(p=>p.identity===this.identity)??snapshots[0];
    for(const p of snapshots)this.previousByPad.set(p.identity,p.tokens);
    if(!active){this.identity=null;return {held:new Set(),pressed:new Set(),tokens:[],connected:false};}
    const {pad,identity,tokens,previous,edges}=active,family=padFamily(pad.id);
    this.identity=identity;
    const held=new Set(),pressed=new Set();
    for(const [action,binds] of Object.entries(profiles[family])){
      if(binds.some(code=>tokens.has(code)))held.add(action);
      if(binds.some(code=>edges.includes(code))&&!binds.some(code=>previous.has(code)))pressed.add(action);
    }
    return {held,pressed,tokens:edges,connected:true,family,activity:edges.length>0};
  }
}
export function gamepadWindowActive({hidden,documentFocused,desktopFocused}){
  return !hidden&&(typeof desktopFocused==='boolean'?desktopFocused:documentFocused);
}
