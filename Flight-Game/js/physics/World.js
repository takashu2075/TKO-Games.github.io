import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";
import StandardMaterial from "./StandardMaterial.js";

export default class World {
    constructor(size) {
        super();

        this.bodies = [];
    }

    add(body) {

    }

    step() {
        for (const body of this.bodies) {
            body.position.add(body.linearVelocity);
        }
    }
}
