import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export abstract class Entity {
    public mesh: THREE.Object3D;
    public body: CANNON.Body;

    constructor(mesh: THREE.Object3D, body: CANNON.Body) {
        this.mesh = mesh;
        this.body = body;
    }

    public abstract update(delta: number, ...args: any[]): void;
}
