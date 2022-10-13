import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";
import BillboardMaterial from "./BillboardMaterial.js";
import ColorMaterial from "./ColorMaterial.js";
import { loadTexture } from './Utils.js';

const TIME_UPDATE_VALUE = 0.003;

const texture = await loadTexture('img/smoke.png');

export default class Smoke extends GameObject {
    constructor(position, config) {
        super();

        this.size = config.size ? config.size : 10.0;

        this.position = position 
                ? new THREE.Vector3(position.x, position.y, position.z)
                : new THREE.Vector3(0.0, 0.0, 0.0);

        const geometry = this.createGeometry(1.0);
        const material = new BillboardMaterial(texture ? texture: new THREE.Texture(), this.size * 10.0);
        material.uniforms.fRandomTheta.value = Math.PI * Math.random();
        this.transparentMesh = new THREE.Mesh(geometry, material);
        this.transparentMesh.position.set(position.x, position.y, position.z);
        this.transparentMesh.frustumCulled = false;

        // const geometry = new THREE.SphereGeometry(config.size ? config.size : 10.0);
        // const material = new THREE.MeshBasicMaterial({
        //     color: 'cyan',
        //     transparent: true,
        //     opacity: 0.4
        // });
        // this.transparentMesh = new THREE.Mesh(geometry, material);

        // this.mesh = new THREE.Mesh(new THREE.SphereGeometry(config.size ? config.size : 10.0), new ColorMaterial(new THREE.Vector3(100 / 255, 0 / 255, 0 / 255)));
        // this.mesh.position.set(position.x, position.y, position.z);

        this.duration = config.duration ? config.duration : 1000.0;
        this.timeElapsed = 0.0;
    }

    update(game) {
        super.update(game);
        
        this.timeElapsed += 1.0;
        if (this.duration < this.timeElapsed) {
            this.destroy();
        }
        this.transparentMesh.material.uniforms.fTimeElapsed.value = this.timeElapsed * 0.1;
    }

    // reference: https://takumifukasawa.hatenablog.com/entry/threejs-billboard-shader
    createGeometry(size) {
        const geometry = new THREE.BufferGeometry();

        // この順番でポリゴンを張っていく
        // polygon indexes
        // 3 -- 2
        // |       |
        // 0 -- 1

        // 頂点を全て同じ位置（0）に
        const vertices = [
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,
        ];
        const uvs = [
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ];
        // ビュー座標系にてオフセットする方向を頂点ごとに定める
        const offsets = [
            -0.5, -0.5,
             0.5, -0.5,
             0.5,  0.5,
            -0.5,  0.5
        ];
        const v3Uvs = [
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 1.0, 0.0,
            0.0, 1.0, 0.0
        ];
        const indices = [
            0, 1, 2,
            2, 3, 0
        ];
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Uint16BufferAttribute(uvs, 2));
        geometry.setAttribute('v3Uvs', new THREE.Uint16BufferAttribute(v3Uvs, 3));
        geometry.setAttribute('offset', new THREE.Float32BufferAttribute(offsets, 2));
        
        return geometry;
    }
}
