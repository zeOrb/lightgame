import * as THREE from 'three';

export function createRabbitTraveler(parent,material,eyeMaterial,sparkMaterial){
  const hemMaterial=material.clone();hemMaterial.onBeforeCompile=material.onBeforeCompile;hemMaterial.emissiveIntensity=3;
  const hemHalo=material.clone();hemHalo.onBeforeCompile=material.onBeforeCompile;hemHalo.transparent=true;hemHalo.opacity=.16;hemHalo.depthWrite=false;hemHalo.blending=THREE.AdditiveBlending;hemHalo.emissiveIntensity=3;
  const sphere=new THREE.SphereGeometry(1,16,12);
  const form=(root,position,scale)=>{const mesh=new THREE.Mesh(sphere,material);mesh.position.set(...position);mesh.scale.set(...scale);root.add(mesh);return mesh;};
  // Small rounded proportions and the original eye shapes keep the traveller a rabbit.
  form(parent,[0,.49,0],[.19,.26,.15]);
  const head=new THREE.Group();head.position.set(0,.7,.02);parent.add(head);
  const headPart=mesh=>{head.add(mesh);mesh.position.sub(head.position);return mesh;};
  headPart(form(parent,[0,.82,.075],[.245,.225,.21]));
  headPart(form(parent,[-.09,.75,.245],[.105,.075,.09]));headPart(form(parent,[.09,.75,.245],[.105,.075,.09]));
  const ears=[];
  for(const side of [-1,1]){
    const ear=new THREE.Group();ear.position.set(side*.125,.99,.025);headPart(ear);
    form(ear,[0,.18,0],[.075,.29,.065]);ear.rotation.z=-side*.165;ears.push(ear);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.046,12,10),eyeMaterial);eye.position.set(side*.09,.855,.266);eye.scale.set(.84,1.12,.55);headPart(eye);
    const spark=new THREE.Mesh(new THREE.SphereGeometry(.012,8,6),sparkMaterial);spark.position.set(side*.09-.009,.87,.289);headPart(spark);
  }
  // Swept forelock, raised collar and scarf, all sharing the HP/light material.
  for(let i=0;i<3;i++){const tuft=headPart(form(parent,[(i-1)*.045,1.015,.17-i*.015],[.046,.09,.035]));tuft.rotation.z=-.55-i*.12;}
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.16,.047,6,20),material);collar.position.set(0,.67,.005);collar.rotation.x=Math.PI/2;parent.add(collar);
  form(parent,[0,.675,.16],[.17,.055,.055]);
  const jacket=new THREE.Mesh(new THREE.CylinderGeometry(.16,.235,.36,12,1,true),material);jacket.position.set(0,.43,0);parent.add(jacket);
  for(let i=0;i<3;i++)form(parent,[.025,.56-i*.075,.163],[.018,.018,.014]);
  const paws=[],arms=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.12,.065,.08);parent.add(leg);
    form(leg,[0,.14,-.035],[.075,.18,.075]);
    form(leg,[0,0,.025],[.09,.065,.145]);paws.push(leg);
    const arm=new THREE.Group();arm.position.set(side*.225,.61,.015);parent.add(arm);
    form(arm,[side*.015,-.13,0],[.075,.16,.075]);
    form(arm,[side*.025,-.265,.04],[.065,.075,.065]);arms.push(arm);
    form(parent,[side*.20,.60,-.005],[.095,.065,.10]);
  }
  const coat=new THREE.Group();coat.position.set(0,.59,-.12);parent.add(coat);
  for(const side of [-1,1]){
    const shape=new THREE.Shape();shape.moveTo(side*.025,0);shape.lineTo(side*.19,.035);
    shape.bezierCurveTo(side*.25,-.14,side*.34,-.28,side*.34,-.46);
    shape.lineTo(side*.16,-.41);shape.lineTo(side*.035,-.47);shape.closePath();
    const panel=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:1,curveSegments:8}),material);
    panel.rotation.x=.33;panel.rotation.y=-side*.16;panel.userData.cloth='coat';panel.userData.clothPhase=side;coat.add(panel);
    const hemPath=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.34,-.46,.018),new THREE.Vector3(side*.16,-.41,.018),new THREE.Vector3(side*.035,-.47,.018)]);
    for(const [radius,glow] of [[.012,hemMaterial],[.036,hemHalo]]){
      const edge=new THREE.Mesh(new THREE.TubeGeometry(hemPath,20,radius,5,false),glow);edge.rotation.copy(panel.rotation);edge.userData.cloth='coat';edge.userData.clothPhase=side;coat.add(edge);
    }
  }
  // One flowing scarf end and a little tail visible below the coat.
  const scarf=new THREE.Shape();scarf.moveTo(-.03,.09);scarf.bezierCurveTo(-.23,.09,-.30,.04,-.36,.16);scarf.lineTo(-.39,.065);scarf.bezierCurveTo(-.27,-.04,-.17,.025,-.03,.015);scarf.closePath();
  const scarfEnd=new THREE.Mesh(new THREE.ExtrudeGeometry(scarf,{depth:.018,bevelEnabled:false,curveSegments:8}),material);scarfEnd.position.set(0,.02,-.02);scarfEnd.userData.cloth='scarf';coat.add(scarfEnd);
  form(parent,[0,.30,-.22],[.09,.09,.09]);
  return {head,ears,paws,coat,arms,hemMaterials:[hemMaterial,hemHalo]};
}
