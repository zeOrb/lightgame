// One bounded task per idle slot. A timeout also permits progress on busy devices.
export function uiIdle(){
  return new Promise(resolve=>{
    if(globalThis.requestIdleCallback)requestIdleCallback(resolve,{timeout:1000});
    else setTimeout(resolve,32);
  });
}
export class UIPreparation {
  constructor(steps){this.steps=steps;this.state='idle';this.promise=null;}
  prepare(){
    if(this.promise)return this.promise;
    this.state='loading';
    this.promise=(async()=>{for(const step of this.steps){await uiIdle();await step();}this.state='ready';})().catch(error=>{this.state='failed';this.promise=null;throw error;});
    return this.promise;
  }
}
export async function decodeUIImages(urls){
  await Promise.all(urls.map(async url=>{const image=new Image();image.src=url;await image.decode();}));
}
