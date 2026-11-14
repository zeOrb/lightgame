import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyWoodPOM} from '../src/wood-pom.js';
import {applyTowerDepth} from '../src/tower-depth.js';

test('wood POM composes with tower shading and uses one march for albedo and bump',()=>{
  const map=new THREE.Texture();map.userData.heightMap=new THREE.Texture();
  const material=applyWoodPOM(applyTowerDepth(new THREE.MeshStandardMaterial({map,bumpMap:map.userData.heightMap})));
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.woodHeight.value,map.userData.heightMap);
  assert.equal(shader.uniforms.woodDepth.value,.16);
  assert.match(shader.vertexShader,/towerWorldHeight/);
  assert.match(shader.vertexShader,/woodViewPosition=mvPosition.xyz/);
  assert.match(shader.fragmentShader,/texture2D\( map, woodShiftedUV \)/);
  assert.match(shader.fragmentShader,/dFdx\( woodShiftedUV \)/);
  assert.equal(shader.fragmentShader.split('woodParallax(vMapUv)').length-1,1);
  assert.match(material.customProgramCacheKey(),/tower-height-blue-v1-wood-pom/);
});

test('untextured materials are unchanged',()=>{
  const material=new THREE.MeshStandardMaterial(),compile=material.onBeforeCompile;
  assert.equal(applyWoodPOM(material),material);assert.equal(material.onBeforeCompile,compile);
});
