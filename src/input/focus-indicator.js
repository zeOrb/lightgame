import './focus-indicator.css';
// Presentation adapter only: selection and input routing remain immediate.
export class FocusIndicator{
  constructor(){
    this.element=document.createElement('div');this.element.className='gamepad-focus-indicator';
    this.element.setAttribute('aria-hidden','true');document.body.append(this.element);
    this.visible=false;this.previousRect='';this.target=null;
  }
  update(target,scheme){
    const controller=scheme==='xbox'||scheme==='playstation';
    // Graph nodes render their own diamond highlight beneath the detail card.
    const node=target?.matches?.('.skill-node');
    const selfRendered=target?.matches?.('[data-focus-presentation="self"]');
    const eligible=!node&&(controller||target?.matches?.(':focus-visible'))&&target?.matches?.('button,select,input')&&target.getClientRects().length>0;
    this.element.hidden=!!(node||selfRendered);
    if(this.target!==target||!eligible){this.target?.classList.remove('has-input-focus');this.target=null;}
    if(!eligible){this.element.classList.remove('is-visible');this.visible=false;this.previousRect='';return;}
    this.target=target;target.classList.add('has-input-focus');
    if(selfRendered){this.element.classList.remove('is-visible');this.visible=false;this.previousRect='';return;}
    const rect=target.getBoundingClientRect(),key=[rect.left,rect.top,rect.width,rect.height].join(':');
    if(key===this.previousRect&&this.visible)return;
    this.previousRect=key;
    // Initial appearance fades in at the target instead of flying in from (0,0).
    if(!this.visible)this.element.classList.add('is-initial');
    this.element.style.transform=`translate(${rect.left-2}px,${rect.top-2}px)`;
    this.element.style.width=rect.width+4+'px';this.element.style.height=rect.height+4+'px';
    if(!this.visible){this.element.getBoundingClientRect();this.element.classList.remove('is-initial');}
    this.element.classList.add('is-visible');this.visible=true;
  }
}
