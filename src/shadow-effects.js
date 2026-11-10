import * as THREE from 'three';
import { createVisualRandom } from './visual-random.js';
const random=createVisualRandom('damage-motes');

export class ShadowEffects {
  constructor(scene, texture, overlay, reducedMotion = false) {
    this.overlay = overlay;
    this.reducedMotion = reducedMotion;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.motes = Array.from({ length: 24 }, (_, i) => {
      const material = new THREE.SpriteMaterial({ map: texture, color: i % 3 ? '#140b25' : '#50305f', transparent: true, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(material);
      this.group.add(sprite);
      return { sprite, age: 2, angle: random()*Math.PI*2, life: .7 + random()*.48 };
    });
    this.clear();
  }

  setDamage(active) {
    if (active && !this.active) this.hit();
    this.active = active;
  }

  hit() {
    this.pulse = 1;
    this.repeat = 0;
    for (const mote of this.motes) mote.age = 0;
  }

  update(dt, position) {
    this.time += dt;
    this.repeat += dt;
    this.pulse *= Math.exp(-dt*4.5);
    if (this.active && this.repeat > .9) {
      this.repeat = 0;
      for (const mote of this.motes) if (mote.age >= mote.life) mote.age = 0;
    }
    this.group.position.copy(position);
    for (const mote of this.motes) {
      mote.age += dt;
      const t = Math.min(1, mote.age/mote.life);
      const radius = .3 + t*.85;
      const angle = mote.angle + t*.65;
      mote.sprite.position.set(Math.cos(angle)*radius, .15+t*1.45, Math.sin(angle)*radius);
      mote.sprite.scale.set(.35+t*.8, .6+t*1.4, 1);
      mote.sprite.material.rotation = angle+t*.5;
      mote.sprite.material.opacity = Math.sin(t*Math.PI)*.72;
    }
    const heartbeat = this.reducedMotion ? .5 : .5+.5*Math.sin(this.time*7);
    this.intensity = Math.min(1, this.pulse*.8 + (this.active ? .42+heartbeat*.14 : 0));
    this.overlay.style.opacity = String(this.intensity);
    this.shake = this.reducedMotion ? 0 : this.pulse*.065 + (this.active ? .012+heartbeat*.008 : 0);
  }

  applyShake(camera) {
    const t=this.time;
    camera.translateX((Math.sin(t*43)+Math.sin(t*71)*.35)*this.shake);
    camera.translateY(Math.sin(t*53+.7)*this.shake*.65);
    camera.rotateZ(Math.sin(t*39)*this.shake*.035);
  }

  setVisible(visible) {
    this.group.visible = visible;
    if (!visible) this.overlay.style.opacity = '0';
  }

  clear() {
    this.active = false;
    this.pulse = this.repeat = this.time = this.intensity = this.shake = 0;
    this.overlay.style.opacity = '0';
    for (const mote of this.motes) { mote.age=2; mote.sprite.material.opacity=0; }
  }
}
