import * as THREE from 'three';

export function rebuildShadowCat(o,head,legs,tail,fur,red,eyeCore,random){
  const obsolete=[];o.traverse(mesh=>{if(mesh.isMesh&&mesh.material===fur)obsolete.push(mesh);});obsolete.forEach(mesh=>mesh.removeFromParent());
  const rock=new THREE.IcosahedronGeometry(1,2);
  const add=(parent,p,size)=>{const m=new THREE.Mesh(rock,fur);m.position.set(...p);m.scale.set(...size);parent.add(m);return m;};
  add(o,[0,.80,-.17],[.46,.51,.74]);add(o,[0,.94,.22],[.38,.49,.41]);
  head.position.set(0,1.04,.38);
  const skullGeometry=new THREE.IcosahedronGeometry(.43,2),skullPositions=skullGeometry.attributes.position;
  for(let i=0;i<skullPositions.count;i++){
    const x=skullPositions.getX(i),y=skullPositions.getY(i),z=skullPositions.getZ(i);
    const jaw=1-THREE.MathUtils.smoothstep(y,-.34,-.045),front=THREE.MathUtils.smoothstep(z,-.04,.28);
    const fracture=Math.sin(x*31+y*19+z*23)*.014;
    skullPositions.setXYZ(i,x*(1-jaw*.49)+fracture*(1-front),y-jaw*front*.045,z+jaw*front*.26+fracture);
  }
  skullGeometry.computeVertexNormals();head.add(new THREE.Mesh(skullGeometry,fur));
  // A narrow hooked muzzle, rather than rounded cheeks and a spherical chin.
  const muzzleGeometry=new THREE.BufferGeometry();
  muzzleGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -.23,-.12,.30, .21,-.10,.30, .025,-.22,.67,
    .21,-.10,.30, .105,-.31,.28, .025,-.22,.67,
    .105,-.31,.28, -.11,-.33,.27, .025,-.22,.67,
    -.11,-.33,.27, -.23,-.12,.30, .025,-.22,.67
  ],3));muzzleGeometry.computeVertexNormals();head.add(new THREE.Mesh(muzzleGeometry,fur));
  function tuft(parent,points,width){
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geometry=new THREE.TubeGeometry(path,12,width,5,false),positions=geometry.attributes.position,v=new THREE.Vector3();
    for(let row=0;row<=12;row++){const t=row/12,center=path.getPointAt(t);for(let j=0;j<=5;j++){const k=row*6+j;v.fromBufferAttribute(positions,k).sub(center).multiplyScalar((1-t)**1.25*(1+Math.sin(t*13)*.14)).add(center);positions.setXYZ(k,v.x,v.y,v.z);}}
    geometry.computeVertexNormals();const m=new THREE.Mesh(geometry,fur);parent.add(m);return m;
  }
  for(const side of [-1,1]){
    tuft(head,[[side*.27,.24,-.03],[side*.36,.48,-.09],[side*(side<0?.40:.34),side<0?.82:.69,-.13]],.20);
    tuft(head,[[side*.30,-.08,.05],[side*.48,-.16,-.02],[side*.65,-.11,-.18]],.14);
    tuft(head,[[side*.27,.14,.23],[side*.18,.12,.36],[side*.06,.055,.42]],.075);
    tuft(head,[[side*.30,-.16,.11],[side*.39,-.30,.01],[side*(side<0?.50:.43),-.40,-.15]],.11);
  }
  for(let i=0;i<11;i++){
    const z=-.60+random()*.92,side=i%2?1:-1,y=.65+random()*.48;
    tuft(o,[[side*.36,y,z],[side*(.46+random()*.08),y+.09,z-.17],[side*(.53+random()*.15),y+.02+random()*.16,z-.36-random()*.18]],.09+random()*.06);
  }
  legs.forEach((leg,i)=>{leg.position.set((i%2?1:-1)*.35,.58,i<2?-.48:.40);add(leg,[0,-.19,0],[.13,.27,.14]);add(leg,[0,-.43,.10],[.20,.12,.25]);});
  tail.position.set(0,.80,-.68);
  tuft(tail,[[0,0,0],[.14,.12,-.45],[.32,.46,-.80],[.12,.81,-.98],[-.14,.86,-.83]],.12);
  for(const child of head.children){
    if(child.isMesh&&(child.material===red||child.material===eyeCore)){
      const side=Math.sign(child.position.x),core=child.material===eyeCore,shape=new THREE.Shape();
      shape.moveTo(side*.16,.09);shape.quadraticCurveTo(0,.045,-side*.13,-.06);shape.quadraticCurveTo(side*.10,-.13,side*.16,.09);
      let g=new THREE.ShapeGeometry(shape,20);if(g.index)g=g.toNonIndexed();const p=g.attributes.position;
      const scale=core?.65:1,r=core?.443:.438;child.position.set(side*.18,.015,0);child.scale.setScalar(1);child.rotation.set(0,0,0);
      for(let i=0;i<p.count;i++){const x=p.getX(i)*scale,y=p.getY(i)*scale;p.setXYZ(i,x,y,Math.sqrt(Math.max(.01,r*r-(x+child.position.x)**2-(y+child.position.y)**2)));}
      g.computeVertexNormals();child.geometry=g;
    }else if(child.isSprite){child.position.set(Math.sign(child.position.x)*.18,.015,.409);child.scale.multiplyScalar(.7);}
  }
}
