const FADE_MS=750;
export async function fadeToNextRun(navigate){
  document.documentElement.classList.add('run-leaving');
  await new Promise(resolve=>setTimeout(resolve,FADE_MS));
  navigate();
}

// Called after the first real 3D frame. Keep black across document loading,
// then reveal the ready level; gameplay stays frozen until the fade completes.
export function revealNextRun(onReady){
  const root=document.documentElement;
  if(!root.classList.contains('boot-run')){onReady();return;}
  root.classList.add('run-entering');root.classList.remove('boot-run');
  requestAnimationFrame(()=>{
    root.classList.remove('run-entering');
    setTimeout(onReady,FADE_MS);
  });
}
