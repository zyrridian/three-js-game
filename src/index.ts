import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';

import { MapManager } from './managers/MapManager';
import { AudioManager } from './managers/AudioManager';
import { UIManager } from './managers/UIManager';
import { InputManager } from './managers/InputManager';

import { ParticleSystem } from './systems/ParticleSystem';
import { AtmosphereSystem } from './systems/AtmosphereSystem';
import { EventSystem, TriggerBox } from './systems/EventSystem';
import { CharacterControls } from './entities/CharacterControls';
import { Player } from './entities/Player';
import { FlamingoAI } from './entities/FlamingoAI';
import { BoxEnemyAI } from './entities/BoxEnemyAI';
import { Enemy } from './entities/Enemy';

window.addEventListener('error', function (event) {
    document.body.innerHTML += '<div style="background: white; padding: 20px; border: 5px solid red; color:red; z-index:9999; position:absolute; top:0; left: 0;"><b>RUNTIME ERROR:</b> ' + event.error.stack + '</div>';
});
window.addEventListener('unhandledrejection', function (event) {
    document.body.innerHTML += '<div style="background: white; padding: 20px; border: 5px solid red; color:red; z-index:9999; position:absolute; top:0; left: 0;"><b>PROMISE ERROR:</b> ' + event.reason + '</div>';
});

const settings = {
    lightIntensity: 1,
    walkVelocity: 2,
    runVelocity: 5,
    toggleShadows: false,
    enableSkybox: false,
    enableAudio: false,
    currentMapId: 'map1'
};

// SCENE & GLOBALS
const scene = new THREE.Scene();
const defaultBgColor = new THREE.Color(0xa8def0);
scene.background = defaultBgColor;

// Chest Glow Indicator
const chestPos = new THREE.Vector3(-5.23, 1.78, 3.66);
const chestGlowGeo = new THREE.RingGeometry(0.8, 1.2, 32);
const chestGlowMat = new THREE.MeshBasicMaterial({ color: 0xffff44, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
const chestGlowMesh = new THREE.Mesh(chestGlowGeo, chestGlowMat);
chestGlowMesh.position.set(chestPos.x, chestPos.y + 0.3, chestPos.z);
chestGlowMesh.rotation.x = Math.PI / 2;
scene.add(chestGlowMesh);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-2.54, 1.58, 6.34);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = settings.toggleShadows;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const glitchPass = new GlitchPass();
glitchPass.enabled = false;
glitchPass.goWild = true;
composer.addPass(glitchPass);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
};
orbitControls.update();

// Hack to allow rotating camera with right click while holding shift
renderer.domElement.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.shiftKey && e.button === 2 && e.isTrusted) {
        e.stopImmediatePropagation();
        const clone = new PointerEvent('pointerdown', {
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            clientX: e.clientX,
            clientY: e.clientY,
            screenX: e.screenX,
            screenY: e.screenY,
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            button: e.button,
            buttons: e.buttons,
            shiftKey: false, // Override shift
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            altKey: e.altKey
        });
        renderer.domElement.dispatchEvent(clone);
    }
}, { capture: true });

// PHYSICS
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const physicsMaterial = new CANNON.Material('standard');
const physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, { friction: 0.4, restitution: 0.7 });
world.addContactMaterial(physicsContactMaterial);

// MANAGERS & SYSTEMS
const environmentMeshes: THREE.Object3D[] = [];
const mapManager = new MapManager(scene, world, environmentMeshes, physicsMaterial);
const audioManager = new AudioManager(camera);
const uiManager = new UIManager();
const inputManager = new InputManager(() => performAttack());
const particleSystem = new ParticleSystem(scene);
const eventSystem = new EventSystem();
const atmosphereSystem = new AtmosphereSystem(scene);

let theBoss: BoxEnemyAI | null = null;
let isNearBoss: boolean = false;
let isNearChest: boolean = false;
let bossDialogueStage: number = 0;

// STATE
let player: Player | null = null;
const enemies: Enemy[] = [];
let isNight = false;
let smoothedCameraDist = -1;
let flashLight: THREE.SpotLight;
let hasSeenNight = false;
let canToggleNight = false;
let isCutscenePlaying = false;
let hasChestKey = false;
let isChestOpen = false;
let cutsceneCameraTarget = new THREE.Vector3();
let cutscenePlayerTarget = new THREE.Vector3();

