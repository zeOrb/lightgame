import * as THREE from 'three';

const COLLAPSE = .58;
const BURST = .95;

export class PickupEffects {
  constructor(scene, glowTexture) {
    this.scene = scene;
    this.glowTexture = glowTexture;
    this.active = [];
    this.sparkGeometry = new THREE.OctahedronGeometry(.085);
    this.ringGeometry = new THREE.TorusGeometry(1, .018, 5, 64);
    this.dummy = new THREE.Object3D();
  }

  collect(shard) {
    const group = new THREE.Group();
    group.position.copy(shard.position);
    this.scene.add(group);
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ ...additive, map: this.glowTexture, color: '#ffe6a4' }));
    group.add(aura);
    const ringMaterial = new THREE.MeshBasicMaterial({ ...additive, color: '#ffdb7a', opacity: 0 });
    const ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
    const sparksMaterial = new THREE.MeshBasicMaterial({ ...additive, color: '#ffe9aa', opacity: 0 });
    const sparks = new THREE.InstancedMesh(this.sparkGeometry, sparksMaterial, 28);
    sparks.frustumCulled = false;
    group.add(sparks);
    const rays = Array.from({ length: 28 }, (_, i) => {
      const angle = i * 2.399963;
      const y = .15 + (i % 7) / 7;
      const radius = Math.sqrt(1-y*y);
      const direction = new THREE.Vector3(Math.cos(angle)*radius, y, Math.sin(angle)*radius);
      sparks.setColorAt(i, new THREE.Color(i % 3 ? '#ffd475' : '#fffbed'));
      return { direction, speed: 1.2 + (i % 5) * .38, size: .55 + (i % 4) * .25, spin: angle };
    });
    const light = new THREE.PointLight('#ffd47d', 0, 7, 2);
    group.add(light);
    this.active.push({ shard, group, aura, ring, sparks, light, rays, age: 0, rotation: shard.rotation.clone() });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i];
      const { shard, aura, ring, sparks, light, rays } = effect;
      effect.age += dt;
      const t = Math.min(1, effect.age / COLLAPSE);
      // Cubic ease-in: scale starts with zero velocity, then collapses rapidly.
      shard.scale.setScalar(Math.max(0, 1 - t*t*t));
      shard.rotation.set(effect.rotation.x + t*t*.6, effect.rotation.y + t*t*2.4, effect.rotation.z + t*t*.9);
      const burstTime = effect.age - COLLAPSE;
      const u = Math.max(0, Math.min(1, burstTime / BURST));
      shard.visible = t < 1;
      if (burstTime < 0) {
        aura.scale.setScalar(.6 + t*t*.8);
        aura.material.opacity = .2 + t*t*.6;
        light.intensity = t*t*9;
      } else {
        const spread = 1 - Math.pow(1-u, 3);
        aura.scale.setScalar(1.4 + spread*3.1);
        aura.material.opacity = Math.pow(1-u, 3) * .95;
        light.intensity = 65 * Math.pow(1-u, 3);
        ring.scale.setScalar(.15 + spread*2.1);
        ring.material.opacity = Math.pow(1-u, 2) * .8;
        sparks.material.opacity = Math.pow(1-u, 1.5);
        rays.forEach((ray, index) => {
          this.dummy.position.copy(ray.direction).multiplyScalar(ray.speed*spread);
          this.dummy.position.y -= u*u*.8;
          this.dummy.rotation.set(ray.spin+u*3, u*4, ray.spin+u*2);
          const size=ray.size*Math.pow(1-u, .65);
          this.dummy.scale.set(size*.55, size*(1.4+Math.sin(u*12+index)*.3), size*.55);
          this.dummy.updateMatrix();
          sparks.setMatrixAt(index, this.dummy.matrix);
        });
        sparks.instanceMatrix.needsUpdate = true;
      }
      if (effect.age >= COLLAPSE + BURST) {
        this.remove(effect);
        this.active.splice(i, 1);
      }
    }
  }

  remove(effect) {
    effect.group.removeFromParent();
    effect.aura.material.dispose();
    effect.ring.material.dispose();
    effect.sparks.material.dispose();
    effect.sparks.dispose();
  }

  clear() {
    for (const effect of this.active) this.remove(effect);
    this.active.length = 0;
  }
}
