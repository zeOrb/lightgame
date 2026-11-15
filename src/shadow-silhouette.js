import * as THREE from 'three';

export function shadowSilhouette(material,random){
  const meshes=[];
  function thorn(start,direction,length,width,curl,ragged=true){
    const from=new THREE.Vector3(...start),d=new THREE.Vector3(...direction).normalize(),bend=new THREE.Vector3(...curl);
    const path=new THREE.CubicBezierCurve3(from,from.clone().addScaledVector(d,length*.32),from.clone().addScaledVector(d,length*.72).addScaledVector(bend,.45),from.clone().addScaledVector(d,length).add(bend));
    const positions=[],indices=[],levels=16,sides=7,q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),v=new THREE.Vector3();
    const ridges=Array.from({length:sides},()=>.72+random()*.55);
    for(let row=0;row<=levels;row++){
      const t=row/levels,center=path.getPoint(t),tangent=path.getTangent(t).normalize();q.setFromUnitVectors(up,tangent);
      // Uneven shoulders and stepped chips, rather than a straight cone edge.
      const shoulder=(1-t)**(ragged?1.05:1.8)*(1+Math.sin(t*8.4)*.24);
      const chip=ragged&&row%3===1?.72:1;
      for(let j=0;j<sides;j++){
        const a=j/sides*Math.PI*2,r=width*shoulder*chip*ridges[j];
        v.set(Math.cos(a)*r,0,Math.sin(a)*r).applyQuaternion(q).add(center);positions.push(v.x,v.y,v.z);
        if(row<levels){const k=row*sides+j,n=row*sides+(j+1)%sides;indices.push(k,n,k+sides,n,n+sides,k+sides);}
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.userData.shadowShell=true;mesh.userData.restMaterial=material;meshes.push(mesh);
  }
  // Deliberately unequal crown: off-centre tallest point and irregular gaps.
  for(const [x,y,z,dx,dy,dz,length,width,cx] of [
    [-.28,1.48,-.15,-.24,1,-.06,1.07,.25,-.16],
    [.30,1.47,-.13,.35,1,-.15,.67,.21,.08],
    [-.58,1.25,.03,-.72,.8,.02,.60,.24,-.12],
    [.62,1.22,.02,.7,.7,-.12,.84,.23,.11],
    [.01,1.48,-.49,.05,.8,-.5,.46,.22,-.08],
    [-.49,1.30,-.49,-.45,.6,-.65,.72,.20,.08],
    [.52,1.20,-.43,.7,.6,-.5,.35,.18,-.05]
  ])thorn([x,y,z],[dx,dy,dz],length*(.92+random()*.16),width,[cx,.02,(random()-.5)*.18]);
  // Broken side growths; no mirrored pairs or regular radial spacing.
  for(let i=0;i<9;i++){
    const a=i*2.39996+random()*.65,y=.50+random()*.64,r=Math.sqrt(Math.max(.1,.78**2-(y-.91)**2));
    const x=Math.sin(a)*r,z=Math.cos(a)*r;if(z>.50)continue;
    thorn([x,y,z],[x,.05+random()*.35,z],.18+random()**2*.6,.10+random()*.10,[(random()-.5)*.22,-random()*.24,(random()-.5)*.2]);
  }
  // Hanging shreds curve downward and sometimes fork into finer strands.
  for(let i=0;i<13;i++){
    const a=i*2.39996+random()*.8,x=Math.sin(a)*(.38+random()*.25),z=Math.cos(a)*(.38+random()*.25);
    const length=.27+random()**.8*.62,curl=[Math.sin(a+.9)*.25,-.04,Math.cos(a+.9)*.20];
    thorn([x,.36+random()*.15,z],[x*.4,-1,z*.4],length,.055+random()*.07,curl,false);
    if(i%3===0)thorn([x,.27,z],[x*.5,-1,z*.5],length*.62,.032,[-curl[0],0,-curl[2]],false);
  }
  return meshes;
}
