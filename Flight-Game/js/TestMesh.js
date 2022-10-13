import * as THREE from './lib/three/build/three.module.js';
import * as CANNON from './lib/cannon-es/dist/cannon-es.js';
import GameObject from "./GameObject.js";
import StandardMaterial from "./StandardMaterial.js";

class TestMesh extends GameObject {
    constructor(size, position) {
        super();

        // const geometry = new THREE.PlaneGeometry(2500.0, 120.0, 20, 1);
    
        // const geometry = new THREE.PlaneGeometry(96000.0, 96000, 32, 32);

        const geometry = new THREE.SphereGeometry(size);
        
        const material = new StandardMaterial();
        // const material = new THREE.MeshBasicMaterial({color: 'red', side: THREE.DoubleSide});
    
        this.mesh = new THREE.Mesh(geometry, material);
        // this.transparentMesh = new THREE.Mesh(geometry, material);
        
        this.body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            mass: 0,
            // mass: 10,
            shape: new CANNON.Sphere(size),
            position: new CANNON.Vec3(position.x, position.y, position.z),
        });

        this.mesh.position.set(0.0, -100.0, 0.0);
        this.mesh.rotation.x = -Math.PI / 2;
    }

    beforeRender() {
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
    }
}

export default TestMesh;
