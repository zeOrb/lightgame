import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Abilities,AbilityType} from '../src/abilities.js';
test('jump dash reaches half the normal jump apex in either order within the combo window',()=>{
  for(const fps of [30,60,144])for(const jumpFirst of [false,true]){
    const a=new Abilities();let rise=0;
    if(jumpFirst)a.jumpLaunched(12,0);
    a.use(AbilityType.PHASING);
    if(!jumpFirst){a.advance(.03);rise+=a.consumePhaseRise();a.jumpLaunched(12,0);}
    while(a.phase){a.advance(1/fps);rise+=a.consumePhaseRise();}
    assert.ok(Math.abs(rise-1.8)<1e-8);
    assert.ok(a.gravityDelay>0);
  }
});
test('outside 50ms dash stays horizontal and reset clears pending rise',()=>{
  const a=new Abilities();a.jumpLaunched(12,0);a.advance(.051);a.use(AbilityType.PHASING);
  a.advance(.1);assert.equal(a.consumePhaseRise(),0);
  a.reset();a.use(AbilityType.PHASING);a.advance(.051);a.jumpLaunched(12,0);
  a.advance(.2);assert.equal(a.consumePhaseRise(),0);
});

