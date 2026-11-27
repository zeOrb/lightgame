import {tr,getLanguage} from './i18n.js';
import './tower-descent-hud.css';

export class TowerDescentHUD {
  constructor(element,floors){
    this.element=element;
    this.floors=floors;
    this.completed=0;
    this.stageCount=new Set(floors.map(floor=>floor.stageIndex)).size;
    this.stageLabel=element.querySelector('.tower-descent__current-stage');
    this.floorLabel=element.querySelector('.tower-descent__current-floor');
    this.marks=element.querySelector('.tower-descent__marks');
    this.update(0,floors[0]);
  }

  showStage(stageIndex){
    this.stageIndex=stageIndex;
    this.stageFloors=this.floors.filter(floor=>floor.stageIndex===stageIndex);
    this.marks.replaceChildren();
    this.floorMarks=new Map();
    for(let index=0;index<=this.stageFloors.length;index++){
      const mark=document.createElement('span');
      mark.className='tower-descent__tick';
      mark.style.top=index/this.stageFloors.length*100+'%';
      if(index===0){
        mark.classList.add('tower-descent__stage','is-current-stage');
        this.numberMark=mark;
      }
      this.marks.append(mark);
      if(index<this.stageFloors.length)this.floorMarks.set(this.stageFloors[index].index,mark);
    }
    this.setProgress();
  }

  reset(){
    this.completed=0;
    this.floor=null;
    this.showStage(this.floors[0].stageIndex);
    this.update(0,this.floors[0]);
  }

  completeFloor(floor){
    this.completed=Math.max(this.completed,floor.index+1);
    this.setProgress();
  }

  setProgress(){
    const completed=this.completed-this.stageFloors[0].index;
    const percent=Math.min(100,Math.max(0,completed/this.stageFloors.length*100));
    this.element.style.setProperty('--descent-progress',percent+'%');
    this.element.setAttribute('aria-valuenow',Math.floor(percent));
  }

  update(section,floor){
    if(floor.stageIndex!==this.stageIndex)this.showStage(floor.stageIndex);
    const language=getLanguage();
    if(floor===this.floor&&language===this.language)return;
    this.floorMarks.get(this.floor?.index)?.classList.remove('is-current-floor');
    this.floorMarks.get(floor.index)?.classList.add('is-current-floor');
    this.numberMark.textContent=floor.index+1;
    this.floor=floor;
    this.language=language;
    this.stageLabel.textContent=tr('Stage {stage} / {total}',{stage:floor.stageIndex+1,total:this.stageCount});
    this.floorLabel.textContent=tr('Floor {floor} / {total}',{floor:this.stageFloors.indexOf(floor)+1,total:this.stageFloors.length});
    this.element.setAttribute('aria-valuetext',this.stageLabel.textContent+' · '+this.floorLabel.textContent);
  }
}
