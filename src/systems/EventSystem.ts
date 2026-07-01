import * as THREE from 'three';

export type TriggerCallback = () => void;

export class TriggerBox {
    public box: THREE.Box3;
    public onTrigger: TriggerCallback;
    public hasTriggered: boolean = false;

    constructor(min: THREE.Vector3, max: THREE.Vector3, onTrigger: TriggerCallback) {
        this.box = new THREE.Box3(min, max);
        this.onTrigger = onTrigger;
    }
}

export class EventSystem {
    private triggers: TriggerBox[] = [];

    public addTrigger(trigger: TriggerBox) {
        this.triggers.push(trigger);
    }

    public update(playerPos: THREE.Vector3) {
        for (let i = this.triggers.length - 1; i >= 0; i--) {
            const trigger = this.triggers[i];
            if (!trigger.hasTriggered && trigger.box.containsPoint(playerPos)) {
                trigger.hasTriggered = true;
                trigger.onTrigger();
                // Remove trigger after firing
                this.triggers.splice(i, 1);
            }
        }
    }
}
