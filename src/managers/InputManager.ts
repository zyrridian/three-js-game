import { VirtualJoystick, ActionButton } from '../utils';
import { Player } from '../entities/Player';

export class InputManager {
    public keysPressed: { [key: string]: boolean } = {};
    public virtualJoystick: VirtualJoystick;
    public jumpBtn: ActionButton;
    public atkBtn: ActionButton;
    
    constructor(onAttack: () => void) {
        this.virtualJoystick = new VirtualJoystick(this.keysPressed);
        this.jumpBtn = new ActionButton('JUMP', '50px', '50px', 'Space', () => {
            this.keysPressed[' '] = true;
            setTimeout(() => this.keysPressed[' '] = false, 100);
        });
        this.atkBtn = new ActionButton('ATK', '150px', '100px', 'Click', () => {
            onAttack();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === ' ') this.jumpBtn.pressDown();
            this.keysPressed[event.key.toLowerCase()] = true;
        }, false);
        
        document.addEventListener('keyup', (event) => {
            if (event.key === ' ') this.jumpBtn.releaseUp();
            this.keysPressed[event.key.toLowerCase()] = false;
        }, false);
    }

    public setupMouseInteraction(domElement: HTMLElement, onAttack: () => void) {
        document.addEventListener('mousedown', (event) => {
            if (event.target !== domElement) return;
            if (event.button === 0) {
                this.atkBtn.pressDown();
                onAttack();
            }
        }, false);
        
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) this.atkBtn.releaseUp();
        }, false);
    }

    public updateVisuals() {
        this.virtualJoystick.updateVisuals();
    }
}
