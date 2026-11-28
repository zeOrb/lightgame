import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SHELF_HALF_ANGLE,SHELF_OUTER_RADIUS,shelfInnerRadius} from './game.js';
import {createVisualRandom} from './random-manager.js';
import {applyTowerDepth} from './tower-depth.js';
import {mapWoodPanel} from './old-wood.js';

// Damage belongs to each surviving shelf so moving and rotated floors carry it.
export function addBrokenStairEdges(parent,section,gaps,{stone=false,woodMaterial,sectionGeometry,random=createVisualRandom()}={}){
  const sides=[-1,1].filter(side=>gaps.includes(section+side));
  if(!sides.length)return;
  const inner=shelfInnerRadius(section),outer=SHELF_OUTER_RADIUS;
  const edges=new THREE.Group();edges.name='Broken edges beside stair gap';
  const chips=[],shade=[];
  for(const side of sides){
    const phase=random()*6.28;
    const damage=radius=>.08+.11*(.5+.5*Math.sin(radius*19+phase))+.065*(.5+.5*Math.sin(radius*37+phase));
    // Recess the visual end face, leaving an irregular silhouette for the splinters.
    parent.traverse(object=>{
      if(!object.isMesh||!object.geometry?.attributes.position)return;
      const geometry=object.geometry.clone(),positions=geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),z=positions.getZ(i),radius=Math.hypot(x,z);
        const distance=radius*(SHELF_HALF_ANGLE-side*Math.atan2(z,x));
        const influence=1-THREE.MathUtils.smoothstep(distance,0,.34);
        if(influence<=0)continue;
        const retreat=damage(radius)*influence;
        positions.setXYZ(i,x+Math.sin(SHELF_HALF_ANGLE)*retreat,positions.getY(i)-influence*.035,z-side*Math.cos(SHELF_HALF_ANGLE)*retreat);
      }
      geometry.computeVertexNormals();geometry.computeBoundingSphere();
      object.geometry=geometry;
    });
    if(!stone&&sectionGeometry){
      const count=5;
      for(let i=0;i<count;i++){
        const radius=inner+.25+(outer-inner-.5)*(i+.5)/count;
        const width=(outer-inner)/count*(.38+random()*.42);
        const reach=.15+random()*.24;
        const drop=.06+random()*.18;
        const shape=new THREE.Shape();
        shape.moveTo(-width/2,-.28);shape.lineTo(width/2,-.28);
        shape.lineTo(width*.42,reach*.5);shape.lineTo(width*.08,reach*.28);
        shape.lineTo(-width*.12,reach);shape.lineTo(-width*.5,reach*.55);shape.closePath();
        const board=new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false});
        board.rotateX(-Math.PI/2);board.scale(1,1,-side);
        if(side===1){
          const indices=[];
          for(let vertex=0;vertex<board.attributes.position.count;vertex+=3)indices.push(vertex,vertex+2,vertex+1);
          board.setIndex(indices);
        }
        const boardPositions=board.attributes.position;
        for(let vertex=0;vertex<boardPositions.count;vertex++){
          const z=boardPositions.getZ(vertex);
          const tip=THREE.MathUtils.smoothstep(Math.abs(z),reach*.25,reach);
          boardPositions.setY(vertex,boardPositions.getY(vertex)-tip*drop);
        }
        board.computeVertexNormals();
        board.rotateY(-side*SHELF_HALF_ANGLE);
        board.translate(Math.cos(SHELF_HALF_ANGLE)*radius,-.27,side*Math.sin(SHELF_HALF_ANGLE)*radius);
        mapWoodPanel(board,section,inner,outer,SHELF_HALF_ANGLE);
        const base=sectionGeometry.attributes.color;
        const colors=[],tipTint=new THREE.Color('#51402f');
        for(let vertex=0;vertex<board.attributes.position.count;vertex++){
          const source=vertex%base.count;
          const wood=new THREE.Color(base.getX(source),base.getY(source),base.getZ(source));
          const tip=THREE.MathUtils.smoothstep(Math.abs(boardPositions.getZ(vertex)),reach*.7,reach);
          wood.lerp(tipTint,tip*.68);
          colors.push(wood.r,wood.g,wood.b);
        }
        board.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
        chips.push(board);
      }
    }
    // A broad feathered contact stain blends the break into the surviving tread.
    const positions=[],colors=[];
    const rows=12,columns=4;
    for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
      for(const [dr,dc] of [[0,0],[1,0],[0,1],[1,0],[1,1],[0,1]]){
        const radius=inner+.06+(outer-inner-.12)*(r+dr)/rows;
        const depth=(c+dc)/columns;
        const angle=side*(SHELF_HALF_ANGLE-(.03+.55*depth)/radius);
        positions.push(Math.cos(angle)*radius,-.012,Math.sin(angle)*radius);
        const opacity=(1-depth)**2*.42;
        colors.push(.07,.045,.025,opacity);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
    shade.push(geometry);
  }
  const chipGeometry=chips.map(geometry=>geometry.index?geometry.toNonIndexed():geometry);
  if(chipGeometry.length){
    const material=stone?applyTowerDepth(new THREE.MeshStandardMaterial({color:'#d5c3a9',vertexColors:true,roughness:1})):woodMaterial;
    const debris=new THREE.Mesh(mergeGeometries(chipGeometry),material);edges.add(debris);
  }
  const stain=new THREE.Mesh(mergeGeometries(shade),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  stain.renderOrder=1;edges.add(stain);
  new Set([...chips,...chipGeometry,...shade]).forEach(geometry=>geometry.dispose());
  parent.add(edges);
}
