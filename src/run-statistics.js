import {RunSummary,runTime} from './run-summary.js';
import {tr,getLanguage} from './i18n.js';
import {renderLocalized} from './localized-text.js';
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export class RunStatistics extends RunSummary {
  constructor(items,history,onBack){super(items,onBack,{id:'run-statistics'});this.archive=history;this.selected=0;this.compare=true;this.detail=new RunSummary(items,()=>{this.detail.close();this.element.hidden=false;this.render();},{id:'run-history-detail'});this.detail.continueLabel='Back';}
  get isOpen(){return !this.element.hidden||!!this.detail?.isOpen;}
  open(){this.selected=0;this.element.hidden=false;this.render();}
  close(){super.close();this.detail?.close();}
  handleInput(frame){if(this.detail.isOpen){if(frame.uiPressed.has('cancel')){this.detail.close();this.element.hidden=false;this.render();}else this.detail.handleInput(frame);return;}if(frame.uiPressed.has('cancel')){this.close();this.onContinue();return;}super.handleInput(frame);}
  render(){
    if(!this.archive||this.detail?.isOpen)return;
    const {lifetime,recent}=this.archive.snapshot();this.selected=Math.min(this.selected,Math.max(0,recent.length-1));this.element.replaceChildren();const panel=node('div','run-summary-panel'),title=node('h2',null,tr('Statistics'));title.id=this.element.id+'-title';panel.append(title,node('div','summary-ornament'),node('p','summary-outcome',tr('All runs')));
    const metrics=node('div','summary-metrics');for(const [label,value] of [[tr('Runs'),lifetime.runs],[tr('Victories'),lifetime.wins],[tr('Total run time'),runTime(lifetime.duration)],[tr('Gems collected'),lifetime.totals.gems??0],[tr('Run points'),lifetime.totals.points??0],[tr('Enemies defeated'),lifetime.totals.kills??0],[tr('Floors completed'),lifetime.floors]]){const m=node('div');m.append(node('strong',null,String(value)),node('span',null,label));metrics.append(m);}panel.append(metrics,node('h3',null,tr('Last five runs')));
    if(recent.length){
      const runs=node('div','summary-history');recent.forEach((run,index)=>{const button=node('button','summary-history-run');button.setAttribute('aria-pressed',String(index===this.selected));const date=new Intl.DateTimeFormat(getLanguage(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(run.date));button.append(node('strong',null,date),node('small',null,tr('Points: {points} · {time}',{points:run.totals.points,time:runTime(run.duration)})));button.onclick=()=>{this.selected=index;this.render();this.element.querySelectorAll('.summary-history-run')[index]?.focus();};runs.append(button);});panel.append(runs);
      this.snapshot=recent[this.selected];this.drawChart(panel,this.compare?recent.filter((_,i)=>i!==this.selected):[]);
      const controls=node('div','summary-history-actions'),compare=node('button',null,tr('Compare curves')),inspect=node('button',null,tr('View run'));compare.setAttribute('aria-pressed',String(this.compare));compare.onclick=()=>{this.compare=!this.compare;this.render();this.element.querySelector('.summary-history-actions button')?.focus();};inspect.onclick=()=>{this.element.hidden=true;this.detail.open(this.snapshot);};controls.append(compare,inspect);panel.append(controls);
    }else panel.append(node('p','summary-empty',tr('No completed runs yet')));
    panel.append(node('h3',null,tr('Collected items')));const list=node('div','summary-item-distribution'),entries=Object.entries(lifetime.items).sort((a,b)=>b[1]-a[1]),total=entries.reduce((sum,[,count])=>sum+count,0);
    for(const [id,count] of entries){const item=this.items.items.get(id),row=node('div','summary-distribution-row'),icon=node('span','summary-diamond'),info=node('div','summary-distribution-info'),head=node('div','summary-distribution-heading');row.style.setProperty('--item-color',item?this.items.rarity(id).color:'#dfcf9c');icon.append(node('span',null,item?.symbol??'◇'));const share=count/total*100;head.append(node('strong',null,item?tr(item.name):id),node('small',null,count+' · '+share.toFixed(1)+'%'));const bar=node('div','summary-distribution-track'),fill=node('span');fill.style.width=share+'%';bar.setAttribute('role','meter');bar.setAttribute('aria-label',item?tr(item.name):id);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(share));bar.append(fill);info.append(head,bar);row.append(icon,info);list.append(row);}
    for(const [index,row] of [...list.children].entries()){
      const item=this.items.items.get(entries[index][0]);
      if(!item)continue;
      const diamond=row.querySelector('.summary-diamond');
      const trigger=node('button','summary-distribution-trigger');
      const tooltip=node('div','summary-distribution-tooltip');
      tooltip.id=`distribution-effect-${index}`;
      tooltip.setAttribute('role','tooltip');
      trigger.setAttribute('aria-label',tr(item.name));
      trigger.setAttribute('aria-describedby',tooltip.id);
      renderLocalized(tooltip,item.description);
      diamond.replaceWith(trigger);
      trigger.append(diamond);
      trigger.after(tooltip);
    }
    if(!entries.length)list.append(node('p','summary-empty',tr('No items collected')));panel.append(list);const back=node('button','summary-continue',tr('Back'));back.onclick=()=>{this.close();this.onContinue();};panel.append(back);this.element.append(panel);back.focus({preventScroll:true});
  }
}
