// Cooperative preparation keeps DOM menus responsive between procedural build steps.
let lastYield=0;
export async function preparationStep(stage){
 document.documentElement.dataset.preparationStage=stage;
 if(performance.now()-lastYield<6)return;
 await new Promise(resolve=>setTimeout(resolve,0));lastYield=performance.now();
}
export class Preparation {
 constructor(load){this.load=load;this.state='idle';this.promise=null;this.value=null;}
 prepare(){if(this.promise)return this.promise;this.state='loading';this.promise=Promise.resolve().then(this.load).then(value=>{this.state='ready';return this.value=value;},error=>{this.state='failed';throw error;});return this.promise;}
}
