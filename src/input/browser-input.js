import {GamepadInput,gamepadWindowActive} from '../gamepad-input.js';
import {ACTION_CODES,canonicalKey} from '../settings-store.js';
const byCode=Object.fromEntries(Object.entries(ACTION_CODES).map(([action,code])=>[code,action]));
export function padUIActions(tokens){
  const mapping={b0:'submit',b1:'cancel',b4:'previousTab',b5:'nextTab',b9:'menu',b12:'up',b13:'down',b14:'left',b15:'right','a0-':'left','a0+':'right','a1-':'up','a1+':'down'};
  return new Set([...tokens].map(token=>mapping[token]).filter(Boolean));
}
export class BrowserInput{
  constructor({preferences,captureKeyboard=()=>false,onRaw=()=>false,onBlur=()=>{}}){
    this.preferences=preferences;this.captureKeyboard=captureKeyboard;this.pad=new GamepadInput();this.keyboard=new Map();this.touch=new Set();this.edges=new Set();this.uiEdges=new Set();this.lastScheme='keyboardMouse';this.activity=false;
    this.globalEdges=new Set();
    this.onKeyDown=e=>{
      if(e.code==='F11'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.globalEdges.add('toggleFullscreen');return;}
      if(onRaw({device:'keyboardMouse',code:e.code,repeat:e.repeat})){e.preventDefault();e.stopImmediatePropagation();return;}
      const action=byCode[canonicalKey(this.preferences(),e.code)];
      this.lastScheme='keyboardMouse';this.activity=true;
      if(action){if(!e.repeat&&!this.keyboard.has(e.code))this.edges.add(action);this.keyboard.set(e.code,action);}
      if(this.captureKeyboard()&&action)e.preventDefault();
      // DOM controls keep native typing, Enter/Space activation and Tab focus.
      if(!e.defaultPrevented&&!e.target?.matches?.('select,input,textarea')){
        if(e.code==='Escape'&&!e.repeat){this.uiEdges.add('cancel');e.preventDefault();}
        const navigation={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down'}[e.code];
        if(navigation&&!e.repeat){this.uiEdges.add(navigation);e.preventDefault();}
      }
    };
    this.onKeyUp=e=>this.keyboard.delete(e.code);
    this.onPointer=()=>{this.activity=true;this.lastScheme='keyboardMouse';};
    this.onBlur=()=>{this.clear();onBlur();};
    window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);
    window.addEventListener('pointerdown',this.onPointer);window.addEventListener('blur',this.onBlur);
  }
  clear(){this.keyboard.clear();this.touch.clear();this.edges.clear();this.uiEdges.clear();this.globalEdges.clear();}
  setTouch(code,down){const action=byCode[code];if(!action)return;if(down){if(!this.touch.has(action))this.edges.add(action);this.touch.add(action);this.lastScheme='touch';this.activity=true;}else this.touch.delete(action);}
  sample(){
    let pad;try{pad=this.pad.poll(navigator.getGamepads?.()??[],this.preferences().gamepads);}catch{pad={held:new Set(),pressed:new Set(),tokens:[],connected:false};}
    if(pad.activity){this.lastScheme=pad.family;this.activity=true;}
    const held=new Set([...this.keyboard.values(),...this.touch,...pad.held]);
    const uiPressed=new Set([...this.uiEdges,...padUIActions(pad.tokens)]);
    const frame={...pad,focused:gamepadWindowActive({hidden:document.hidden,documentFocused:document.hasFocus(),desktopFocused:window.sunnyDesktop?.isFocused?.()}),
      globalPressed:new Set(this.globalEdges),held,pressed:new Set([...this.edges,...pad.pressed]),uiPressed,uiHeld:padUIActions(this.pad.previousByPad.get(this.pad.identity)??[]),scheme:this.lastScheme,activity:this.activity};
    this.edges.clear();this.uiEdges.clear();this.globalEdges.clear();this.activity=false;return frame;
  }
  dispose(){window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);window.removeEventListener('pointerdown',this.onPointer);window.removeEventListener('blur',this.onBlur);}
}
