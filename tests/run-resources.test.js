import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {runResources,releaseRunResources} from '../src/run-resources.js';
import {clipLibraryWindows} from '../src/library-window-openings.js';

test('replacement frees obsolete GPU resources and retains shared and cached resources',()=>{
  const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),texture=new THREE.Texture(),material=new THREE.MeshBasicMaterial({map:texture});
  const sharedGeometry=new THREE.PlaneGeometry(),sharedMaterial=new THREE.MeshBasicMaterial();
  const cached=new THREE.Texture();cached.userData.persistentRunResource=true;
  scene.add(new THREE.Mesh(geometry,material),new THREE.Mesh(sharedGeometry,sharedMaterial),new THREE.Mesh(sharedGeometry,new THREE.MeshBasicMaterial({map:cached})));
  const previous=runResources(scene),counts={geometry:0,material:0,texture:0,shared:0,cached:0};
  for(const [resource,key] of [[geometry,'geometry'],[material,'material'],[texture,'texture'],[sharedGeometry,'shared'],[cached,'cached']])resource.addEventListener('dispose',()=>counts[key]++);
  scene.clear();scene.add(new THREE.Mesh(sharedGeometry,sharedMaterial));releaseRunResources(previous,runResources(scene));
  assert.deepEqual(counts,{geometry:1,material:1,texture:1,shared:0,cached:0});
});
test('new window positions update live uniforms without a new shader variant',()=>{
  const material=clipLibraryWindows(new THREE.MeshStandardMaterial(),[{angle:0,y:20,width:2,height:4}]);
  const key=material.customProgramCacheKey(),shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};
  material.onBeforeCompile(shader);const uniform=shader.uniforms.libraryOpenings;
  material.userData.setLibraryOpenings([{angle:Math.PI/2,y:40,width:3,height:6},{angle:0,y:10,width:1,height:2}]);
  assert.equal(material.customProgramCacheKey(),key);assert.equal(shader.uniforms.libraryOpenings,uniform);
  assert.equal(uniform.value[0].z,40);assert.equal(shader.uniforms.libraryOpeningCount.value,2);
  assert.equal(shader.uniforms.libraryOpeningSizes.value[0].x,1.5);
  assert.match(shader.fragmentShader,/libraryOpenings\[16\]/);assert.doesNotMatch(shader.fragmentShader,/20\.000000/);
});
