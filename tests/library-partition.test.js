import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryLayout,partitionLibraryLayout} from '../src/ancient-library.js';
import {FLOORS} from '../src/floor-config.js';
import {TOWER_TOP} from '../src/game.js';
test('each book and cabinet belongs to exactly one floor and stays together',()=>{
 const source=libraryLayout(),books=new Set(),cases=new Set();let bookCount=0,caseCount=0;
 for(const floor of FLOORS){const min=floor.index===FLOORS.length-1?-Infinity:TOWER_TOP-(floor.end+1)*.5,max=floor.index===0?Infinity:TOWER_TOP-floor.start*.5;const part=partitionLibraryLayout(source,min,max);
 for(const book of part.books){assert.ok(!books.has(book));books.add(book);bookCount++;assert.ok(part.cases.includes(source.cases[book.caseId]));}
 for(const cabinet of part.cases){assert.ok(!cases.has(cabinet));cases.add(cabinet);caseCount++;}
 }
 assert.equal(bookCount,source.books.length);assert.equal(caseCount,source.cases.length);
});

test('large cabinets fit their owning tier instead of crossing rotating boundaries',()=>{
 const source=libraryLayout();
 for(const floor of FLOORS){const bottom=TOWER_TOP-(floor.end+1)*.5,top=TOWER_TOP-floor.start*.5;const part=partitionLibraryLayout(source,bottom,top);
 for(const cabinet of source.cases.filter(c=>c.floorIndex===floor.index)){assert.ok(part.cases.includes(cabinet));assert.ok(cabinet.base>=bottom);assert.ok(cabinet.base+cabinet.rows*1.18+.75<top);}
 }
});