// LIGHTS & ENVIRONMENT
let dirLight: THREE.DirectionalLight;
let ambientLight: THREE.AmbientLight;
let skyboxTexture: THREE.CubeTexture;
let moonMesh: THREE.Mesh;

function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, settings.lightIntensity);
    dirLight.position.set(-60, 100, -10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    scene.add(dirLight);

    const cubeTextureLoader = new THREE.CubeTextureLoader();
    cubeTextureLoader.setPath('./textures/skybox/');
    skyboxTexture = cubeTextureLoader.load([
        'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg'
    ], (texture) => {
        if (settings.enableSkybox) scene.background = texture;
    });

    // Create the Blood Moon
    const moonGroup = new THREE.Group();
    
    // Core moon
    const moonGeom = new THREE.SphereGeometry(6, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ 
        color: 0xaa2211, 
        emissive: 0xff4422, 
        emissiveIntensity: 0.8,
        roughness: 1
    });
    const coreMoon = new THREE.Mesh(moonGeom, moonMat);
    moonGroup.add(coreMoon);

    // Faint halo
    const haloGeom = new THREE.SphereGeometry(7.5, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
        color: 0xff4422,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    const haloMoon = new THREE.Mesh(haloGeom, haloMat);
    moonGroup.add(haloMoon);

    // Faint light cast by the moon
    const moonLight = new THREE.PointLight(0xff4422, 500, 300);
    moonGroup.add(moonLight);

    moonMesh = moonGroup as any; // Type hack to reuse the variable
    moonMesh.position.set(-60, 30, -80);
    moonMesh.visible = false; // Hidden by default (day)
    scene.add(moonMesh);
}
setupLighting();

// MAP SETUP
mapManager.registerMap({
    id: 'map1',
    name: 'Dungeon',
    glbPath: 'models/MapDungeon.glb',
    spawnPoint: new THREE.Vector3(10.13, 0.40, 16.03),
    scale: 1,
});

mapManager.registerMap({
    id: 'map2',
    name: 'Field',
    glbPath: 'models/collision-world.glb',
    spawnPoint: new THREE.Vector3(20, 2, 20),
    scale: 1,
    setup: (scene, world, envMeshes, physMat, manager) => {
        const textureLoader = new THREE.TextureLoader();
        const grassColor = textureLoader.load("./textures/terrain/grasslight-big.jpg");
        grassColor.wrapS = grassColor.wrapT = THREE.RepeatWrapping;
        grassColor.repeat.set(20, 20);

        const geometry = new THREE.PlaneGeometry(80, 80, 512, 512);
        const material = new THREE.MeshStandardMaterial({ map: grassColor });
        const floor = new THREE.Mesh(geometry, material);
        floor.receiveShadow = true;
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);
        envMeshes.push(floor);
        manager.trackObject(floor);

        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0, material: physMat });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        world.addBody(floorBody);
        manager.trackBody(floorBody);
    }
});

