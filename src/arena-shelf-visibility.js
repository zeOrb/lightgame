// Upper spiral sections can sit directly between the arena camera and the fight.
// Cull their complete groups, including decorations, without changing the camera.
export class ArenaShelfVisibility {
  constructor(floors){this.groups=[...new Set(floors.map(floor=>floor.parent))];this.hidden=new Map();}
  update(arena){
    for(const group of this.groups){
      const obstructs=!!arena&&group.position.y>arena.y+.8;
      if(obstructs&&!this.hidden.has(group)){this.hidden.set(group,group.visible);group.visible=false;}
      else if(!obstructs&&this.hidden.has(group)){group.visible=this.hidden.get(group);this.hidden.delete(group);}
    }
  }
}
