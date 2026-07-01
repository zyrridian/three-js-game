import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface MapConfig {
    id: string;
    name: string;
    glbPath: string;
    spawnPoint: THREE.Vector3;
    scale: number;
    setup?: (scene: THREE.Scene, world: CANNON.World, environmentMeshes: THREE.Object3D[], physicsMaterial: CANNON.Material, manager: MapManager) => void;
}

export class MapManager {
    private scene: THREE.Scene;
    private world: CANNON.World;
    private environmentMeshes: THREE.Object3D[];
    private physicsMaterial: CANNON.Material;

    private currentMapObjects: THREE.Object3D[] = [];
    private currentMapBodies: CANNON.Body[] = [];

    public maps: Map<string, MapConfig> = new Map();
    public currentMapId: string | null = null;

    constructor(scene: THREE.Scene, world: CANNON.World, environmentMeshes: THREE.Object3D[], physicsMaterial: CANNON.Material) {
        this.scene = scene;
        this.world = world;
        this.environmentMeshes = environmentMeshes;
        this.physicsMaterial = physicsMaterial;
    }

    public registerMap(config: MapConfig) {
        this.maps.set(config.id, config);
    }

    public async loadMap(id: string, onProgress?: (progress: number) => void): Promise<MapConfig> {
        const config = this.maps.get(id);
        if (!config) throw new Error(`Map with id ${id} not found.`);

        this.clearCurrentMap();
        this.currentMapId = id;

        if (config.setup) {
            config.setup(this.scene, this.world, this.environmentMeshes, this.physicsMaterial, this);
        }

        if (config.glbPath) {
            await this.loadGLB(config.glbPath, config.scale, onProgress);
        }

        return config;
    }

    private clearCurrentMap() {
        for (const obj of this.currentMapObjects) {
            this.scene.remove(obj);
        }
        this.currentMapObjects = [];

        for (const body of this.currentMapBodies) {
            this.world.removeBody(body);
        }
        this.currentMapBodies = [];

        this.environmentMeshes.length = 0;
    }

    public trackObject(obj: THREE.Object3D) {
        this.currentMapObjects.push(obj);
    }

    public trackBody(body: CANNON.Body) {
        this.currentMapBodies.push(body);
    }

    private loadGLB(path: string, scale: number, onProgress?: (progress: number) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(path, (gltf) => {
                const mapGroup = gltf.scene;
                mapGroup.scale.set(scale, scale, scale);
                mapGroup.updateMatrixWorld(true);

                this.scene.add(mapGroup);
                this.trackObject(mapGroup);

                mapGroup.traverse((child: any) => {
                    if (child.isMesh) {
                        child.receiveShadow = true;
                        child.castShadow = true;
                        this.environmentMeshes.push(child);

                        const geometry = child.geometry as THREE.BufferGeometry;
                        if (geometry && geometry.attributes && geometry.attributes.position) {
                            const positionAttribute = geometry.attributes.position;
                            const vertices = Array.from(positionAttribute.array) as number[];
                            const indices = geometry.index ? Array.from(geometry.index.array) as number[] : [];

                            if (indices.length === 0) {
                                for (let i = 0; i < vertices.length / 3; i++) {
                                    indices.push(i);
                                }
                            }

                            const position = new THREE.Vector3();
                            const quaternion = new THREE.Quaternion();
                            const localScale = new THREE.Vector3();
                            child.matrixWorld.decompose(position, quaternion, localScale);

                            for (let i = 0; i < vertices.length; i += 3) {
                                vertices[i] *= localScale.x;
                                vertices[i + 1] *= localScale.y;
                                vertices[i + 2] *= localScale.z;
                            }

                            const trimeshShape = new CANNON.Trimesh(vertices, indices);
                            const trimeshBody = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
                            trimeshBody.addShape(trimeshShape);

                            trimeshBody.position.copy(position as any);
                            trimeshBody.quaternion.copy(quaternion as any);
                            this.world.addBody(trimeshBody);
                            this.trackBody(trimeshBody);
                            child.userData.physicsBody = trimeshBody;
                        }
                    }
                });

                resolve();
            },
            (xhr) => {
                if (onProgress) {
                    onProgress(xhr.loaded / xhr.total);
                }
            },
            (error) => {
                console.error("Error loading map:", error);
                reject(error);
            });
        });
    }
}
