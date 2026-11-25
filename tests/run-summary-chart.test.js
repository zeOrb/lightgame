import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarySeries,summaryCurve} from '../src/run-summary-chart.js';
test('summary graph measures points rather than gems and combines simultaneous rewards',()=>{
 const points=summarySeries({duration:10,events:[{type:'gem.collected',time:1,data:{count:1}},{type:'points.earned',time:1,data:{amount:8}},{type:'points.earned',time:1,data:{amount:12}},{type:'item.acquired',time:5,data:{id:'clover'}},{type:'points.earned',time:8,data:{amount:20}}]});
 assert.deepEqual(points,[{time:0,value:0},{time:1,value:20},{time:8,value:40},{time:10,value:40}]);
});
test('styled curve interpolates rewards smoothly without inventing peaks or negative counts',()=>{
 const points=[{time:0,value:0},{time:1,value:2},{time:2,value:2},{time:8,value:40},{time:12,value:41}];const curve=summaryCurve(points,x=>x,v=>100-v);
 assert.match(curve.path,/ C /);assert.ok(!/NaN|Infinity/.test(curve.path));let previous=100;
 for(let time=0;time<=12;time+=.01){const value=curve.at(time);assert.ok(value<=previous+1e-7&&value>=59-1e-7);previous=value;}
 for(const point of points)assert.ok(Math.abs(curve.at(point.time)-(100-point.value))<1e-7);
});
test('empty and zero-duration runs still produce valid graph geometry',()=>{
 for(const duration of [0,30]){const points=summarySeries({duration,events:[]}),curve=summaryCurve(points,x=>x,v=>v);assert.ok(!/NaN|Infinity/.test(curve.path));assert.equal(curve.at(0),0);}
});
