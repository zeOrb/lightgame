import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TreeViewport,treeKeyboardDelta} from '../src/tree-viewport.js';
test('tree navigation centres the sun, pans freely and zooms around the cursor',()=>{
  const camera=new TreeViewport();camera.center(800,600);
  assert.equal(camera.x+800*camera.zoom,400);assert.equal(camera.y+800*camera.zoom,300);
  camera.pan(120,-80);assert.equal(camera.x,-280);assert.equal(camera.y,-580);
  const px=267,py=154,wx=(px-camera.x)/camera.zoom,wy=(py-camera.y)/camera.zoom;
  camera.zoomAt(px,py,1.3);assert.ok(Math.abs((px-camera.x)/camera.zoom-wx)<1e-9);assert.ok(Math.abs((py-camera.y)/camera.zoom-wy)<1e-9);
  camera.zoomAt(px,py,100);assert.equal(camera.zoom,1.75);camera.zoomAt(px,py,.0001);assert.equal(camera.zoom,.35);
  camera.center(800,600);assert.ok(Math.abs(camera.x+800*camera.zoom-400)<1e-9);
});

test('WASD pans the view at equal speed across frame rates and diagonals, with opposing keys cancelling',()=>{
  for(const fps of [30,60,144]){
    let x=0,y=0;
    for(let i=0;i<fps;i++){const delta=treeKeyboardDelta(new Set(['KeyW','KeyD']),1/fps);x+=delta.x;y+=delta.y;}
    assert.ok(x<0&&y>0);assert.ok(Math.abs(Math.hypot(x,y)-560)<1e-8);
  }
  assert.deepEqual(treeKeyboardDelta(new Set(['KeyA','KeyD','KeyW','KeyS']),.016),{x:0,y:0});
  assert.deepEqual(treeKeyboardDelta(new Set(),.016),{x:0,y:0});
});
