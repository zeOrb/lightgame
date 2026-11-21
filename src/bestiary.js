import * as THREE from 'three';
import {ENEMY_CONFIG} from './enemy-config.js';
import {createEnemy} from './enemy-factory.js';
import {animateShadowBeast} from './shadow-beast.js';
import {ROUTE_RADIUS,ROUTE_ANGLE} from './game.js';
import {createBestiaryPedestal,addBestiaryShaft} from './bestiary-pedestal.js';
import {createBestiaryBackdrop} from './bestiary-backdrop.js';
import {bestiaryFog} from './bestiary-fog.js';
import './bestiary.css';

export function initializeBestiary(){
  const trigger=document.createElement('button');trigger.textContent='Бестиарий';trigger.className='text-button';
  document.getElementById('start').after(trigger);
  const panel=document.createElement('section');panel.id='bestiary';panel.hidden=true;
  panel.setAttribute('aria-label','Бестиарий');panel.innerHTML='<header><h1>Бестиарий</h1><button type="button">Вернуться в меню · Esc</button></header><div class="bestiary-stage"></div><div class="bestiary-name" aria-live="polite"></div>';
  document.body.append(panel);
  const stage=panel.querySelector('.bestiary-stage'),label=panel.querySelector('.bestiary-name'),back=panel.querySelector('button');
  const statsCard=document.createElement('aside');statsCard.className='bestiary-stats';statsCard.hidden=true;panel.append(statsCard);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerInside=false,hovered=null,wheelUntil=0;
  let renderer,scene,camera,fog,exhibits=[],active=false,target=0,position=0,time=0,last=0,drag=null;
  const spacing=5.4,definitions=ENEMY_CONFIG.enemies;
  function build(){
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));stage.append(renderer.domElement);
    scene=new THREE.Scene();scene.background=new THREE.Color('#0c0c10');scene.fog=new THREE.Fog('#0c0c10',15,36);
    camera=new THREE.PerspectiveCamera(39,1,.1,60);
    scene.add(new THREE.HemisphereLight('#e2d9c7','#17151e',2));
    const key=new THREE.DirectionalLight('#fff0d8',3);key.position.set(-3,7,5);scene.add(key);
    scene.add(createBestiaryBackdrop());
    exhibits=definitions.map((definition,i)=>{
      const pivot=new THREE.Group();pivot.position.x=i*spacing;scene.add(pivot);
      pivot.add(createBestiaryPedestal());addBestiaryShaft(scene,i*spacing);
      const enemy=createEnemy(definition.id,{s:i*.71});enemy.o.position.y=-.045;pivot.add(enemy.o);
      const stats=enemy.stats,collision=new THREE.Group();collision.visible=false;pivot.add(collision);
      const sphereCollider=stats.collider?.type==='sphere';
      const geometry=sphereCollider?new THREE.SphereGeometry(stats.collider.radius,24,16):enemy.boss?new THREE.CylinderGeometry(stats.contactRadius,stats.contactRadius,stats.contactHeight,40):new THREE.BoxGeometry(stats.laneRadius*2,stats.contactHeight,stats.contactSection*ROUTE_RADIUS*ROUTE_ANGLE*2);
      const outline=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:'#ff655d',transparent:true,opacity:.85,depthTest:false}));geometry.dispose();outline.position.y=-.045+stats.contactHeight/2;outline.renderOrder=10;collision.add(outline);
      if(sphereCollider){outline.position.y=-.045+stats.collider.centerY;outline.scale.copy(enemy.o.scale);}
      const pick=new THREE.Mesh(new THREE.BoxGeometry(1.9,enemy.boss?3:2,2),new THREE.MeshBasicMaterial({visible:false}));pick.position.y=enemy.boss?1.5:1;pivot.add(pick);
      const rim=new THREE.PointLight('#b6c5e0',4,5);rim.position.set(i*spacing,3,-1.8);scene.add(rim);
      return {pivot,enemy,collision,pick};
    });
    fog=bestiaryFog(scene);
  }
  function resize(){if(!renderer||!active)return;const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function move(amount){target=THREE.MathUtils.clamp(target+amount,0,(definitions.length-1)*spacing);}
  function snap(){target=Math.round(target/spacing)*spacing;}
  function showStats(exhibit){
    if(hovered===exhibit)return;hovered=exhibit;
    for(const entry of exhibits)entry.collision.visible=entry===exhibit;
    statsCard.hidden=!exhibit;if(!exhibit)return;
    const title=document.createElement('h2');title.textContent=exhibit.enemy.definition.name;
    const rows=document.createElement('dl');
    const names={hp:'Здоровье',scale:'Масштаб',stompTop:'Высота прыжкового попадания',trackRange:'Дальность слежения',trackRate:'Скорость слежения',hopSpeed:'Частота прыжков',hopHeight:'Высота прыжка',blockSection:'Блокировка пути (секции)',laneRadius:'Радиус поперёк полки',stompSection:'Попадание сверху (секции)',stompLaneRadius:'Попадание сверху поперёк',contactSection:'Контакт вдоль пути (секции)',contactHeight:'Высота контакта',contactRadius:'Радиус контакта',damage:'Урон',chaseSpeed:'Скорость преследования',chargeSpeed:'Скорость рывка'};
    for(const [key,value] of Object.entries(exhibit.enemy.stats)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key==='collider'?'Коллайдер':names[key]??key;dd.textContent=key==='collider'?`Сфера · R ${value.radius}`:Array.isArray(value)?value.join(' × '):String(value);rows.append(dt,dd);}
    const caption=document.createElement('p');caption.textContent='Красный контур — зона контактного урона';statsCard.replaceChildren(title,caption,rows);
  }
  function frame(now){if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;
    fog.update(dt);
    if(wheelUntil&&now>wheelUntil){snap();wheelUntil=0;}
    position=THREE.MathUtils.damp(position,target,9,dt);
    camera.position.set(position,3.2,8.6+Math.max(0,1-camera.aspect)*3);camera.lookAt(position,.95,0);
    for(const {pivot,enemy} of exhibits){pivot.rotation.y=time*.24;animateShadowBeast(enemy,time,0);}
    const index=Math.round(position/spacing);label.textContent=definitions[index].name;
    scene.updateMatrixWorld();camera.updateMatrixWorld();
    if(!statsCard.matches(':hover')){if(pointerInside&&drag===null){raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(exhibits.map(entry=>entry.pick),false)[0];showStats(hit?exhibits.find(entry=>entry.pick===hit.object):null);}else showStats(null);}
    renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  function close(){active=false;panel.hidden=true;document.body.classList.remove('bestiary-open');document.getElementById('intro').hidden=false;drag=null;pointerInside=false;showStats(null);snap();trigger.focus();}
  trigger.onclick=()=>{panel.hidden=false;document.getElementById('intro').hidden=true;document.body.classList.add('bestiary-open');active=true;if(!renderer)build();resize();last=performance.now();back.focus();requestAnimationFrame(frame);};
  back.onclick=close;
  panel.addEventListener('wheel',event=>{if(statsCard.contains(event.target))return;event.preventDefault();const now=performance.now(),delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;if(!delta)return;if(now>wheelUntil){snap();move(Math.sign(delta)*spacing);}wheelUntil=now+180;},{passive:false});
  stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;wheelUntil=0;drag={x:event.clientX,start:target,total:0};stage.setPointerCapture(event.pointerId);});
  stage.addEventListener('pointermove',event=>{const rect=stage.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);pointerInside=true;if(drag===null)return;const delta=drag.x-event.clientX;move(delta*.022);drag.total+=delta;drag.x=event.clientX;});
  stage.addEventListener('pointerleave',()=>{pointerInside=false;});
  const stop=()=>{if(drag&&Math.abs(drag.total)>24&&Math.round(target/spacing)===Math.round(drag.start/spacing))target=THREE.MathUtils.clamp(drag.start+Math.sign(drag.total)*spacing,0,(definitions.length-1)*spacing);drag=null;snap();};stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);stage.addEventListener('lostpointercapture',stop);

  document.addEventListener('sunny:bestiary-input',event=>{
    if(!active)return;const ui=event.detail.uiPressed;
    if(ui.has('cancel')||ui.has('submit')||ui.has('menu'))close();
    else if(ui.has('left'))move(-spacing);else if(ui.has('right'))move(spacing);
  });
  window.addEventListener('resize',resize);
}
