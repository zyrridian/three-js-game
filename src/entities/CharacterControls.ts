import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { A, D, DIRECTIONS, S, W } from '../utils'


export class CharacterControls {

    model: THREE.Group
    mixer: THREE.AnimationMixer
    animationsMap: Map<string, THREE.AnimationAction> = new Map() // Walking, Running, Idle, Punch
    orbitControl: OrbitControls
    camera: THREE.Camera

    // state
    toggleRun: boolean = false
    currentAction: string
    isEmoting: boolean = false
    isJumping: boolean = false
    
    // temporary data
    walkDirection = new THREE.Vector3()
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion()
    cameraTarget = new THREE.Vector3()
    
    // constants
    fadeDuration: number = 0.2
    runVelocity = 5
    walkVelocity = 2

    constructor(model: THREE.Group,
        mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>,
        orbitControl: OrbitControls, camera: THREE.Camera,
        currentAction: string) {
        this.model = model
        this.mixer = mixer
        this.animationsMap = animationsMap
        this.currentAction = currentAction
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play()
            }
        })
        this.orbitControl = orbitControl
        this.camera = camera
        
        // Initialize camera target to model's current position
        this.cameraTarget.set(this.model.position.x, this.model.position.y + 1, this.model.position.z);
        this.orbitControl.target.copy(this.cameraTarget);
        
        this.mixer.addEventListener('finished', (e) => {
            const name = e.action.getClip().name;
            if (name === 'Jump' || name === 'WalkJump') {
                this.isJumping = false;
            }
            if (['Punch', 'Dance', 'Death', 'No', 'Sitting', 'ThumbsUp', 'Wave', 'Yes'].includes(name)) {
                this.isEmoting = false;
            }
        })
    }

    public switchRunToggle() {
        this.toggleRun = !this.toggleRun
    }
    
    public attack() {
        this.playEmote('Punch');
    }

    public playEmote(emoteName: string) {
        if (this.isEmoting || this.isJumping) return;
        this.isEmoting = true;
        const emoteAction = this.animationsMap.get(emoteName);
        if (emoteAction) {
            emoteAction.reset();
            emoteAction.timeScale = 1;
            emoteAction.setLoop(THREE.LoopOnce, 1);
            emoteAction.clampWhenFinished = true;
            const current = this.animationsMap.get(this.currentAction);
            if (current) current.fadeOut(this.fadeDuration);
            emoteAction.fadeIn(this.fadeDuration).play();
            this.currentAction = emoteName;
        }
    }

    public playEmoteReversed(emoteName: string) {
        if (this.isEmoting || this.isJumping) return;
        this.isEmoting = true;
        const emoteAction = this.animationsMap.get(emoteName);
        if (emoteAction) {
            emoteAction.reset();
            emoteAction.timeScale = -1;
            emoteAction.time = emoteAction.getClip().duration;
            emoteAction.setLoop(THREE.LoopOnce, 1);
            emoteAction.clampWhenFinished = true;
            const current = this.animationsMap.get(this.currentAction);
            if (current) current.fadeOut(this.fadeDuration);
            emoteAction.fadeIn(this.fadeDuration).play();
            this.currentAction = emoteName;
        }
    }

    public jump() {
        if (this.isJumping || this.isEmoting) return;
        this.isJumping = true;
        
        // Use WalkJump if moving, otherwise Jump
        const jumpActionName = (this.currentAction === 'Walking' || this.currentAction === 'Running') ? 'WalkJump' : 'Jump';
        const jumpAction = this.animationsMap.get(jumpActionName);
        
        if (jumpAction) {
            jumpAction.reset();
            jumpAction.setLoop(THREE.LoopOnce, 1);
            jumpAction.clampWhenFinished = true;
            const current = this.animationsMap.get(this.currentAction);
            if (current) current.fadeOut(this.fadeDuration);
            jumpAction.fadeIn(this.fadeDuration).play();
            this.currentAction = jumpActionName;
        }
    }

    public update(delta: number, keysPressed: any, collidables?: THREE.Object3D[]) {

        const directionPressed = DIRECTIONS.some(key => keysPressed[key] == true)

        var play = '';
        if (directionPressed && (this.toggleRun || keysPressed['shift'])) {
            play = 'Running'
        } else if (directionPressed) {
            play = 'Walking'
        } else {
            play = 'Idle'
        }

        if (!this.isJumping && !this.isEmoting) {
            if (this.currentAction != play) {
                const toPlay = this.animationsMap.get(play)
                const current = this.animationsMap.get(this.currentAction)

                if (current) current.fadeOut(this.fadeDuration)
                if (toPlay) toPlay.reset().fadeIn(this.fadeDuration).play();

                this.currentAction = play
            }
        }

        this.mixer.update(delta)

        if (this.isEmoting) {
            return; // Block movement while emoting
        }

        if (play == 'Running' || play == 'Walking') {
            // calculate towards camera direction
            var angleYCameraDirection = Math.atan2(
                    (this.camera.position.x - this.model.position.x), 
                    (this.camera.position.z - this.model.position.z))
            // diagonal movement angle offset
            var directionOffset = this.directionOffset(keysPressed)

            // rotate model
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset + Math.PI)
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2)

            // calculate direction
            this.camera.getWorldDirection(this.walkDirection)
            this.walkDirection.y = 0
            this.walkDirection.normalize()
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

            // run/walk velocity
            const velocity = play == 'Running' ? this.runVelocity : this.walkVelocity

            // move model & camera
            const moveX = this.walkDirection.x * velocity * delta;
            const moveZ = this.walkDirection.z * velocity * delta;
            
            if (collidables && collidables.length > 0) {
                const radius = 0.4;
                
                // Helper to check collision in a specific direction
                const checkCollision = (dir: THREE.Vector3, moveDist: number) => {
                    // Create a vector perpendicular to movement to offset rays sideways (creating a "wide" raycast)
                    const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
                    
                    // Cast rays starting from knee height (0.5) up to head (1.5). 
                    for (let h = 0.5; h <= 1.5; h += 0.5) {
                        // Cast 3 parallel rays horizontally: Left (-0.3), Center (0), Right (0.3)
                        for (let offset = -0.3; offset <= 0.3; offset += 0.3) {
                            const rayOrigin = new THREE.Vector3(
                                this.model.position.x + right.x * offset,
                                this.model.position.y + h,
                                this.model.position.z + right.z * offset
                            );
                            // The 4th parameter of Raycaster is 'far' (distance), NOT thickness! 
                            const ray = new THREE.Raycaster(rayOrigin, dir, 0, radius + moveDist);
                            const hits = ray.intersectObjects(collidables, true);
                            if (hits.some(hit => hit.object.visible)) return true;
                        }
                    }
                    return false;
                };

                // Check X axis
                if (Math.abs(moveX) > 0) {
                    const dirX = new THREE.Vector3(Math.sign(moveX), 0, 0);
                    if (!checkCollision(dirX, Math.abs(moveX))) {
                        this.model.position.x += moveX;
                    }
                }
                
                // Check Z axis
                if (Math.abs(moveZ) > 0) {
                    const dirZ = new THREE.Vector3(0, 0, Math.sign(moveZ));
                    if (!checkCollision(dirZ, Math.abs(moveZ))) {
                        this.model.position.z += moveZ;
                    }
                }
            } else {
                this.model.position.x += moveX;
                this.model.position.z += moveZ;
            }
            
            // We don't need to manually move the camera here anymore, 
            // syncCamera will handle it based on the model's new position.
        }
    }

    public syncCamera() {
        const newTargetY = this.model.position.y + 1;
        
        // Calculate how much the model has moved since last sync
        const deltaX = this.model.position.x - this.cameraTarget.x;
        const deltaY = newTargetY - this.cameraTarget.y;
        const deltaZ = this.model.position.z - this.cameraTarget.z;

        // move camera
        this.camera.position.x += deltaX;
        this.camera.position.y += deltaY;
        this.camera.position.z += deltaZ;

        // update camera target
        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = newTargetY;
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target.copy(this.cameraTarget);
    }

    private directionOffset(keysPressed: any) {
        var directionOffset = 0 // w

        if (keysPressed[W]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 // w+a
            } else if (keysPressed[D]) {
                directionOffset = - Math.PI / 4 // w+d
            }
        } else if (keysPressed[S]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
            } else if (keysPressed[D]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
            } else {
                directionOffset = Math.PI // s
            }
        } else if (keysPressed[A]) {
            directionOffset = Math.PI / 2 // a
        } else if (keysPressed[D]) {
            directionOffset = - Math.PI / 2 // d
        }

        return directionOffset
    }
}