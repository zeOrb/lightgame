import * as THREE from 'three';

let surfaces;
function pedestalAO(material){
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute vec3 pedestalPosition;varying vec3 vPedestalAO;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPedestalAO=pedestalPosition;');
    shader.fragmentShader='varying vec3 vPedestalAO;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 p=vPedestalAO;
      float radius=length(p.xz);
      float angle=atan(p.x,p.z);
      float sector=abs(atan(sin(angle*8.0),cos(angle*8.0)))/8.0;
      float ribDistance=sector*radius;
      float sideMask=smoothstep(1.20,1.34,radius);
      float underRim=exp(-abs(p.y+.23)*13.0)*sideMask;
      float footCrease=exp(-abs(p.y+.91)*15.0)*sideMask;
      float ribCrease=exp(-ribDistance*22.0)*sideMask*(1.0-smoothstep(-.22,-.10,p.y))*smoothstep(-1.04,-.88,p.y);
      float plaqueCrease=exp(-pow(ribDistance/.30,2.0)-pow((p.y+.52)/.28,2.0))*sideMask;
      float topCrease=smoothstep(1.02,1.4,radius)*exp(-abs(p.y+.0475)*32.0);
      float ao=clamp(underRim*.65+footCrease*.62+ribCrease*.50+plaqueCrease*.35+topCrease*.6,0.0,.88);
      outgoingLight*=1.0-ao;
      // Sink the lower masonry into the contact shadow without a visible seam.
      float baseShade=smoothstep(-1.085,-.84,p.y);
      outgoingLight=mix(vec3(.003,.003,.004),outgoingLight,baseShade);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=> 'bestiary-pedestal-contact-ao-v2';
}
function materials(){
  if(surfaces)return surfaces;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle='#4a4947';c.fillRect(0,0,512,512);
  for(let i=0;i<16000;i++){const v=45+Math.random()*80;c.fillStyle=`rgba(${v},${v},${v},.16)`;c.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*4,1+Math.random()*3);}
  // Irregular stone joints, with chipped bright lips beside the recesses.
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    let x=col*142+(row%2)*65,y=row*142;c.beginPath();c.moveTo(x,y);
    for(let j=0;j<7;j++){x+=(Math.random()-.5)*15;y+=24;c.lineTo(x,y);}
    c.strokeStyle='#171719';c.lineWidth=5;c.stroke();c.translate(2,0);c.strokeStyle='#77736b';c.lineWidth=1;c.stroke();c.translate(-2,0);
    c.beginPath();c.moveTo(col*142,row*142);c.lineTo(col*142+70,row*142+7);c.lineTo(col*142+142,row*142-3);c.strokeStyle='#222224';c.lineWidth=4;c.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const stone=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.13,color:'#38383e',roughness:.95,metalness:.05});
  const edge=stone.clone();edge.color.set('#62616a');
  const iron=new THREE.MeshStandardMaterial({color:'#121216',metalness:.65,roughness:.75});
  for(const material of [stone,edge,iron])pedestalAO(material);
  const runeCanvas=document.createElement('canvas');runeCanvas.width=runeCanvas.height=256;const r=runeCanvas.getContext('2d');
  r.strokeStyle='#ff5b3b';r.lineWidth=1.6;
  for(const radius of [68,78,94]){r.beginPath();r.arc(128,128,radius,0,Math.PI*2);r.stroke();}
  for(let j=0;j<12;j++){const a=j*Math.PI/6;r.save();r.translate(128,128);r.rotate(a);r.beginPath();r.moveTo(0,-105);r.lineTo(0,-61);r.moveTo(-5,-87);r.lineTo(5,-81);r.stroke();r.restore();}
  r.beginPath();r.moveTo(128,36);r.lineTo(194,166);r.lineTo(62,166);r.closePath();r.stroke();r.beginPath();r.arc(128,128,19,0,Math.PI*2);r.stroke();
  const rune=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(runeCanvas),transparent:true,opacity:1,depthWrite:false,toneMapped:false,color:new THREE.Color(2.8,1.15,.9),blending:THREE.AdditiveBlending});
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=256;const glow=glowCanvas.getContext('2d');
  for(const [blur,alpha] of [[18,.65],[7,.9]]){glow.filter=`blur(${blur}px)`;glow.globalAlpha=alpha;glow.drawImage(runeCanvas,24,24,208,208);}
  const runeGlow=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,opacity:1,depthWrite:false,toneMapped:false,color:new THREE.Color(2.2,.5,.24),blending:THREE.AdditiveBlending});
  // Shared radial masks keep the contact shadows cheap and independent of lights.
  const radialMask=stops=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(128,128,0,128,128,128);for(const [at,alpha] of stops)gradient.addColorStop(at,`rgba(0,0,0,${alpha})`);ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);return new THREE.CanvasTexture(canvas);};
  const groundShadow=new THREE.MeshBasicMaterial({map:radialMask([[0,.95],[.48,.95],[.60,.85],[.73,.45],[.9,.08],[1,0]]),transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
  const innerAO=new THREE.MeshBasicMaterial({map:radialMask([[0,0],[.40,.02],[.62,.15],[.80,.52],[.94,.90],[1,.98]]),transparent:true,depthWrite:false,toneMapped:false});
  return surfaces={stone,edge,iron,rune,runeGlow,groundShadow,innerAO};
}

export function createBestiaryPedestal(){
  const root=new THREE.Group(),{stone,edge,iron,rune,runeGlow,groundShadow,innerAO}=materials();
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(5.7,5.7),groundShadow);shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.092;root.add(shadow);
  const cylinder=(r,h,y,mat)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.025,h,64),mat);m.position.y=y;root.add(m);};
  cylinder(1.39,.8,-.55,stone);cylinder(1.78,.16,-1,edge);cylinder(1.49,.12,-.2,iron);cylinder(1.56,.17,-.11,edge);cylinder(1.39,.055,-.075,stone);
  const occlusion=new THREE.Mesh(new THREE.CircleGeometry(1.39,64),innerAO);occlusion.rotation.x=-Math.PI/2;occlusion.position.y=-.046;root.add(occlusion);
  // Individually cut blocks in the upper and lower masonry rings.
  for(let ring=0;ring<2;ring++)for(let i=0;i<20;i++){
    const angle=(i+ring*.5)*Math.PI/10;
    const radius=ring?1.65:1.45,height=ring?.16:.22+Math.random()*.07;
    const block=new THREE.Mesh(new THREE.BoxGeometry(ring?.50:.435,height,ring?.28:.23),edge);
    block.position.set(Math.sin(angle)*radius,ring?-.95:-.10+height/2,Math.cos(angle)*radius);block.rotation.y=angle;block.rotation.z=(Math.random()-.5)*.045;root.add(block);
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,group=new THREE.Group();group.rotation.y=a;root.add(group);
    const rib=new THREE.Mesh(new THREE.BoxGeometry(.14,.79,.19),edge);rib.position.set(0,-.59,1.39);rib.rotation.x=-.15;group.add(rib);
    for(const sign of [-1,1]){const brace=new THREE.Mesh(new THREE.BoxGeometry(.065,.6,.09),iron);brace.position.set(sign*.18,-.55,1.405);brace.rotation.z=sign*.6;group.add(brace);}
    const plaque=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.10),iron);plaque.position.set(0,-.52,1.48);plaque.rotation.z=Math.PI/4;group.add(plaque);
    const glyph=new THREE.Mesh(new THREE.PlaneGeometry(.47,.47),rune);glyph.position.set(0,-.52,1.54);group.add(glyph);
    const halo=new THREE.Mesh(new THREE.PlaneGeometry(.70,.70),runeGlow);halo.position.set(0,-.52,1.545);group.add(halo);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.105,.035,5,12),iron);ring.position.set(0,-.27,1.57);group.add(ring);
    // Pointed stone framing, recessed panels and heavy hanging chain links.
    for(const sign of [-1,1]){
      const frame=new THREE.Mesh(new THREE.BoxGeometry(.055,.42,.09),edge);frame.position.set(sign*.155,-.33,1.51);frame.rotation.z=sign*-.65;group.add(frame);
      const finial=new THREE.Mesh(new THREE.ConeGeometry(.10,.22,4),edge);finial.position.set(sign*.34,-.16,1.42);group.add(finial);
    }
    for(let j=0;j<4;j++){
      const link=new THREE.Mesh(new THREE.TorusGeometry(.075,.025,5,10),iron);link.position.set(0,-.38-j*.16,1.61+j*.055);link.scale.y=1.35;link.rotation.y=j%2*Math.PI/2;group.add(link);
    }
    const inset=new THREE.Mesh(new THREE.BoxGeometry(.36,.52,.04),iron);inset.position.set(.47,-.59,1.30);inset.rotation.y=.30;group.add(inset);
  }
  // Bake pedestal-local coordinates once; shading follows the rotating plinth.
  root.updateMatrixWorld(true);
  root.traverse(mesh=>{
    if(!mesh.isMesh||![stone,edge,iron].includes(mesh.material))return;
    const geometry=mesh.geometry,positions=geometry.attributes.position,aoPositions=new Float32Array(positions.count*3),point=new THREE.Vector3();
    for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);point.toArray(aoPositions,i*3);}
    geometry.setAttribute('pedestalPosition',new THREE.BufferAttribute(aoPositions,3));
  });
  return root;
}

export function addBestiaryShaft(scene,x){
  const target=new THREE.Object3D();target.position.set(x,0,0);scene.add(target);
  const light=new THREE.SpotLight('#e2e7f1',55,14,.30,.8,1.6);light.position.set(x,7,0);light.target=target;scene.add(light);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec3 n;varying vec3 v;varying vec2 tex;void main(){tex=uv;n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);v=-p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 n;varying vec3 v;varying vec2 tex;void main(){float side=pow(abs(dot(normalize(n),normalize(v))),2.);float fade=smoothstep(0.,.16,tex.y)*(1.-smoothstep(.65,1.,tex.y));gl_FragColor=vec4(.70,.77,.9,side*fade*.065);}' });
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.28,1.48,7,48,1,true),material);beam.position.set(x,3.5,0);scene.add(beam);
}
