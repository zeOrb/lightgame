import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILLS,SKILL_MAP_SIZE} from '../src/progression.js';
import {PixelSkillArt,skillPosition} from '../src/pixel-skill-art.js';

test('solar tree leaves space for diamond hit targets and their labels inside the pannable map',()=>{
  const points=SKILLS.map(skillPosition);
  for(const p of points){assert.ok(p.x>55&&p.x<SKILL_MAP_SIZE-55&&p.y>55&&p.y<SKILL_MAP_SIZE-90);}
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>160);
  }
});

test('selecting a node does not replay its reveal or purchase flash; unlocking its neighbour grows a new ray',()=>{
  const previous=globalThis.document;
  const ctx=new Proxy({}, {get:(target,key)=>key in target?target[key]:()=>{}});
  globalThis.document={createElement:()=>({style:{},setAttribute(){},getContext:()=>ctx})};
  try{
    const art=new PixelSkillArt({prepend(){}},()=>false);
    art.sync([{id:'heart',status:'ready'},{id:'heart2',status:'preview'}]);
    art.time=2;art.sync([{id:'heart',status:'owned'},{id:'heart2',status:'ready'}]);
    const born=art.nodes.get('heart2').born;
    assert.equal(art.nodes.get('heart').purchased,2);
    assert.ok(born>=2);
    art.time=3;art.sync([{id:'heart',status:'owned',selected:true},{id:'heart2',status:'ready'}]);
    assert.equal(art.nodes.get('heart').purchased,2);
    assert.equal(art.nodes.get('heart2').born,born);
    assert.equal(art.frame,null);
  }finally{globalThis.document=previous;}
});
