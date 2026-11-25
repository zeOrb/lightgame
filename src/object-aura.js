import * as THREE from 'three';

let softTexture;
const attached=new WeakMap();
function texture(){
  if(softTexture)return softTexture;
  const size=64,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;
    pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(220*Math.exp(-r*r*2)*Math.max(0,1-r));
  }
  softTexture=new THREE.DataTexture(pixels,size,size);softTexture.needsUpdate=true;return softTexture;
}

// Any Object3D can opt in through visuals.aura. Offset and scale use the owner's
// local coordinates, so hiding, moving and scaling the owner also affects its aura.
// Geometry, collision and the owner's materials are never changed.
export function setObjectAura(object,visuals={}){
  const options=visuals.aura;
  let sprite=attached.get(object);
  if(options?.enabled!==true){
    if(sprite){sprite.removeFromParent();sprite.material.dispose();attached.delete(object);}return null;
  }
  const offset=options.offset??[0,0,0],scale=options.scale??[1,1,1],opacity=options.opacity??.75;
  for(const [name,value] of [['offset',offset],['scale',scale]])if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite))throw new TypeError('visuals.aura.'+name+' must contain three finite numbers');
  if(scale.some(v=>v<=0)||!Number.isFinite(opacity)||opacity<0||opacity>1)throw new RangeError('Invalid aura scale or opacity');
  const blend=options.blend??'additive';if(!['additive','normal'].includes(blend))throw new TypeError('Unknown aura blend: '+blend);
  if(!sprite){
    sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture(),transparent:true,depthWrite:false,toneMapped:false}));
    sprite.name='Object aura';object.add(sprite);attached.set(object,sprite);
  }
  sprite.position.fromArray(offset);sprite.scale.fromArray(scale);
  sprite.material.color.set(options.color??'#ffffff');sprite.material.opacity=opacity;
  sprite.material.blending=blend==='additive'?THREE.AdditiveBlending:THREE.NormalBlending;
  sprite.material.depthTest=options.depthTest??true;sprite.material.needsUpdate=true;return sprite;
}
