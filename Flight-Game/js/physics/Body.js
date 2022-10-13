import * as THREE from './lib/three/build/three.module.js';

export default class Body {
    constructor(props) {
        super();

        this.position = props.position ? props.position : new THREE.Vector3();
        this.quaternion = props.quaternion ? props.quaternion : new THREE.Quaternion();
        this.linearVelocity = props.linearVelocity ? props.linearVelocity : new THREE.Vector3();
        this.angularVelocity = props.angularVelocity ? props.angularVelocity : new THREE.Vector3();
    }
}
