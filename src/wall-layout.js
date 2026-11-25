// Shared centres of the eight large bookshelf bays between the tower piers.
export const WALL_BAY_STEP=Math.PI/4;
export const WALL_BAY_ORIGIN=.18+Math.PI/8;
export const STEPS_PER_WALL_BAY=4;
export const SPIRAL_STEP_ANGLE=WALL_BAY_STEP/STEPS_PER_WALL_BAY;
export function windowSteps(floor){
  const available=[];for(let s=floor.start;s<=floor.end;s++)if(s%STEPS_PER_WALL_BAY===0&&!floor.holes.includes(s-floor.start))available.push(s);
  return floor.placements.windows.map(item=>{let section=item.s;if(available.length){section=available.reduce((a,b)=>Math.abs(b-item.s)<Math.abs(a-item.s)?b:a);available.splice(available.indexOf(section),1);}return {item,section};});
}
export function wallBayCenter(angle){return WALL_BAY_ORIGIN+Math.round((angle-WALL_BAY_ORIGIN)/WALL_BAY_STEP)*WALL_BAY_STEP;}
