import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {subdivideRoadSurface} from '../src/secret-road-surface.js';

test('render subdivision fills the original plane and interpolates UVs without changing source collision geometry',()=>{
  const source=new THREE.BufferGeometry();
  source.setAttribute('position',new THREE.Float32BufferAttribute([0,2,0,4,2,0,0,2,1,4,2,1],3));
  source.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));
  source.setAttribute('roadDepth',new THREE.Float32BufferAttribute([0,0,0,0],1));
  source.setIndex([0,2,1,1,2,3]);source.computeVertexNormals();
  const {geometry,indicesPerSegment}=subdivideRoadSurface(source,1,6,8);
  assert.equal(source.attributes.position.count,4);assert.equal(source.index.count,6);
  assert.equal(indicesPerSegment,384);assert.equal(geometry.attributes.position.count,384);
  let area=0;const p=geometry.attributes.position,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);area+=b.sub(a).cross(c.sub(a)).length()/2;}
  assert.equal(area,4);
  for(let i=0;i<p.count;i++){
    assert.equal(p.getY(i),2);assert.equal(geometry.attributes.uv.getX(i),p.getX(i)/4);
    assert.equal(geometry.attributes.uv.getY(i),p.getZ(i));assert.equal(geometry.attributes.roadDepth.getX(i),0);
  }
  assert.ok(geometry.boundingSphere.radius>source.boundingSphere?.radius||geometry.boundingSphere.radius>2.6);
});
