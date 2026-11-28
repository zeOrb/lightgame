import * as THREE from 'three';
// Keep collision meshes and shelf visibility; batch only their opaque visual geometry.
export class StairBatches {
 constructor(shelves,movingRoots=new Set()){
  this.entries=[];this.batches=[];const groups=new Map(),matrix=new THREE.Matrix4(),inverse=new THREE.Matrix4();
  for(const root of shelves){const parent=root.parent;if(!parent)continue;root.updateWorldMatrix(true,true);for(const source of root.children){if(!source.isMesh||source.isInstancedMesh||Array.isArray(source.material)||source.material.transparent||source.layers.mask!==1)continue;const g=source.geometry;
   const signature=Object.entries(g.attributes).sort().map(([k,a])=>k+':'+a.itemSize+':'+a.normalized+':'+a.array.constructor.name).join('|');const key=parent.uuid+source.material.uuid+!!g.index+signature;let group=groups.get(key);if(!group)groups.set(key,group={parent,material:source.material,sources:[]});group.sources.push({source,root,moving:movingRoots.has(root)});
  }}
  for(const group of groups.values()){if(group.sources.length<2)continue;const geometries=[...new Set(group.sources.map(e=>e.source.geometry))];const vertices=geometries.reduce((n,g)=>n+g.attributes.position.count,0),indices=geometries.reduce((n,g)=>n+(g.index?.count??0),0);
   const batch=new THREE.BatchedMesh(group.sources.length,vertices,indices,group.material);batch.name='Batched stair architecture';batch.sortObjects=false;group.parent.add(batch);this.batches.push(batch);const ids=new Map();for(const g of geometries)ids.set(g,batch.addGeometry(g));group.parent.updateWorldMatrix(true,false);inverse.copy(group.parent.matrixWorld).invert();
   for(const entry of group.sources){const {source}=entry,id=batch.addInstance(ids.get(source.geometry));matrix.multiplyMatrices(inverse,source.matrixWorld);batch.setMatrixAt(id,matrix);entry.batch=batch;entry.id=id;entry.visible=null;this.entries.push(entry);source.userData.batchedVisual=true;source.layers.set(7);}
  }
  this.matrix=matrix;this.inverse=inverse;
 }
 dispose(){for(const e of this.entries){e.source.layers.set(0);delete e.source.userData.batchedVisual;}for(const batch of this.batches){batch.removeFromParent();batch.dispose();}this.entries.length=0;this.batches.length=0;}
 update(){const inverses=new Map();for(const e of this.entries){const visible=e.root.visible&&e.source.visible;if(e.visible!==visible){e.batch.setVisibleAt(e.id,visible);e.visible=visible;}if(e.moving){let inv=inverses.get(e.batch.parent);if(!inv){inv=new THREE.Matrix4().copy(e.batch.parent.matrixWorld).invert();inverses.set(e.batch.parent,inv);}this.matrix.multiplyMatrices(inv,e.source.matrixWorld);e.batch.setMatrixAt(e.id,this.matrix);}}}
}
