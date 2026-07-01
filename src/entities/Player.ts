import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Entity } from './Entity';
import { CharacterControls } from './CharacterControls';

export class Player extends Entity {
    public controls: CharacterControls;
    public velocityY: number = 0;
    public isGrounded: boolean = false;

    constructor(mesh: THREE.Object3D, body: CANNON.Body, controls: CharacterControls) {
        super(mesh, body);
        this.controls = controls;
    }

    public update(delta: number, keysPressed: any, environmentMeshes: THREE.Object3D[], mapConfig?: any): void {
        this.controls.update(delta, keysPressed, environmentMeshes);

        // Sync player physical body with velocity for realistic pushing forces
        if (delta > 0) {
            this.body.velocity.x = (this.controls.model.position.x - this.body.position.x) / delta;
            this.body.velocity.z = (this.controls.model.position.z - this.body.position.z) / delta;
        }

        // Raycast down to find floor height
        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(this.controls.model.position.x, this.controls.model.position.y + 1.0, this.controls.model.position.z),
            new THREE.Vector3(0, -1, 0)
        );
        const intersects = raycaster.intersectObjects(environmentMeshes, true);
        const validIntersects = intersects.filter(hit => hit.object.visible);
        
        let floorY = -100;
        if (validIntersects.length > 0) {
            floorY = validIntersects[0].point.y;
        }

        // Apply Gravity & Jumping
        if (this.controls.model.position.y <= floorY + 0.1 && this.velocityY <= 0) {
            this.isGrounded = true;
            this.controls.model.position.y = floorY;
            this.velocityY = 0;
        } else {
            this.isGrounded = false;
            this.velocityY -= 30 * delta; // Gravity
        }

        if (this.isGrounded && keysPressed[' ']) {
            this.velocityY = 15; // Jump strength
            this.isGrounded = false;
            this.controls.jump();
        }

        this.controls.model.position.y += this.velocityY * delta;

        this.body.position.x = this.controls.model.position.x;
        this.body.position.y = this.controls.model.position.y + 1; // center offset
        this.body.position.z = this.controls.model.position.z;

        // Check for fall out of bounds
        if (this.controls.model.position.y < -15 && mapConfig) {
            this.controls.model.position.copy(mapConfig.spawnPoint);
            this.body.position.copy(mapConfig.spawnPoint as any);
            this.velocityY = 0;
            this.body.velocity.set(0, 0, 0);
            this.controls.playEmoteReversed('Death');
            document.dispatchEvent(new Event('playerDied'));
        }

        // Sync camera strictly with final physics position
        this.controls.syncCamera();
    }
}
