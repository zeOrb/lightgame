import * as THREE from 'three';
// Hide whole off-screen static kits only for rendering; gameplay visibility is restored.
export class RenderCulling {
  constructor(roots){this.roots=[...new Set(roots)];this.bounds=new Map();this.hidden=[];this.frustum=new THREE.Frustum();this.matrix=new THREE.Matrix4();this.sphere=new THREE.Sphere();this.box=new THREE.Box3();}
  begin(camera){this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.matrix);for(const root of this.roots){if(!root.visible)continue;let sphere=this.bounds.get(root);if(!sphere){this.box.setFromObject(root);if(this.box.isEmpty())continue;sphere=this.box.getBoundingSphere(new THREE.Sphere());sphere.radius+=2;sphere.applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());this.bounds.set(root,sphere);}this.sphere.copy(sphere).applyMatrix4(root.matrixWorld);if(!this.frustum.intersectsSphere(this.sphere)){root.visible=false;this.hidden.push(root);}}}
  end(){for(const root of this.hidden)root.visible=true;this.hidden.length=0;}
}
export function freezeStaticKit(root){root.traverse(object=>{if(object===root)return;object.updateMatrix();object.matrixAutoUpdate=false;});}
