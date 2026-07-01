import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';

export class BoxEnemyAI extends Enemy {
    constructor(mesh: THREE.Object3D, body: CANNON.Body) {
        super(mesh, body);
        this.isBird = false;
    }

    public update(delta: number, playerPos?: THREE.Vector3): void {
        if (playerPos) {
            if (Math.abs(this.body.velocity.y) < 0.5) {
                const dist = this.mesh.position.distanceTo(playerPos);

                if (dist > 2 && dist < 15) {
                    const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
                    this.body.velocity.x = dir.x * 3;
                    this.body.velocity.z = dir.z * 3;
                    this.body.velocity.y = 5; // Hop!
                }
            }
        }

        this.mesh.position.copy(this.body.position as any);
        this.mesh.quaternion.copy(this.body.quaternion as any);
    }
}
