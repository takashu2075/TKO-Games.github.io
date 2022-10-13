import * as THREE from './lib/three/build/three.module.js';
import * as CANNON from './lib/cannon-es/dist/cannon-es.js';
import GameObject from "./GameObject.js";
import StandardMaterial from "./StandardMaterial.js";

export default class TestMesh2 extends GameObject {
    constructor(size) {
        super();

        const geometry = new THREE.PlaneGeometry(10000.0, 10000, 10, 10);
    
        // const geometry = new THREE.SphereGeometry(10000.0, 30, 30);
        // const geometry = new THREE.BoxGeometry(300.0);
        
        const material = new StandardMaterial();
        // material.side =  THREE.BackSide;
        // const material = new THREE.MeshBasicMaterial({color: 'red', side: THREE.DoubleSide});
    
        this.mesh = new THREE.Mesh(geometry, material);
        // this.transparentMesh = new THREE.Mesh(geometry, material);

        this.body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
        })
        this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // make it face up
        // world.addBody(groundBody)

        this.mesh.position.set(0.0, 0.0, 0.0);
        // this.mesh.rotation.x = Math.PI / 2;
        // this.transparentMesh.position.set(0.0, 2000.0, 0.0);
    }

    beforeRender() {
        this.mesh.position.set(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
        this.mesh.quaternion.set(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
    }
}
