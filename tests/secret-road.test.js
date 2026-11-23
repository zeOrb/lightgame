import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SecretRoad} from '../src/secret-road.js';
const points=Array.from({length:13},(_,i)=>new THREE.Vector3(Math.cos(i*.1)*15,10+i*.5,Math.sin(i*.1)*15));

test('swept landing returns endpoint surface height in world space, including translated floor roots',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3),parent=new THREE.Group();parent.add(road.mesh);road.reveal(1);const localTop=road.heightAt(points[5]);parent.position.y=7;parent.rotation.y=.4;road.reveal(1);parent.updateMatrixWorld(true);
 const before=parent.localToWorld(points[4].clone()),after=parent.localToWorld(points[5].clone());
 const top=road.heightAt(after);assert.ok(Math.abs(top-localTop-7)<1e-6);
 const landed=road.landing(before.y+.3,after.y-.3,after,before);
 assert.ok(landed!==null);assert.ok(Math.abs(landed-top)<1e-6);
 assert.ok(road.heightAt(before)<landed,'uphill sweep must not reuse the earlier lower contact height');
});
test('road has no vertical noise and a solid downward thickness',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3);
 for(let i=0;i<road.segments;i++){const top=road.triangles[i*6];assert.ok(Math.abs(top[0].y-top[2].y)<1e-9);}
 road.reveal(1);
 const top=road.heightAt(points[6]),bottom=road.undersideAt(new THREE.Vector3(points[6].x,top-.3,points[6].z));
 assert.ok(top-bottom>.3);assert.ok(top-bottom<.7);
});
test('visible top is raycastable and collision excludes the unrevealed road',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3);assert.equal(road.heightAt(points[6]),null);road.reveal(1);
 const y=road.heightAt(points[6]);assert.ok(Math.abs(y-points[6].y)<.025);
 const hits=new THREE.Raycaster(new THREE.Vector3(points[6].x,30,points[6].z),new THREE.Vector3(0,-1,0)).intersectObject(road.mesh,false);
 assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-y)<1e-5);
});

test('top UV is a straight normalized strip with increasing arc-length V',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3),g=road.mesh.geometry,uv=g.attributes.uv,depth=g.attributes.roadDepth;
 let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
 for(let i=0;i<uv.count;i++)if(depth.getX(i)===0&&uv.getX(i)<=1){const u=uv.getX(i),v=uv.getY(i);if(u<minU)minU=u;if(u>maxU)maxU=u;if(v<minV)minV=v;if(v>maxV)maxV=v;}
 assert.equal(minU,0);assert.equal(maxU,1);assert.equal(minV,0);assert.equal(maxV,1);assert.ok(road.mesh.material.roughness>.9);
});

test('grass material is continuous, textured and independent of the wood atlas',()=>{
 const atlas=new THREE.DataTexture(new Uint8Array(64*64*4).fill(128),64,64);atlas.userData.heightMap=new THREE.DataTexture(new Uint8Array(64*64*4).fill(100),64,64);
 const road=new SecretRoad(points,new THREE.MeshStandardMaterial({map:atlas}),3),material=road.mesh.material;
 assert.equal(material.map.image.width,128);assert.notEqual(material.map,atlas);assert.equal(material.map.wrapT,THREE.RepeatWrapping);assert.ok(material.map.repeat.y>1);assert.ok(material.bumpMap);
 const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <fog_fragment>',uniforms:{}};material.onBeforeCompile(shader);assert.ok(!shader.fragmentShader.includes('woodParallax'));
});

test('road silhouette has a pronounced horizontal bend while remaining under the route',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3),v=road.mesh.geometry.attributes.position,curve=new THREE.CatmullRomCurve3(points);let maximum=0;
 for(let i=0;i<=road.segments;i++){const t=-.035+1.07*i/road.segments;if(t<=0||t>=1)continue;const centre=curve.getPoint(t),x=(v.getX(i*road.rowStride)+v.getX(i*road.rowStride+1))*.5,z=(v.getZ(i*road.rowStride)+v.getZ(i*road.rowStride+1))*.5;maximum=Math.max(maximum,Math.hypot(x-centre.x,z-centre.z));}
 assert.ok(maximum>.4);
});

test('road tips taper smoothly and the soil layer has matching vertex attributes',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3),g=road.mesh.geometry,d=g.attributes.roadDepth;
 const width=i=>{const t=road.triangles[i*6];return t[0].distanceTo(t[2]);};
 assert.ok(width(0)<width(12)*.5);assert.ok(width(road.segments-1)<width(road.segments-13)*.5);
 assert.equal(d.count,g.attributes.position.count);
 let min=Infinity,max=-Infinity;for(let i=0;i<d.count;i++){const x=d.getX(i);if(x<min)min=x;if(x>max)max=x;}
 assert.equal(min,0);assert.ok(max>.8);
});

test('decorative grass is sparse, instanced and revealed with the road',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3),grass=road.grass.mesh;
 assert.ok(grass.isInstancedMesh);assert.equal(grass.count,0);road.reveal(1);assert.ok(grass.count>10&&grass.count<55);
 const count=grass.count;road.reveal(.5);assert.ok(grass.count<count);road.reveal(0);assert.equal(grass.count,0);
});

test('tufts participate in opaque depth and fog with matched two-sided lighting',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3),material=road.grass.mesh.material;
 assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(material.fog,true);assert.equal(road.grass.mesh.renderOrder,0);
 const shader={vertexShader:'#include <begin_vertex>\n#include <beginnormal_vertex>',fragmentShader:'#include <map_fragment>\n#include <normal_fragment_begin>',uniforms:{}};material.onBeforeCompile(shader);
 assert.ok(shader.fragmentShader.includes('varying vec3 tuftUpView'));assert.ok(shader.fragmentShader.includes('normal=normalize(tuftUpView)'));
});

test('three grass forms cover the road interior with varied instance transforms',()=>{
 const road=new SecretRoad(points,new THREE.MeshBasicMaterial(),3),meshes=road.grass.meshes;road.reveal(1);
 assert.equal(meshes.length,6);assert.equal(new Set(meshes.map(m=>m.geometry.attributes.position.count)).size,6);
 const scales=new Set(),rotations=new Set();let middle=0,total=0;const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
 for(const mesh of meshes)for(let i=0;i<mesh.count;i++){total++;const u=mesh.geometry.attributes.tuftRoadUV.getX(i);if(u>.3&&u<.7)middle++;mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);scales.add(scale.x.toFixed(3));rotations.add(rotation.y.toFixed(3));}
 assert.ok(total>50&&total<160);assert.ok(middle>5);assert.ok(scales.size>20);assert.ok(rotations.size>20);
});
