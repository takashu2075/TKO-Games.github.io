import * as THREE from '../lib/three/build/three.module.js';
import * as CANNON from '../lib/cannon-es/dist/cannon-es.js';
// import Vehicle from './Vehicle.js';
import Weapon from './Weapon.js';
import { loadJson, loadTexture, loadObjFile } from "../Utils.js";
import { loadModel } from '../ModelLoader.js';
import StandardMaterial from '../StandardMaterial.js';
import ColorMaterial from '../ColorMaterial.js';
import TestMaterial from '../TestMaterial.js';
import Smoke from '../Smoke.js';

const CONFIG_FILE_NAME = "config.json";

let geometry = new THREE.BufferGeometry();
let texture = null;
loadModel('weapon/bullet/model.glb').then(function(meshes){
    geometry = meshes[0].geometry;
    texture = meshes[0].material.uniforms.tTexture.value;
});

export default class Bullet extends Weapon {
    constructor(position, quaternion, velocity, shooter, config = {}) {
        super();

        this.position = new CANNON.Vec3(position.x, position.y, position.z);
        this.quaternion = new CANNON.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        this.velocity = new CANNON.Vec3(velocity.x, velocity.y, velocity.z);
        this.shooter = shooter;
        this.radius = config.radius ? config.radius : 10.0;

        // const geometry = new THREE.SphereGeometry(config.radius ? config.radius : 1.0);
        // const material = new TestMaterial();
        // const material = new StandardMaterial(texture);
        // const color = new THREE.Vector3(255 / 255, 120 / 255, 50 / 255);
        const color = new THREE.Vector3(1.0, 0.5, 0.0);
        const material = new ColorMaterial(color, 1.5);
        this.mesh = new THREE.Mesh(geometry ? geometry: new THREE.BufferGeometry(), material);
        this.mesh.quaternion.set(this.quaternion.x, this.quaternion.y, this.quaternion.z, this.quaternion.w);
        this.mesh.scale.set(this.radius, this.radius, this.radius);
        // this.mesh = mesh.copy();

        this.iff = config.iff ? config.iff : 0;

        this.body = new CANNON.Body({
            mass: 0.1,
            shape: new CANNON.Sphere(this.radius * 0.5),
            position: new CANNON.Vec3(position.x, position.y, position.z),
            quaternion: new CANNON.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w),
            angularDamping: 0.0,
            linearDamping: 0.0,
        });
        this.body.addEventListener('collide', function(event) {
            // console.log('hit!');
            if (event.body.gameObject == this.shooter) {
                return;
            }
            if (event.body.gameObject) {
                if (-1000 < event.body.gameObject.health) {
                    if (this.iff == event.body.gameObject.iff) return;
                    event.body.gameObject.health -= this.damage;
                    // console.log('hit!')
                    if (event.body.gameObject.health < 0.0 && !event.body.gameObject.isWrecked) {
                        // event.body.gameObject.toDestroy = true;
                        event.body.gameObject.wreck();
                    }
                }
            }

            const smoke = new Smoke(this.body.position, {size: 1.2})
            this.game.addGameObject(smoke);

            this.toDestroy = true;
        }.bind(this));
        this.body.velocity = new CANNON.Vec3(this.velocity.x, this.velocity.y, this.velocity.z);
        this.body.isTrigger = true;

        // this.velocity = config.velocity ? velocity : 10.0;
        this.damage = config.damage ? config.damage : 20.0;
        this.duration = config.duration ? config.duration : 1000.0;
        this.timeElapsed = 0.0;
    }

    update(game) {
        super.update(game);
        // const veocityVector = this.quaternion.vmult(new CANNON.Vec3(0.0, 0.0, -this.velocity));
        // const newPosition = this.body.position.vadd(this.velocity);
        // this.body.position.set(newPosition.x, newPosition.y, newPosition.z);
        
        this.timeElapsed += 1.0;
        if (this.duration < this.timeElapsed) {
            this.destroy();
        }
    }

    beforeRender() {
        this.mesh.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
    }
}
