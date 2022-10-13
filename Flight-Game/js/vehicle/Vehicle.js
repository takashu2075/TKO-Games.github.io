import * as THREE from '../lib/three/build/three.module.js';
import * as CANNON from '../lib/cannon-es/dist/cannon-es.js';
import GameObject from "../GameObject.js";
import { loadModel } from '../ModelLoader.js';

export default class Vehicle extends GameObject {
    constructor(config, meshes) {
        super();

        this.config = config;
        this.meshes = meshes;
        this.position = config.position 
            ? new THREE.Vector3(config.position.x, config.position.y, config.position.z)
            : new THREE.Vector3(0.0, 0.0, 0.0);

        const euler = config.rotation 
            ? new THREE.Euler(config.position.x * (Math.PI / 180), config.position.y * (Math.PI / 180), config.position.z * (Math.PI / 180))
            : new THREE.Euler(0.0, 0.0, 0.0);

        this.quaternion = new THREE.Quaternion().setFromEuler(euler);

        this.cameraPosition = config.cameraPosition 
            ? new THREE.Vector3(config.cameraPosition.x, config.cameraPosition.y, config.cameraPosition.z)
            : new THREE.Vector3(0.0, 0.0, 0.0);

        this.health = 100.0;
    }

    update(game) {
        super.update(game);
        // for (const mesh of this.meshes) {
        //     mesh.position.set(
        //         this.body.position.x,
        //         this.body.position.y,
        //         this.body.position.z
        //     );
        //     mesh.quaternion.set(
        //         this.body.quaternion.x,
        //         this.body.quaternion.y,
        //         this.body.quaternion.z,
        //         this.body.quaternion.w
        //     );
        // }
    }

    getCameraPosition() {
        return this.cameraPosition;
    }

    copy() {
        const meshes = [];
        for (const mesh of this.meshes) {
            meshes.push(mesh.copy);
        }
        return new Vehicle(this.config, meshes, this.playerController);
    }

    getCameraPosition() {
        // const rotatedCameraPosition = this.cameraPosition.applyQuaternion(this.quaternion);
        // const worldCameraPosition = rotatedCameraPosition.add(this.position);
        // return this.cameraPosition.add(this.position);
        
        let rotatedCameraPosition = new THREE.Vector3(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);
        rotatedCameraPosition.applyQuaternion(this.meshes[0].quaternion);
        return new THREE.Vector3(this.position.x, this.position.y, this.position.z).add(rotatedCameraPosition);
        // return this.position;
    }

    getCameraRotation() {
        return this.meshes[0].rotation;
    }

    getCameraQuaternion() {
        return new THREE.Quaternion(this.quaternion.x, this.quaternion.y, this.quaternion.z, this.quaternion.w);
    }

    setTarget(target) {
        this.target = target;
    }
}
