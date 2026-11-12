export function initializeMainMenu(){
  const menu=document.getElementById('intro');
  document.addEventListener('keydown',event=>{
    const modal=document.getElementById('modal');
    const surface=!modal.hidden?modal:!menu.hidden&&!document.body.classList.contains('playing')?menu:null;
    if(!surface||!['ArrowUp','ArrowDown'].includes(event.code))return;
    const buttons=[...surface.querySelectorAll('button')];
    event.preventDefault();
    const current=buttons.indexOf(document.activeElement),step=event.code==='ArrowDown'?1:-1;
    buttons[(current<0?0:(current+step+buttons.length)%buttons.length)].focus();
  });
}
