import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";
import ImposterMaterial from "./ImposterMaterial.js";
import ColorMaterial from "./ColorMaterial.js";
import { loadTexture } from './Utils.js';

const TIME_UPDATE_VALUE = 0.003;

const texture = await loadTexture('img/frame.png');

export default class Imposter extends GameObject {
    constructor(config) {
        super();

        this.size = config.size ? config.size : 10.0;

        this.position = config.position 
                ? new THREE.Vector3(config.position.x, config.position.y, config.position.z)
                : new THREE.Vector3(0.0, 0.0, 0.0);
        const geometry = this.createGeometry(1.0);
        this.material = new ImposterMaterial(texture, this.size * 10.0);

        this.transparentMesh = new THREE.Mesh(geometry, this.material);
        // this.transparentMesh = new THREE.Mesh(new THREE.SphereGeometry(config.size ? config.size : 10.0), transparentMaterial);
        this.transparentMesh.position.set(this.position.x, this.position.y, this.position.z);

        this.transparentMesh.frustumCulled = false;
    }

    update(game) {
        super.update(game);
        this.material.uniforms.meshPosition.value = this.position;
        this.material.uniforms.cameraPosition.value = game.mainCamera.getCamera().position;
        this.material.uniforms.cameraUpVec.value = game.mainCamera.getCamera().up;
    }

    createGeometry() {
        const geometry = new THREE.BufferGeometry();

        const uvs = [
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ];
        const offsets = [
            -1.0, -1.0,
             1.0, -1.0,
             1.0,  1.0,
            -1.0,  1.0
        ];
        const indices = [
            0, 1, 2,
            2, 3, 0
        ];
        geometry.setIndex(indices);
        geometry.setAttribute('uv', new THREE.Uint16BufferAttribute(uvs, 2));
        geometry.setAttribute('offset', new THREE.Float32BufferAttribute(offsets, 2));
        
        return geometry;
    }
}
