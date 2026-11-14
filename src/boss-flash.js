import * as THREE from 'three';

export function clearBossFlash(boss){
  if(!boss.dashFlash)return;
  for(const [mesh,material] of boss.dashFlash.surfaces)mesh.material=material;
  boss.dashFlash.surfaces=[];boss.dashFlash.age=1;
}
export function flashBossOnDash(boss){
  if(!boss.boss)return;
  clearBossFlash(boss);
  boss.dashFlash??={material:new THREE.MeshBasicMaterial({color:'#ffffff',fog:false,toneMapped:false}),surfaces:[],age:0};
  const flash=boss.dashFlash;flash.age=0;
  for(const mesh of boss.meshes){
    const material=mesh.material;
    if(!mesh.visible||!material.color||Math.max(material.color.r,material.color.g,material.color.b)>.12)continue;
    flash.surfaces.push([mesh,material]);mesh.material=flash.material;
  }
  flash.material.color.setRGB(3,3,3);
}
export function updateBossFlash(boss,dt){
  const flash=boss.dashFlash;if(!flash?.surfaces.length)return;
  flash.age+=dt;
  if(flash.age>=.18){clearBossFlash(boss);return;}
  const fade=1-THREE.MathUtils.smoothstep(flash.age,.035,.18);
  flash.material.color.setRGB(fade*3,fade*3,fade*3);
}
