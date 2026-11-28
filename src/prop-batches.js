import * as THREE from 'three';
// Spatial groups of four shelves keep instancing useful without a tower-wide bound.
export class PropBatches {
 constructor(roots,moving=new Set()){
  this.records=[];this.batches=[];const groups=new Map(),local=new THREE.Matrix4(),relative=new THREE.Matrix4(),matrix=new THREE.Matrix4();
  roots.forEach((root,index)=>{if(moving.has(root))return;const parent=root.parent;if(!parent)return;root.traverse(source=>{if(!source.isInstancedMesh||!source.userData.propShape)return;const key=parent.uuid+Math.floor(index/4)+source.material.uuid+source.userData.propShape;let group=groups.get(key);if(!group)groups.set(key,group={parent,sources:[]});group.sources.push({source,root});});});
  for(const {parent,sources} of groups.values()){if(sources.length<2)continue;parent.updateWorldMatrix(true,false);const inverse=new THREE.Matrix4().copy(parent.matrixWorld).invert(),count=sources.reduce((n,e)=>n+e.source.count,0),geometry=sources[0].source.geometry.clone();
   const batch=new THREE.InstancedMesh(geometry,sources[0].source.material,count);batch.name='Instanced background props';parent.add(batch);this.batches.push(batch);const heights=new Float32Array(count),tiles=geometry.getAttribute('coverTile')?new Float32Array(count*2):null;let offset=0;
   for(const {source,root} of sources){source.updateWorldMatrix(true,false);relative.multiplyMatrices(inverse,source.matrixWorld);const ground=new THREE.Vector3().setFromMatrixPosition(root.matrixWorld).applyMatrix4(inverse).y;
    const matrices=[];for(let i=0;i<source.count;i++){source.getMatrixAt(i,local);matrix.multiplyMatrices(relative,local);batch.setMatrixAt(offset+i,matrix);matrices.push(matrix.clone());heights[offset+i]=ground;if(tiles){const a=source.geometry.getAttribute('coverTile');tiles[(offset+i)*2]=a.getX(i);tiles[(offset+i)*2+1]=a.getY(i);}}
    this.records.push({source,root,batch,offset,matrices,visible:true});offset+=source.count;source.layers.set(7);source.userData.batchedVisual=true;
   }
   geometry.setAttribute('propFloorY',new THREE.InstancedBufferAttribute(heights,1));if(tiles)geometry.setAttribute('coverTile',new THREE.InstancedBufferAttribute(tiles,2));batch.computeBoundingSphere();batch.instanceMatrix.needsUpdate=true;
  }
  this.zero=new THREE.Matrix4().makeScale(0,0,0);
 }
 dispose(){for(const r of this.records){r.source.layers.set(0);delete r.source.userData.batchedVisual;}for(const batch of this.batches){batch.removeFromParent();batch.geometry.dispose();batch.dispose();}this.records.length=0;this.batches.length=0;}
 update(){for(const r of this.records){const visible=r.root.visible&&r.source.parent.visible&&r.source.visible;if(visible===r.visible)continue;r.visible=visible;for(let i=0;i<r.matrices.length;i++)r.batch.setMatrixAt(r.offset+i,visible?r.matrices[i]:this.zero);r.batch.instanceMatrix.needsUpdate=true;}}
}