mapManager.loadMap(settings.currentMapId).then((config) => {
    if (player) {
        player.controls.model.position.copy(config.spawnPoint);
        player.controls.model.rotation.y = Math.PI;
        player.controls.syncCamera();
    }

    scene.traverse((child) => {
        if (child.name === 'Gate_Global_Metal_0' && (child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (!mesh.getObjectByName('GateBlocker')) {
                mesh.geometry.computeBoundingBox();
                if (mesh.geometry.boundingBox) {
                    const bbox = mesh.geometry.boundingBox;
                    const size = new THREE.Vector3();
                    bbox.getSize(size);
                    const center = new THREE.Vector3();
                    bbox.getCenter(center);

                    const blockerGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
                    const blockerMat = new THREE.MeshBasicMaterial({ visible: false });
                    const blockerMesh = new THREE.Mesh(blockerGeo, blockerMat);
                    blockerMesh.name = 'GateBlocker';
                    blockerMesh.position.copy(center);

                    mesh.add(blockerMesh);
                    environmentMeshes.push(blockerMesh);
                }
            }
        }
    });

    updateHorrorVisibility();
});

// START
uiManager.onStart(() => {
    settings.enableAudio = true;
    audioManager.initWebAudio();
    if (audioManager.bgmSound.buffer) audioManager.bgmSound.play();
});

audioManager.loadSounds(() => {
    const startAudio = () => {
        if (settings.enableAudio && !audioManager.bgmSound.isPlaying && !isNight) {
            try { audioManager.bgmSound.play(); } catch (e) { }
        }
        document.body.removeEventListener('click', startAudio);
        document.body.removeEventListener('keydown', startAudio);
    };
    document.body.addEventListener('click', startAudio);
    document.body.addEventListener('keydown', startAudio);
});

// PLAYER SETUP
new GLTFLoader().load('models/RobotExpressive.glb', function (gltf) {
    const model = gltf.scene;
    model.scale.set(0.25, 0.25, 0.25);

    flashLight = new THREE.SpotLight(0xffffee, 5, 25, Math.PI / 5, 0.5, 1);
    flashLight.position.set(0, 7, 0.5);
    flashLight.target.position.set(0, 3, 10);
    flashLight.castShadow = true;
    flashLight.visible = false;
    model.add(flashLight);
    model.add(flashLight.target);

    model.traverse((object: any) => { if (object.isMesh) object.castShadow = true; });
    scene.add(model);

    const mixer = new THREE.AnimationMixer(model);
    const animationsMap = new Map();
    gltf.animations.forEach((a) => animationsMap.set(a.name, mixer.clipAction(a)));

    const characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, 'Idle');

    const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
    const playerBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        position: new CANNON.Vec3(0, 1, 0),
        material: physicsMaterial
    });
    world.addBody(playerBody);

    player = new Player(model, playerBody, characterControls);
});

