import * as THREE from 'three';

export class AtmosphereSystem {
    private scene: THREE.Scene;
    private windStreaks: THREE.Mesh[] = [];
    private clouds: THREE.Group[] = [];
    public group: THREE.Group;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.initWind();
        this.initClouds();
    }

    private initWind() {
        const windGeom = new THREE.CylinderGeometry(0.05, 0.05, 5, 8);
        windGeom.rotateZ(Math.PI / 2); // Make it horizontal
        const windMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.2,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 40; i++) {
            const mesh = new THREE.Mesh(windGeom, windMat);
            this.resetWind(mesh);
            // Randomize initial x so they don't all start at the edge
            mesh.position.x = (Math.random() - 0.5) * 100;
            this.windStreaks.push(mesh);
            this.group.add(mesh);
        }
    }

    private resetWind(mesh: THREE.Mesh) {
        mesh.position.set(
            50 + Math.random() * 20, // Start far right
            -5 + Math.random() * 25, // Height variation (from slightly below map to high up)
            (Math.random() - 0.5) * 60 // Spread across Z
        );
        mesh.userData.speed = 15 + Math.random() * 20; // Fast!
    }

    private initClouds() {
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 1,
            flatShading: true,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < 15; i++) {
            const cloudGroup = new THREE.Group();
            
            // Generate a random cluster of low-poly boxes to form a cloud
            const numPuffs = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < numPuffs; j++) {
                const size = 1 + Math.random() * 2;
                const puffGeom = new THREE.BoxGeometry(size, size * 0.5, size);
                const puff = new THREE.Mesh(puffGeom, cloudMat);
                puff.position.set(
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 3
                );
                // Random rotations for a chaotic low-poly look
                puff.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                cloudGroup.add(puff);
            }

            this.resetCloud(cloudGroup);
            // Randomize initial x so they are scattered
            cloudGroup.position.x = (Math.random() - 0.5) * 100;
            this.clouds.push(cloudGroup);
            this.group.add(cloudGroup);
        }
    }

    private resetCloud(cloud: THREE.Group) {
        cloud.position.set(
            60 + Math.random() * 40, // Start far right
            -15 + Math.random() * 10, // Float *below* the map
            (Math.random() - 0.5) * 80
        );
        cloud.userData.speed = 1 + Math.random() * 2; // Slow drift
    }

    public update(delta: number) {
        if (!this.group.visible) return;

        // Move wind
        for (const wind of this.windStreaks) {
            wind.position.x -= wind.userData.speed * delta;
            if (wind.position.x < -60) {
                this.resetWind(wind);
            }
        }

        // Move clouds
        for (const cloud of this.clouds) {
            cloud.position.x -= cloud.userData.speed * delta;
            // Add subtle bobbing
            cloud.position.y += Math.sin(Date.now() * 0.001 + cloud.userData.speed) * 0.01;
            
            if (cloud.position.x < -80) {
                this.resetCloud(cloud);
            }
        }
    }

    public setVisible(visible: boolean) {
        this.group.visible = visible;
    }
}
