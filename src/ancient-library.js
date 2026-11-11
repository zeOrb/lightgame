import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {applyTowerDepth} from './tower-depth.js';
import {createVisualRandom} from './visual-random.js';

const palette=['#74523f','#52605c','#564c65','#77464a','#8a7250','#435367','#65513e','#48544a'];
export function libraryLayout(){
  const random=createVisualRandom('library-layout'),cases=[],books=[];
  for(let level=0;level<13;level++)for(let bay=0;bay<8;bay++){
    const angle=.18+Math.PI/8+bay*Math.PI/4,base=14+level*7;
    cases.push({angle,base,level,bay,rows:5});
  }
  // Window columns are book-filled too, except for the actual glass openings.
  for(let bay=0;bay<8;bay++){
    const angle=.18+bay*Math.PI/4;
    cases.push({angle,base:.5,level:-1,bay,rows:4});
    for(let y=10;y<95;y+=16){
      const base=y+3.2,end=Math.min(y+12.8,100.1),rows=Math.floor((end-base-.81)/1.18);
      if(rows>0)cases.push({angle,base,level:-1,bay,rows});
    }
  }
  for(let bay=0;bay<8;bay++)for(const side of [-1,1]){
    const angle=.18+bay*Math.PI/4;
    for(let y=10;y<95;y+=16)cases.push({angle:angle+side*.13,base:y-2.9,level:-2,bay,rows:4,width:1.05});
    cases.push({angle:angle+side*.16,base:100.3,level:-2,bay,rows:9,width:1.05});
  }
  for(const {angle,base,rows,width=5.1} of cases){
    for(let row=0;row<rows;row++)for(const side of [-1,1]){
      const half=width/2-.16;
      let x=side<0?-half:.12;const end=side<0?-.12:half,y=base+.18+row*1.18;
      // Irregular horizontal stacks interrupt otherwise densely packed rows.
      if(end-x>.9&&random()<.25){
        const count=3+Math.floor(random()*3),width=.6+random()*.22;
        for(let j=0;j<count;j++)books.push({angle,x:x+width/2,y:y+.065+j*.13,z:-.22+(random()-.5)*.1,w:width,h:.11,d:.65+random()*.13,tilt:(random()-.5)*.07,tile:Math.floor(random()*32)});
        x+=width+.07;
      }
      while(x<end-.13){
        const w=Math.min(end-x,.11+random()*.16),h=.63+random()*.43,d=.53+random()*.26;
        books.push({angle,x:x+w/2,y:y+h/2,z:-.24+(random()-.5)*.12,w,h,d,tilt:random()<.09?(random()-.5)*.18:0,tile:Math.floor(random()*32)});
        x+=w+.017+random()*.015;
      }
    }
  }
  return {cases,books};
}
function spineAtlas(){
  const random=createVisualRandom('library-spines'),canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d'),titles=['LUX','NOX','ASTRA','ARCANA','SILVA','SOL','UMBRA','HERBA'];
  for(let i=0;i<32;i++){
    const x=(i%8)*128,y=Math.floor(i/8)*128;
    const gradient=ctx.createLinearGradient(x,0,x+128,0);gradient.addColorStop(0,'#181411');gradient.addColorStop(.15,palette[i%8]);gradient.addColorStop(.55,palette[i%8]);gradient.addColorStop(1,'#211a18');
    ctx.fillStyle=gradient;ctx.fillRect(x,y,128,128);
    for(let j=0;j<100;j++){ctx.fillStyle=random()<.5?'#ffffff0a':'#00000016';ctx.fillRect(x+random()*128,y+random()*128,1+random()*3,1);}
    ctx.strokeStyle='#c9a66b99';ctx.lineWidth=1;ctx.strokeRect(x+12,y+7,104,114);
    for(const dy of [14,21,99,106]){ctx.fillStyle='#25180f88';ctx.fillRect(x+4,y+dy+2,120,3);ctx.fillStyle='#c4a26b99';ctx.fillRect(x+5,y+dy,118,2);}
    ctx.textAlign='center';ctx.fillStyle='#decb9999';ctx.font='bold 13px Georgia';ctx.fillText(titles[i%titles.length],x+64,y+49,94);
    ctx.font='9px Georgia';ctx.fillText('•  '+(i+1)+'  •',x+64,y+68);
    ctx.beginPath();ctx.moveTo(x+64,y+75);ctx.lineTo(x+75,y+83);ctx.lineTo(x+64,y+91);ctx.lineTo(x+53,y+83);ctx.closePath();ctx.stroke();
    for(let j=0;j<8;j++){ctx.strokeStyle='#d6bc8535';const yy=y+8+random()*112;ctx.beginPath();ctx.moveTo(x+6,yy);ctx.lineTo(x+12+random()*9,yy+random()*3);ctx.stroke();}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
export function createAncientLibrary(scene){
  const layout=libraryLayout(),group=new THREE.Group();group.name='Ancient library';scene.add(group);
  const material=color=>applyTowerDepth(new THREE.MeshStandardMaterial({color,roughness:.85}));
  const oak=material('#493a30'),recess=material('#231f1d'),brass=material('#8d7854');brass.metalness=.45;
  const leather=material('#5f4a3a'),pages=material('#a89c7d'),spines=material('#ffffff');spines.map=spineAtlas();
  // Continuous book-filled rear wall seals even the narrow gaps between cases.
  // The real windows and carved cases sit in front of this recessed layer.
  const random=createVisualRandom('library-back-wall'),wall=document.createElement('canvas');wall.width=wall.height=2048;
  const wc=wall.getContext('2d');wc.fillStyle='#34291f';wc.fillRect(0,0,2048,2048);
  for(let row=0;row<13;row++){
    const bottom=(row+1)*156-10;let x=0;
    while(x<2048){
      const width=16+random()*24,height=108+random()*34,tile=Math.floor(random()*32);
      wc.drawImage(spines.map.image,(tile%8)*128,Math.floor(tile/8)*128,128,128,x,bottom-height,width,height);x+=width+2;
    }
    wc.fillStyle='#231a15';wc.fillRect(0,bottom,2048,13);wc.fillStyle='#766047';wc.fillRect(0,bottom+1,2048,3);
  }
  const wallTexture=new THREE.CanvasTexture(wall);wallTexture.colorSpace=THREE.SRGBColorSpace;wallTexture.wrapS=wallTexture.wrapT=THREE.RepeatWrapping;wallTexture.repeat.set(8,132/15.6);wallTexture.anisotropy=4;
  const backdropMaterial=material('#d5c1a2');backdropMaterial.map=wallTexture;backdropMaterial.side=THREE.BackSide;
  const backdrop=new THREE.Mesh(new THREE.CylinderGeometry(18.96,18.96,132,128,1,true),backdropMaterial);backdrop.position.y=65;backdrop.name='Continuous book-lined wall';group.add(backdrop);
  const previous=spines.onBeforeCompile;
  spines.onBeforeCompile=shader=>{previous(shader);shader.vertexShader='attribute vec2 spineTile;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv=(vMapUv*.96+.02+spineTile)/vec2(8.,4.);');};
  spines.customProgramCacheKey=()=> 'ancient-library-spines-v1';
  const bookGeometry=new THREE.BoxGeometry(1,1,1),tiles=new Float32Array(layout.books.length*2);
  layout.books.forEach((b,i)=>tiles.set([b.tile%8,Math.floor(b.tile/8)],i*2));bookGeometry.setAttribute('spineTile',new THREE.InstancedBufferAttribute(tiles,2));
  const books=new THREE.InstancedMesh(bookGeometry,[leather,leather,pages,pages,leather,spines],layout.books.length);books.name='Thousands of embossed volumes';group.add(books);
  const dummy=new THREE.Object3D(),parent=new THREE.Object3D(),matrix=new THREE.Matrix4();
  function orient(angle,base=0,widthScale=1){parent.position.set(Math.cos(angle)*18.35,base,Math.sin(angle)*18.35);parent.rotation.y=Math.PI/2-angle;parent.scale.set(widthScale,1,1);parent.updateMatrix();}
  layout.books.forEach((b,i)=>{orient(b.angle);dummy.position.set(b.x,b.y,b.z);dummy.rotation.set(0,0,b.tilt);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();books.setMatrixAt(i,matrix.multiplyMatrices(parent.matrix,dummy.matrix));});books.instanceMatrix.needsUpdate=true;
  const frames=[],backs=[],fittings=[],arches=[];
  function piece(list,x,y,z,w,h,d){dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,d);dummy.updateMatrix();list.push(matrix.multiplyMatrices(parent.matrix,dummy.matrix).clone());}
  for(const cabinet of layout.cases){
    orient(cabinet.angle,cabinet.base,(cabinet.width??5.1)/5.1);
    const top=cabinet.rows*1.18;
    piece(backs,0,(top+.4)/2,.32,5.05,top+.4,.13);
    for(const x of [-2.55,0,2.55]){
      piece(frames,x,(top+.55)/2,-.08,x? .2:.13,top+.55,.98);
      piece(fittings,x,(top+.4)/2,-.59,.028,top+.25,.035);
      piece(frames,x,.17,-.12,.3,.25,1.08);piece(frames,x,top+.35,-.12,.32,.3,1.08);
    }
    for(let row=0;row<=cabinet.rows;row++){
      piece(frames,0,.11+row*1.18,-.14,5.25,.13,1.05);
      piece(fittings,0,.16+row*1.18,-.68,5.12,.025,.035);
    }
    piece(frames,0,top+.57,-.08,5.48,.21,1.14);piece(frames,0,top+.75,-.08,5.3,.12,1.03);
    for(const side of [-1,1]){
      const points=Array.from({length:17},(_,i)=>{const a=Math.PI*i/16;return new THREE.Vector3(side*1.27+Math.cos(a)*1.1,top+.08+Math.sin(a)*.34,-.69);});
      const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.025,4,false);geometry.applyMatrix4(parent.matrix);arches.push(geometry);
    }
  }
  for(const [list,mat,name] of [[frames,oak,'Carved oak cases'],[backs,recess,'Deep shelf recesses'],[fittings,brass,'Worn brass edges']]){
    const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,list.length);list.forEach((m,i)=>batch.setMatrixAt(i,m));batch.instanceMatrix.needsUpdate=true;batch.name=name;group.add(batch);
  }
  const archMesh=new THREE.Mesh(mergeGeometries(arches,false),brass);group.add(archMesh);arches.forEach(g=>g.dispose());
  // Warm lanterns are emissive geometry, without adding dozens of scene lights.
  const lanternMaterial=new THREE.MeshBasicMaterial({color:'#ffcf84',toneMapped:false});
  const lanterns=[],cages=[];
  for(const cabinet of layout.cases.filter(c=>c.level%4===0)){
    orient(cabinet.angle,cabinet.base);
    piece(cages,0,5.7,-1,.06,.7,.06);piece(cages,0,5.35,-1,.54,.07,.54);piece(cages,0,4.74,-1,.54,.09,.54);
    for(const x of [-.23,.23])for(const z of [-1.23,-.77])piece(cages,x,5.05,z,.035,.6,.035);
    piece(lanterns,0,5.05,-1,.35,.5,.35);
  }
  for(const [list,mat] of [[lanterns,lanternMaterial],[cages,brass]]){const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,list.length);list.forEach((m,i)=>batch.setMatrixAt(i,m));batch.instanceMatrix.needsUpdate=true;group.add(batch);}
  group.userData.bookCount=layout.books.length;group.userData.caseCount=layout.cases.length;
  return group;
}
