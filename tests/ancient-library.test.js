import {test} from 'node:test';
import assert from 'node:assert/strict';
import {libraryLayout} from '../src/ancient-library.js';
test('library densely fills the tower with varied books while preserving window bays',()=>{
  const {cases,books}=libraryLayout();
  assert.equal(cases.length,272);assert.ok(books.length>16000);
  const tiles=new Set(),heights=new Set();let stacks=0,leaning=0;
  for(const book of books){
    assert.ok([book.x,book.y,book.z,book.w,book.h,book.d,book.angle].every(Number.isFinite));
    assert.ok(Math.abs(book.x)<2.5);assert.ok(book.w>0&&book.h>0&&book.d>0);
    tiles.add(book.tile);heights.add(book.h.toFixed(2));if(book.w>book.h)stacks++;if(Math.abs(book.tilt)>.04)leaning++;
  }
  assert.equal(tiles.size,32);assert.ok(heights.size>30);assert.ok(stacks>100);assert.ok(leaning>100);
  for(const cabinet of cases)for(let i=0;i<8;i++){
    const windowAngle=.18+i*Math.PI/4;
    const delta=Math.abs(Math.atan2(Math.sin(cabinet.angle-windowAngle),Math.cos(cabinet.angle-windowAngle)));
    const halfAngle=Math.atan2((cabinet.width??5.1)/2+.2,17.65),top=cabinet.base+cabinet.rows*1.18+.81;
    if(delta<=halfAngle+.065)for(let y=10;y<95;y+=16)assert.ok(top<y-2.9||cabinet.base>y+2.9,'bookcase must leave the glass opening clear');
    if(delta<=halfAngle+.11)assert.ok(top<100.5||cabinet.base>112,'upper tall windows remain clear');
  }
  const infill=cases.filter(c=>c.level===-1);assert.equal(infill.length,56);
  assert.ok(infill.some(c=>c.base<14&&c.rows===7));
  assert.ok(infill.some(c=>c.base>90));
  const narrow=cases.filter(c=>c.level===-2);assert.equal(narrow.length,112);assert.ok(narrow.every(c=>c.width===1.05));
});
