import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";

const TIME_UPDATE_VALUE = 0.003;

class Sun extends GameObject {
    constructor(latitude, playerController) {
        super();

        this.playerController = playerController;

        this.timePi = Math.PI / 4;
        this.latitudePi = latitude == 0 ? 0 : Math.PI * (latitude / 90.0) / 2;
        this.sunDirection = new THREE.Vector3(1.0, 1.0, 1.0);
    }

    update() {
        if (!this.playerController.freeCameraMode) {
            // return;
        }

        if (this.playerController.increaseTimeOfDay) {
            this.timePi -= TIME_UPDATE_VALUE;
        } else if (this.playerController.decreaseTimeOfDay) {
            this.timePi += TIME_UPDATE_VALUE;
        }

        const x = Math.sin(this.timePi);
        const y = Math.cos(this.timePi) * Math.cos(this.latitudePi);
        const z = Math.cos(this.timePi) * Math.sin(this.latitudePi);
        this.sunDirection = new THREE.Vector3(x, y, z).normalize();
    }

    getSunDirection() {
        return this.sunDirection;
    }
}
export default Sun;
