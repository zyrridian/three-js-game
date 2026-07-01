import * as THREE from 'three';

export class ParticleSystem {
    public particles: THREE.Mesh[] = [];
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public spawn(position: THREE.Vector3) {
        for (let i = 0; i < 20; i++) {
            const geom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const mat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff0000 });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.copy(position);
            mesh.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    Math.random() * 10,
                    (Math.random() - 0.5) * 10
                ),
                life: 1.0
            };
            this.scene.add(mesh);
            this.particles.push(mesh);
        }
    }

    public update(delta: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.userData.life -= delta;
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
                continue;
            }
            p.position.addScaledVector(p.userData.velocity, delta);
            p.userData.velocity.y -= 9.8 * delta; // gravity
        }
    }
}