// ENEMY SETUP
function spawnBox(x: number, z: number) {
    const geom = new THREE.BoxGeometry(1, 2, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const dummyMesh = new THREE.Mesh(geom, mat);
    dummyMesh.castShadow = true;
    dummyMesh.receiveShadow = true;
    scene.add(dummyMesh);

    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
    const dummyBody = new CANNON.Body({ mass: 10, position: new CANNON.Vec3(x, 5, z), material: physicsMaterial });
    dummyBody.addShape(shape);
    world.addBody(dummyBody);

    theBoss = new BoxEnemyAI(dummyMesh, dummyBody);
    enemies.push(theBoss);
}

let enemyModel: THREE.Group;
let enemyAnimations: THREE.AnimationClip[];
function spawnFlamingo(x: number, z: number) {
    if (!enemyModel) return;
    const dummyMesh = new THREE.Group();
    const flamingo = SkeletonUtils.clone(enemyModel) as THREE.Group;
    dummyMesh.add(flamingo);
    dummyMesh.visible = isNight;
    scene.add(dummyMesh);

    const mixer = new THREE.AnimationMixer(flamingo);
    if (enemyAnimations.length > 0) mixer.clipAction(enemyAnimations[0]).play();

    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    const dummyBody = new CANNON.Body({ mass: 5, position: new CANNON.Vec3(x, 3, z), material: physicsMaterial, fixedRotation: true });
    dummyBody.addShape(shape);
    dummyBody.linearDamping = 0.5;
    dummyBody.linearFactor = new CANNON.Vec3(1, 0, 1);
    world.addBody(dummyBody);

    enemies.push(new FlamingoAI(dummyMesh, dummyBody, mixer));
}

new GLTFLoader().load('models/Flamingo.glb', function (gltf) {
    enemyModel = gltf.scene;
    enemyModel.scale.set(0.015, 0.015, 0.015);
    enemyModel.traverse((object: any) => { if (object.isMesh) object.castShadow = true; });
    enemyAnimations = gltf.animations;
    spawnFlamingo(2, 2);
});
spawnBox(-4, 0);
spawnBox(4, 2);

// GUI
const gui = new GUI();
gui.add(settings, 'lightIntensity', 0, 3).name('Light Intensity').onChange((v: number) => { if (dirLight) dirLight.intensity = v; });
gui.add(settings, 'walkVelocity', 1, 10).name('Walk Speed').onChange((v: number) => { if (player) player.controls.walkVelocity = v; });
gui.add(settings, 'runVelocity', 1, 20).name('Run Speed').onChange((v: number) => { if (player) player.controls.runVelocity = v; });
gui.add(settings, 'toggleShadows').name('Enable Shadows').onChange((v: boolean) => {
    renderer.shadowMap.enabled = v;
    scene.traverse((child: any) => { if (child.material) child.material.needsUpdate = true; });
});
gui.add(settings, 'enableSkybox').name('Enable Skybox').onChange((v: boolean) => {
    scene.background = v ? skyboxTexture : defaultBgColor;
});
gui.add(settings, 'enableAudio').name('Enable Audio (BGM)').onChange((v: boolean) => {
    if (v) {
        if (!audioManager.bgmSound.isPlaying && audioManager.bgmSound.buffer) audioManager.bgmSound.play();
    } else {
        if (audioManager.bgmSound.isPlaying) audioManager.bgmSound.pause();
    }
});

function triggerTeleportEffect(onPeak: () => void) {
    glitchPass.enabled = true;
    uiManager.setScreenFlash('1');

    if (audioManager.teleportSound.buffer) {
        if (audioManager.teleportSound.isPlaying) audioManager.teleportSound.stop();
        audioManager.teleportSound.play();
    }

    let warpInterval = setInterval(() => {
        camera.fov = Math.min(camera.fov + 10, 150);
        camera.updateProjectionMatrix();
    }, 16);

    setTimeout(() => {
        clearInterval(warpInterval);
        onPeak();
        glitchPass.enabled = false;
        uiManager.setScreenFlash('0');
        camera.fov = 45;
        camera.updateProjectionMatrix();
    }, 300);
}

gui.add(settings, 'currentMapId', ['map1', 'map2']).name('Select Map').onChange((v: string) => {
    triggerTeleportEffect(() => {
        mapManager.loadMap(v).then((config) => {
            if (player) {
                player.controls.model.position.copy(config.spawnPoint);
                player.body.position.copy(config.spawnPoint as any);
                player.velocityY = 0;
                player.controls.model.rotation.y = Math.PI;
                player.controls.cameraTarget.set(config.spawnPoint.x, config.spawnPoint.y + 1, config.spawnPoint.z);
                player.controls.camera.position.set(-2.54 + config.spawnPoint.x, 1.58 + config.spawnPoint.y, 6.34 + config.spawnPoint.z);
                player.controls.orbitControl.target.copy(player.controls.cameraTarget);

                enemies.forEach((enemy, idx) => {
                    const offset = new THREE.Vector3(Math.cos(idx) * 2, 2, Math.sin(idx) * 2);
                    const spawn = config.spawnPoint.clone().add(offset);
                    enemy.body.position.copy(spawn as any);
                    enemy.body.velocity.set(0, 0, 0);
                });
            }
        });
    });
});

const emoteParams = {
    playDance: () => { if (player) player.controls.playEmote('Dance'); },
    playDeath: () => { if (player) player.controls.playEmote('Death'); },
    playNo: () => { if (player) player.controls.playEmote('No'); },
    playSitting: () => { if (player) player.controls.playEmote('Sitting'); },
    playThumbsUp: () => { if (player) player.controls.playEmote('ThumbsUp'); },
    playWave: () => { if (player) player.controls.playEmote('Wave'); },
    playYes: () => { if (player) player.controls.playEmote('Yes'); },
};
const emoteFolder = gui.addFolder('Emotes');
emoteFolder.add(emoteParams, 'playDance').name('Dance');
emoteFolder.add(emoteParams, 'playDeath').name('Death');
emoteFolder.add(emoteParams, 'playNo').name('No');
emoteFolder.add(emoteParams, 'playSitting').name('Sitting');
emoteFolder.add(emoteParams, 'playThumbsUp').name('ThumbsUp');
emoteFolder.add(emoteParams, 'playWave').name('Wave');
emoteFolder.add(emoteParams, 'playYes').name('Yes');

// LOGIC & EVENTS
function performAttack() {
    if (isCutscenePlaying) return;
    if (settings.enableAudio && !audioManager.bgmSound.isPlaying && audioManager.bgmSound.buffer) {
        audioManager.bgmSound.play();
    }
    if (player) {
        player.controls.attack();
        if (audioManager.punchSound.buffer) {
            if (audioManager.punchSound.isPlaying) audioManager.punchSound.stop();
            audioManager.punchSound.play();
        }
        const attackRange = 2.5;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const dist = enemy.mesh.position.distanceTo(player.controls.model.position);
            if (dist < attackRange) {
                particleSystem.spawn(enemy.mesh.position);
                const forceDir = new THREE.Vector3().subVectors(enemy.mesh.position, player.controls.model.position);
                forceDir.y = 1;
                forceDir.normalize();
                const impulseForce = 20; // Reduced from 150 so it doesn't fly into orbit!
                const impulse = new CANNON.Vec3(forceDir.x * impulseForce, forceDir.y * impulseForce, forceDir.z * impulseForce);
                enemy.body.applyImpulse(impulse, new CANNON.Vec3(0, -0.5, 0));
                
                enemy.hp = (enemy.hp === undefined ? 3 : enemy.hp) - 1;
                
                if (enemy.hp <= 0) {
                    scene.remove(enemy.mesh);
                    world.removeBody(enemy.body);
                    enemies.splice(i, 1);
                    if (enemy.isBird) {
                        hasChestKey = true;
                        uiManager.showNotification('Flamingo defeated! You found the Chest Key!');
                        uiManager.showKey();
                        if (audioManager) audioManager.playKeySFX();
                    }
                }
            }
        }
    }
}
inputManager.setupMouseInteraction(renderer.domElement, performAttack);

