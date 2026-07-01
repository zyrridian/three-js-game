export const W = 'w'
export const A = 'a'
export const S = 's'
export const D = 'd'
export const SHIFT = 'shift'
export const DIRECTIONS = [W, A, S, D]

export class VirtualJoystick {
    private container: HTMLDivElement;
    private knob: HTMLDivElement;
    private maxRadius = 50;
    private active = false;
    private keysPressed: any;

    constructor(keysPressed: any) {
        this.keysPressed = keysPressed;
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.bottom = '50px';
        this.container.style.left = '50px';
        this.container.style.width = '120px';
        this.container.style.height = '120px';
        this.container.style.borderRadius = '50%';
        this.container.style.background = 'rgba(255, 255, 255, 0.2)';
        this.container.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        this.container.style.touchAction = 'none'; // Prevent scrolling
        this.container.style.zIndex = '1000';

        this.knob = document.createElement('div');
        this.knob.style.position = 'absolute';
        this.knob.style.top = '50%';
        this.knob.style.left = '50%';
        this.knob.style.width = '60px';
        this.knob.style.height = '60px';
        this.knob.style.borderRadius = '50%';
        this.knob.style.background = 'rgba(255, 255, 255, 0.7)';
        this.knob.style.transform = 'translate(-50%, -50%)';
        this.knob.style.pointerEvents = 'none';
        
        // Add a WASD hint
        const hint = document.createElement('div');
        hint.innerText = '[WASD]';
        hint.style.position = 'absolute';
        hint.style.top = '-25px';
        hint.style.width = '100%';
        hint.style.textAlign = 'center';
        hint.style.color = 'rgba(255, 255, 255, 0.7)';
        hint.style.fontFamily = 'sans-serif';
        hint.style.fontSize = '12px';
        hint.style.fontWeight = 'bold';
        this.container.appendChild(hint);

        this.container.appendChild(this.knob);

        document.body.appendChild(this.container);

        this.container.addEventListener('pointerdown', this.onDown.bind(this));
        document.addEventListener('pointermove', this.onMove.bind(this));
        document.addEventListener('pointerup', this.onUp.bind(this));
    }

    private onDown(e: PointerEvent) {
        this.active = true;
        this.updateKnob(e);
    }

    private onMove(e: PointerEvent) {
        if (!this.active) return;
        this.updateKnob(e);
    }

    private onUp() {
        if (!this.active) return;
        this.active = false;
        this.knob.style.transform = 'translate(-50%, -50%)';
        
        // Reset keys
        this.keysPressed['w'] = false;
        this.keysPressed['s'] = false;
        this.keysPressed['a'] = false;
        this.keysPressed['d'] = false;
    }

    private updateKnob(e: PointerEvent) {
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > this.maxRadius) {
            dx = (dx / distance) * this.maxRadius;
            dy = (dy / distance) * this.maxRadius;
        }

        this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Update keys based on direction (apply running threshold)
        const runThreshold = 40; // Push far to run
        const threshold = 10;
        this.keysPressed['w'] = dy < -threshold;
        this.keysPressed['s'] = dy > threshold;
        this.keysPressed['a'] = dx < -threshold;
        this.keysPressed['d'] = dx > threshold;
        
        // Simulate holding shift if pushed far enough
        this.keysPressed['shift'] = distance > runThreshold;
    }

    public updateVisuals() {
        if (this.active) return; // Don't override if actively dragging

        let dx = 0;
        let dy = 0;
        if (this.keysPressed['a']) dx -= this.maxRadius;
        if (this.keysPressed['d']) dx += this.maxRadius;
        if (this.keysPressed['w']) dy -= this.maxRadius;
        if (this.keysPressed['s']) dy += this.maxRadius;

        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
}

export class ActionButton {
    public btn: HTMLDivElement;
    constructor(label: string, rightPos: string, bottomPos: string, hint: string, callback: () => void) {
        this.btn = document.createElement('div');
        this.btn.style.position = 'absolute';
        this.btn.style.bottom = bottomPos;
        this.btn.style.right = rightPos;
        this.btn.style.width = '80px';
        this.btn.style.height = '80px';
        this.btn.style.borderRadius = '50%';
        this.btn.style.background = 'rgba(255, 255, 255, 0.2)';
        this.btn.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        this.btn.style.color = 'white';
        this.btn.style.display = 'flex';
        this.btn.style.flexDirection = 'column';
        this.btn.style.alignItems = 'center';
        this.btn.style.justifyContent = 'center';
        this.btn.style.fontWeight = 'bold';
        this.btn.style.fontFamily = 'sans-serif';
        this.btn.style.userSelect = 'none';
        this.btn.style.cursor = 'pointer';
        this.btn.style.zIndex = '1000';
        this.btn.style.touchAction = 'none';
        this.btn.innerHTML = `<div>${label}</div><div style="font-size: 10px; margin-top: 5px; opacity: 0.7;">[${hint}]</div>`;

        this.btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.pressDown();
            callback();
        });
        this.btn.addEventListener('pointerup', (e) => {
            e.preventDefault();
            this.releaseUp();
        });
        // Handle case where pointer leaves the button while pressed
        this.btn.addEventListener('pointerout', (e) => {
            e.preventDefault();
            this.releaseUp();
        });
        document.body.appendChild(this.btn);
    }

    public pressDown() {
        this.btn.style.background = 'rgba(255, 255, 255, 0.5)';
    }

    public releaseUp() {
        this.btn.style.background = 'rgba(255, 255, 255, 0.2)';
    }
}