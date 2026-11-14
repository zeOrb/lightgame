import * as THREE from 'three';

// Portrait framing moves the camera through the near wall of the tower.
// Cut away that side of the architecture instead of changing the shot.
export class ArenaCameraCutaway {
  constructor(renderer){
    this.renderer=renderer;this.plane=new THREE.Plane();
    this.previous=null;this.planes=null;
  }
  update(arena,camera,radius){
    if(!arena){
      if(this.previous){this.renderer.clippingPlanes=this.previous;this.previous=null;this.planes=null;}
      return;
    }
    if(!this.previous){
      this.previous=this.renderer.clippingPlanes;
      this.planes=[...this.previous,this.plane];
      this.renderer.clippingPlanes=this.planes;
    }
    const length=Math.hypot(camera.position.x,camera.position.z);
    if(length>.0001)this.plane.normal.set(-camera.position.x/length,0,-camera.position.z/length);
    else this.plane.normal.set(0,0,-1);
    // Every point of the arena remains on the visible side, including its rim.
    this.plane.constant=radius+.6;
  }
}