function isHorrorObject(objName: string) {
    const lowerName = objName.toLowerCase();
    if (lowerName.includes('enemie') || lowerName.includes('boss')) return true;
    if (lowerName.includes('shield')) return true;
    if (lowerName.includes('cube')) return true;
    if (lowerName.includes('character')) return true;
    if (lowerName.includes('sword')) return true;
    if (objName.match(/Shield\.00[1-5]/i)) return true;
    if (objName.match(/Cube\.00[4-9]/i)) return true;
    return false;
}

function updateHorrorVisibility() {
    scene.traverse((child) => {
        let isHorror = false;
        let obj: THREE.Object3D | null = child;
        while (obj) {
            if (isHorrorObject(obj.name || '')) {
                isHorror = true;
                break;
            }
            obj = obj.parent;
        }

        if (isHorror) {
            child.visible = isNight;
            if (child.userData && child.userData.physicsBody) {
                const body = child.userData.physicsBody;
                if (isNight) {
                    if (!body.world) world.addBody(body);
                } else {
                    if (body.world) world.removeBody(body);
                }
            }
        }

        const exactName = child.name;
        if ((exactName === 'Gate_Global_Metal_0') && (child as THREE.Mesh).isMesh) {
            if (child.userData.originalY === undefined) child.userData.originalY = child.position.y;
            const openOffset = 2.5;
            const offset = isNight ? 0 : openOffset;
            child.position.y = child.userData.originalY + offset;

            if (child.userData.physicsBody) {
                const body = child.userData.physicsBody;
                if (body.userData === undefined) body.userData = {};
                if (body.userData.originalY === undefined) body.userData.originalY = body.position.y;
                body.position.y = body.userData.originalY + offset;
            }
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
        event.preventDefault();
        if (!canToggleNight) return;
        if (isCutscenePlaying && event.isTrusted) return;
        
        const willBeNight = !isNight;
        if (willBeNight && audioManager.bgmSound) audioManager.bgmSound.setVolume(0);

        triggerTeleportEffect(() => {
            isNight = willBeNight;
            uiManager.setNightMode(isNight);
            uiManager.triggerClockFlash();

            if (isNight) {
                ambientLight.intensity = 0.3;
                ambientLight.color.setHex(0x555577);
                dirLight.intensity = 0.3;
                dirLight.color.setHex(0x9999bb);
                scene.background = new THREE.Color(0x0a0a1a);

                moonMesh.visible = true;
                atmosphereSystem.setVisible(false);

                enemies.forEach(e => { if (e.isBird) e.mesh.visible = false; });

                if (!hasSeenNight) {
                    hasSeenNight = true;
                    uiManager.showFlashlightHint();
                }
                audioManager.playNightBGM();
                uiManager.updateFlashlightUI(isNight, flashLight && flashLight.visible);
            } else {
                ambientLight.intensity = 0.7;
                ambientLight.color.setHex(0xffffff);
                dirLight.intensity = settings.lightIntensity;
                dirLight.color.setHex(0xffffff);
                scene.background = settings.enableSkybox ? skyboxTexture : defaultBgColor;
                if (audioManager.bgmSound) audioManager.bgmSound.setVolume(0.2);

                moonMesh.visible = false;
                atmosphereSystem.setVisible(true);

                enemies.forEach(e => { if (e.isBird) e.mesh.visible = true; });
                audioManager.stopNightBGM();
                uiManager.updateFlashlightUI(isNight, flashLight && flashLight.visible);
            }
            updateHorrorVisibility();
        });
        return;
    }

    if (event.key.toLowerCase() === 'f') {
        if (!canToggleNight) return;
        if (flashLight) {
            flashLight.visible = !flashLight.visible;
            if (isNight) {
                audioManager.playFlashlightSFX();
                uiManager.updateFlashlightUI(isNight, flashLight.visible);
                audioManager.toggleFlashlightBGM(flashLight.visible);
                const hint = document.getElementById('flashlight-hint');
                if (hint) {
                    hint.style.opacity = '0';
                    setTimeout(() => hint.remove(), 500);
                }
            }
        }
    }

    if (event.key.toLowerCase() === 'e') {
        if ((event.key === 'e' || event.key === 'E') && isNearChest && !isChestOpen && !isCutscenePlaying && player) {
            if (hasChestKey) {
                isChestOpen = true;
                chestGlowMesh.visible = false;
                uiManager.showNotification('Chest opened! You found a mysterious artifact!');
                uiManager.hideInteractionPrompt();
                uiManager.hideKey();
                
                uiManager.showFinishedScreen();
                if (audioManager) {
                    if (audioManager.bgmSound) audioManager.bgmSound.setVolume(0);
                    audioManager.playSuccessMusic();
                }
            } else {
                uiManager.showNotification('Locked. You need a key.');
            }
        }

        // Boss interaction trigger
        if ((event.key === 'e' || event.key === 'E') && isNearBoss && !isCutscenePlaying && player) {
            uiManager.hideInteractionPrompt();
            isCutscenePlaying = true;
            
            // Boss interaction trigger
            // The Boss is the static throne at ~ (11.13, 2.5, -15.34)
            const thronePos = new THREE.Vector3(11.13, 1.5, -15.34);
            cutscenePlayerTarget.copy(thronePos);
            
            // Camera fix: Over the shoulder, looking at the boss
            cutsceneCameraTarget.set(12.0, 2.8, -8.0);
            
            const typeCallback = (speaker: string) => audioManager.playTalkSFX(speaker);
            
            if (bossDialogueStage === 0) {
                uiManager.startCutsceneDialogue([
                    { speaker: 'Boss', text: "Ah, Aegis... you've finally arrived to claim your prize..." },
                    { speaker: 'Boss', text: "Wait. You're not Aegis. You're just a tiny scrap of metal!" },
                    { speaker: 'Boss', text: "How did a mere worker robot enter this domain? Time is frozen for all but the Hero!" },
                    { speaker: 'Boss', text: "Do you truly believe you have the power to defeat me?", choices: [
                        { text: 'YES', callback: () => {
                            player?.controls.playEmote('Yes');
                            uiManager.startCutsceneDialogue([
                                { speaker: 'Boss', text: "Foolish metal scrap! We shall see!" }
                            ], () => { isCutscenePlaying = false; bossDialogueStage = 1; }, typeCallback);
                        }},
                        { text: 'NO', callback: () => {
                            player?.controls.playEmote('No');
                            uiManager.startCutsceneDialogue([
                                { speaker: 'Boss', text: "Hah! Smart choice. But you won't leave here alive anyway." }
                            ], () => { isCutscenePlaying = false; bossDialogueStage = 1; }, typeCallback);
                        }}
                    ]}
                ], () => {}, typeCallback);
            } else if (bossDialogueStage === 1) {
                uiManager.startCutsceneDialogue([
                    { speaker: 'Boss', text: "Still here, little machine? The frozen time won't protect you forever." },
                    { speaker: 'Boss', text: "Only the true Aegis can wield the power to unfreeze this dungeon." }
                ], () => { isCutscenePlaying = false; bossDialogueStage = 2; }, typeCallback);
            } else if (bossDialogueStage === 2) {
                uiManager.startCutsceneDialogue([
                    { speaker: 'Boss', text: "That unusual aura you possess... It rivals Aegis himself." },
                    { speaker: 'Boss', text: "Could it be that the time anomaly... gave you consciousness?" }
                ], () => { isCutscenePlaying = false; bossDialogueStage = 3; }, typeCallback);
            } else {
                uiManager.startCutsceneDialogue([
                    { speaker: 'Boss', text: "Go on, tiny anomaly. The chest awaits." },
                    { speaker: 'Boss', text: "Let us see if you can rewrite history." }
                ], () => { isCutscenePlaying = false; }, typeCallback);
            }
        }
    }
});

document.addEventListener('playerDied', () => {
    if (audioManager) audioManager.playRobotDeathSFX();
});

const clock = new THREE.Clock();

const debugPos = document.createElement('div');
debugPos.style.position = 'absolute';
debugPos.style.top = '20px';
debugPos.style.left = '160px';
debugPos.style.color = 'white';
debugPos.style.background = 'rgba(0,0,0,0.5)';
debugPos.style.padding = '10px';
debugPos.style.fontFamily = 'monospace';
debugPos.style.zIndex = '100';
document.body.appendChild(debugPos);

const shiftHint = document.createElement('div');
shiftHint.style.position = 'absolute';
shiftHint.style.bottom = '20px';
shiftHint.style.left = '50%';
shiftHint.style.transform = 'translateX(-50%)';
shiftHint.style.color = 'white';
shiftHint.style.background = 'rgba(0,0,0,0.5)';
shiftHint.style.padding = '10px 20px';
shiftHint.style.borderRadius = '5px';
shiftHint.style.fontFamily = 'monospace';
shiftHint.style.zIndex = '100';
shiftHint.innerHTML = 'Hold SHIFT to Run';
document.body.appendChild(shiftHint);

// SETUP SPECIFIC EVENTS
eventSystem.addTrigger(new TriggerBox(
    new THREE.Vector3(8.90, 1.48, 8.50),
    new THREE.Vector3(14.05, 6.00, 9.50),
    () => {
        canToggleNight = true;
        // Simulate a Tab key press to trigger night mode transition
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    }
));

eventSystem.addTrigger(new TriggerBox(
    new THREE.Vector3(-6.00, 0.00, -9.00),
    new THREE.Vector3(17.00, 7.00, -8.00),
    () => {
        const startCutscene = () => {
            isCutscenePlaying = true;
            if (player) {
                // Position camera slightly behind and above the player
                cutsceneCameraTarget.copy(player.controls.model.position).add(new THREE.Vector3(0, 2.23, 6.75));
            } else {
                cutsceneCameraTarget.set(11.14, 3.73, 2.96);
            }
            // Focus point: the throne
            cutscenePlayerTarget.set(11.13, 2.58, -15.34);
            
            const dialogueLore = [
                { speaker: "Bone Lord Malakor", text: "Rise, my minions! The time has come to reclaim our domain.", speakerColor: "#ff4444" },
                { speaker: "Bone Lord Malakor", text: "These trespassing fools think they can pillage our treasures...", speakerColor: "#ff4444" },
                { speaker: "Bone Lord Malakor", text: "Show them the true meaning of despair! Leave no survivors!", speakerColor: "#ff4444" }
            ];

            uiManager.startCutsceneDialogue(dialogueLore, () => {
                isCutscenePlaying = false;
            }, () => {
                if (audioManager) audioManager.playDialogueBeep();
            });
        };

        if (!isNight) {
            // Force night mode and start cutscene after transition peak
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
            setTimeout(startCutscene, 300);
        } else {
            startCutscene();
        }
    }
));

// MAIN LOOP
function animate() {
    let delta = clock.getDelta();
    inputManager.updateVisuals();

    if (player) {
        if (isCutscenePlaying) {
            player.update(delta, {}, environmentMeshes, mapManager.maps.get(settings.currentMapId));
            const lookPos = new THREE.Vector3(cutscenePlayerTarget.x, player.controls.model.position.y, cutscenePlayerTarget.z);
            player.controls.model.lookAt(lookPos);
        } else {
            player.update(delta, inputManager.keysPressed, environmentMeshes, mapManager.maps.get(settings.currentMapId));
        }

        const pos = player.controls.model.position;
        debugPos.innerHTML = `Player: x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}<br>Camera: x: ${camera.position.x.toFixed(2)}, y: ${camera.position.y.toFixed(2)}, z: ${camera.position.z.toFixed(2)}`;
        
        // Chest logic
        let distToChest = Infinity;
        if (!isChestOpen) {
            chestGlowMesh.rotation.z += delta;
            chestGlowMesh.scale.setScalar(1 + 0.1 * Math.sin(clock.elapsedTime * 5));
            distToChest = pos.distanceTo(chestPos);
            if (distToChest < 3.0) {
                isNearChest = true;
                uiManager.showInteractionPrompt('Press [E] to open chest');
            } else {
                isNearChest = false;
                uiManager.hideInteractionPrompt();
            }
        }
        
        // Boss interaction logic
        const bossTriggerPos = new THREE.Vector3(13.8, 1.48, -15.0);
        if (theBoss && !isCutscenePlaying) {
            // Calculate 2D distance to the static trigger zone to ignore Y differences
            const dx = pos.x - bossTriggerPos.x;
            const dz = pos.z - bossTriggerPos.z;
            const distToTrigger = Math.sqrt(dx*dx + dz*dz);
            
            if (distToTrigger < 4.0) {
                isNearBoss = true;
                if (distToChest >= 3.0) { // Don't override chest prompt
                    uiManager.showInteractionPrompt('Press [E] to talk to Boss');
                }
            } else {
                if (isNearBoss) {
                    isNearBoss = false;
                    if (distToChest >= 3.0) uiManager.hideInteractionPrompt();
                }
            }
        }
    }

    world.step(1 / 60, delta, 3);

    let inSafeZone = false;
    if (player && player.controls.model) {
        const px = player.controls.model.position.x;
        const pz = player.controls.model.position.z;
        if (px > 5 && pz > 5) inSafeZone = true;
    }

    const playerPos = player?.controls.model.position;
    const aiTargetPos = isCutscenePlaying ? undefined : playerPos; // Freeze Boss AI if in cutscene
    for (const enemy of enemies) {
        if (enemy instanceof FlamingoAI) {
            enemy.update(delta, aiTargetPos, isNight, inSafeZone);
        } else if (enemy instanceof BoxEnemyAI) {
            enemy.update(delta, aiTargetPos);
        }
    }

    particleSystem.update(delta);
    atmosphereSystem.update(delta);
    if (player) {
        eventSystem.update(player.controls.model.position);
    }
    
    if (!isCutscenePlaying) {
        orbitControls.update();
    }

    // Camera Collision
    const originalCameraPos = camera.position.clone();
    if (player && player.controls.model) {
        const targetPos = player.controls.cameraTarget;
        const dir = new THREE.Vector3().subVectors(originalCameraPos, targetPos);
        const maxDist = dir.length();
        dir.normalize();

        let targetDist = maxDist;
        const raycaster = new THREE.Raycaster(targetPos, dir, 0, maxDist);
        const intersects = raycaster.intersectObjects(environmentMeshes, true);

        const validIntersects = intersects.filter(hit => {
            if (!hit.object.visible) return false;
            let obj: THREE.Object3D | null = hit.object;
            while (obj) {
                const name = (obj.name || '').toLowerCase();
                if (isHorrorObject(obj.name || '')) return false;
                if (name.includes('enemie') || name.includes('boss') ||
                    name.includes('guard') || name.includes('weapon') || name.includes('hand') ||
                    name.includes('body') || name.includes('shield_spears') || name.includes('chest')) {
                    return false;
                }
                obj = obj.parent;
            }
            return true;
        });

        if (validIntersects.length > 0) {
            const margin = 0.2;
            targetDist = Math.max(0, validIntersects[0].distance - margin);
        }

        if (smoothedCameraDist === -1) smoothedCameraDist = targetDist;
        const lerpSpeed = targetDist < smoothedCameraDist ? 0.5 : 0.15;
        smoothedCameraDist += (targetDist - smoothedCameraDist) * lerpSpeed;
        
        if (!isCutscenePlaying) {
            camera.position.copy(targetPos).add(dir.multiplyScalar(smoothedCameraDist));
        }
    }

    if (isCutscenePlaying) {
        camera.position.lerp(cutsceneCameraTarget, 0.05);
        camera.lookAt(cutscenePlayerTarget);
    }

    composer.render();
    if (!isCutscenePlaying) {
        camera.position.copy(originalCameraPos);
    }
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
