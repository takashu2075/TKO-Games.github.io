import * as THREE from '../lib/three/build/three.module.js';    
import * as CANNON from '../lib/cannon-es/dist/cannon-es.js';
// import Vehicle from './Vehicle.js';
import Aircraft from './Aircraft.js';
// import { loadJson, loadTexture, loadObjFile, bodyToMesh } from "../Utils.js";
// import StandardMaterial from '../StandardMaterial.js';
// import TestMaterial from '../TestMaterial.js';
// import { loadModel } from '../ModelLoader.js';
// import PlayerController from '../PlayerController.js';
import Bullet from '../weapon/Bullet.js';
import Smoke from '../Smoke.js';

const CONFIG_FILE_NAME = "config.json";

export default class PlayerAircraft extends Aircraft {
    constructor(config, meshes, playerController) {
        super(config, meshes);

        this.playerController = playerController;

        const bodySize = config.bodySize 
            ? new CANNON.Vec3(config.bodySize.x, config.bodySize.y, config.bodySize.z)
            : new CANNON.Vec3(0.0, 0.0, 0.0);
        
        this.body = new CANNON.Body({
            mass: 5,
            shape: new CANNON.Box(bodySize),
            position: new CANNON.Vec3(0.0, 3000.0, -1000.0),
            angularDamping: 0.0,
            linearDamping: 0.0,
        });
        this.body.addEventListener('collide', (event) => {
            const damage = event.body.gameObject ? event.body.gameObject.damage : 0.0;
        });
        this.body.gameObject = this;
        this.body.isTrigger = true;
        
        // const bodyMesh = bodyToMesh(this.body, new TestMaterial());
        // this.meshes.push(bodyMesh);

        this.linearVelocity = new THREE.Vector3(0.0, 0.0, 0.0);
        this.angularVelocity = new THREE.Vector3(0.0, 0.0, 0.0);

        this.thrustForce = config.thrustForce ? config.thrustForce : 0.0;
        this.brakeForce = config.brakeForce ? config.brakeForce : 0.0;

        this.liftForce = config.liftForce ? config.liftForce : 0.0;

        this.pitchForce = config.pitchForce ? config.pitchForce : 0.0;
        this.rollForce = config.rollForce ? config.rollForce : 0.0;
        this.yawForce = config.yawForce ? config.yawForce : 0.0;

        this.linearDamping = config.linearDamping 
            ? new CANNON.Vec3(config.linearDamping.x, config.linearDamping.y, config.linearDamping.z)
            : new CANNON.Vec3(0.0, 0.0, 0.0);

        this.angularDamping = config.angularDamping 
            ? new CANNON.Vec3(config.angularDamping.x, config.angularDamping.y, config.angularDamping.z)
            : new CANNON.Vec3(0.0, 0.0, 0.0);

        this.iff = config.iff ? config.iff : 1;

        this.body.addEventListener('collide', function(event) {
            console.log('hit!');
            if (event.body.gameObject) {
                if (-1 < event.body.gameObject.isTerrain) {
                    this.explode();
                }
            }
        }.bind(this));
        this.body.isTrigger = true;

        this.health = Infinity;
    }

    update(game) {
        if (this.toDestroy) {
            this.destroy();
        }

		const linearVelocity = this.body.quaternion.conjugate().vmult(this.body.velocity);
		const angularVelocity = this.body.quaternion.conjugate().vmult(this.body.angularVelocity);

        let newLinearVelocity = new CANNON.Vec3(linearVelocity.x, linearVelocity.y, linearVelocity.z);
        let newAngularVelocity = new CANNON.Vec3(angularVelocity.x, angularVelocity.y, angularVelocity.z);

        newLinearVelocity = this.linearDamping.vmul(linearVelocity);
        newAngularVelocity = this.angularDamping.vmul(angularVelocity);

        newLinearVelocity = newLinearVelocity.vadd(this.getLinearVelocity(linearVelocity));
        newAngularVelocity = newAngularVelocity.vadd(this.getAngularVelocity(linearVelocity));

        this.body.velocity = this.body.quaternion.vmult(newLinearVelocity);
        this.body.angularVelocity = this.body.quaternion.vmult(newAngularVelocity);

        this.position = this.body.position;
        this.quaternion = this.body.quaternion;

        if (this.gunInterval < 0.0 && this.playerController.fireGun) {
            this.fireGun();
            this.gunInterval = 12;
        } else {
            this.gunInterval -= 1;
        }

    }

    addLinearAirResistance(linearForce, linearVelocity) {
        const result = new CANNON.Vec3(linearForce.x, linearForce.y, linearForce.z);

        const airResistanceX = this.linearAirResistance.x * Math.pow(linearVelocity.x, 2);
        if (0 < linearVelocity.x) {
            result.x -= airResistanceX;
        } else {
            result.x += airResistanceX;
        }

        const airResistanceY = this.linearAirResistance.y * Math.pow(linearVelocity.y, 2);
        if (0 < linearVelocity.y) {
            result.y -= airResistanceY;
        } else {
            result.y += airResistanceY;
        }

        const airResistanceZ = this.linearAirResistance.z * Math.pow(linearVelocity.z, 2);
        if (0 < linearVelocity.z) {
            result.z -= airResistanceZ;
        } else {
            result.z += airResistanceZ;
        }

        return result;
    }

    addAngularAirResistance(angularForce, angularVelocity, linearVelocity) {
        const result = new CANNON.Vec3(angularForce.x, angularForce.y, angularForce.z);

        const airResistanceX = this.angularAirResistance.x * Math.pow(angularVelocity.x, 2);
        if (0 < angularVelocity.x) {
            result.x -= airResistanceX;
        } else {
            result.x += airResistanceX;
        }

        const airResistanceY = this.angularAirResistance.y * Math.pow(angularVelocity.y, 2);
        if (0 < angularVelocity.y) {
            result.y -= airResistanceY;
        } else {
            result.y += airResistanceY;
        }

        const airResistanceZ = this.angularAirResistance.z * Math.pow(angularVelocity.z, 2);
        if (0 < angularVelocity.z) {
            result.z -= airResistanceZ;
        } else {
            result.z += airResistanceZ;
        }

        return result;
    }

    addLinearForce(linearForce, linearVelocity) {
        let result = new CANNON.Vec3(linearForce.x, linearForce.y, linearForce.z);
        result = this.addThrustForce(linearForce, linearVelocity);
        result = this.addLiftForce(result, linearVelocity);
        return result;
    }

    addThrustForce(linearForce, linearVelocity) {
        const result = new CANNON.Vec3(linearForce.x, linearForce.y, linearForce.z);

        let throttleInput = 0.5 * (1.0 - this.playerController.brake) + 0.5 * (this.playerController.throttle);
        result.z -= throttleInput * this.thrustForce;

        if (throttleInput < 0.1) {
            result.z += Math.pow(linearVelocity.z, 2) * this.brakeForce;
        }
        return result;
    }

    addLiftForce(linearForce, linearVelocity) {
        const result = new CANNON.Vec3(linearForce.x, linearForce.y, linearForce.z);
        let liftForce = Math.pow(linearVelocity.y * 1, 2) * this.liftForce;
        if (0 < linearVelocity.y) liftForce *= -1;
        result.y += liftForce;
        return result;
    }

    getLinearVelocity(linearVelocity) {
        const thrustVelocity = this.getThrustVelocity(linearVelocity);
        const liftVelocity = this.getLiftVelocity(linearVelocity);
        return new CANNON.Vec3(0.0, liftVelocity, thrustVelocity);
    }

    getThrustVelocity(linearVelocity) {
        let result = 0.0;

        let throttleInput = 0.5 * (1.0 - this.playerController.brake) + 0.5 * (this.playerController.throttle);
        result -= throttleInput * this.thrustForce;

        if (throttleInput < 0.1) {
            result += Math.pow(linearVelocity.z, 2) * this.brakeForce;
        }

        return result;
    }

    getLiftVelocity(linearVelocity) {
        let liftForce = Math.pow(linearVelocity.y, 2) * this.liftForce;
        if (0 < linearVelocity.y) liftForce *= -1;
        return liftForce;
    }

    addAngularForce(angularForce, linearVelocity) {
        let result = new CANNON.Vec3(angularForce.x, angularForce.y, angularForce.z);
        result = this.addPitchForce(angularForce, linearVelocity);
        result = this.addRollForce(result, linearVelocity);
        result = this.addYawForce(result, linearVelocity);
        return result;
    }

    addPitchForce(angularForce, linearVelocity) {
        const result = new CANNON.Vec3(angularForce.x, angularForce.y, angularForce.z);

        let restoreForce = Math.pow(linearVelocity.y, 2) * this.pitchForce;
        if (linearVelocity.y < 0.0) restoreForce *= -1;
        result.x += restoreForce;

        let pitchInput = Math.pow(this.playerController.elevator, 2);
        if (this.playerController.elevator < 0) pitchInput *= -1;
        if (this.playerController.freeCameraMode) pitchInput = 0.0;
        
        let inputForce = Math.pow(linearVelocity.z, 2) * this.pitchForce;
        inputForce *= pitchInput * Math.exp(-Math.abs(linearVelocity.z * 0.002)) * 0.03;
        result.x += inputForce;

        return result;
    }

    addRollForce(angularForce, linearVelocity) {
        const result = new CANNON.Vec3(angularForce.x, angularForce.y, angularForce.z);

        let rollInput = Math.pow(this.playerController.aileron, 2);
        if (this.playerController.aileron < 0) rollInput *= -1;
        if (this.playerController.freeCameraMode) rollInput = 0.0;

        let inputForce = Math.pow(linearVelocity.z, 2) * this.rollForce;
        inputForce *= rollInput * Math.exp(-Math.abs(linearVelocity.z * 0.002)) * 0.03;
        result.z -= inputForce;
        return result;
    }

    addYawForce(angularForce, linearVelocity) {
        const result = new CANNON.Vec3(angularForce.x, angularForce.y, angularForce.z);

        let restoreForce = Math.pow(linearVelocity.x, 2) * this.yawForce;
        if (linearVelocity.x < 0.0) restoreForce *= -1;
        result.y -= restoreForce;

        let yawInput = 0.0;
        if (this.playerController.yawLeft) yawInput += 1.0;
        if (this.playerController.yawRight) yawInput -= 1.0;
        if (this.playerController.freeCameraMode) yawInput = 0.0;

        let inputForce = Math.pow(linearVelocity.z, 2) * this.yawForce;
        inputForce *= yawInput * Math.exp(-Math.abs(linearVelocity.z * 0.002)) * 0.03;
        result.y += inputForce;

        return result;
    }

    getAngularVelocity(linearVelocity) {
        const pitchVelocity = this.getPitchVelocity(linearVelocity);
        const rollVelocity = this.getRollVelocity(linearVelocity);
        const yawVelocity = this.getYawVelocity(linearVelocity);
        return new CANNON.Vec3(pitchVelocity, yawVelocity, rollVelocity);
    }

    getPitchVelocity(linearVelocity) {
        let result = 0.0;

        let restoreForce = Math.pow(linearVelocity.y, 2) * this.pitchForce;
        if (linearVelocity.y < 0.0) restoreForce *= -1;
        result += restoreForce;

        let pitchInput = Math.pow(this.playerController.elevator, 2);
        if (this.playerController.elevator < 0) pitchInput *= -1;
        if (this.playerController.freeCameraMode) pitchInput = 0.0;
        
        let inputForce = Math.pow(linearVelocity.z, 2) * this.pitchForce * 0.03;
        // inputForce *= pitchInput * Math.exp(-Math.abs(linearVelocity.z * 0.002)) * 0.03;
        inputForce = Math.max(-0.04, inputForce);
        inputForce = Math.min(0.04, inputForce);
        inputForce *= pitchInput

        result += inputForce;

        return result;
    }

    getRollVelocity(linearVelocity) {
        let rollInput = Math.pow(this.playerController.aileron, 2);
        if (this.playerController.aileron < 0) rollInput *= -1;
        if (this.playerController.freeCameraMode) rollInput = 0.0;

        let inputForce = Math.pow(linearVelocity.z, 2) * this.rollForce * 0.03;
        // inputForce *= rollInput * Math.exp(-Math.abs(linearVelocity.z * 0.002)) * 0.03;
        inputForce = Math.max(-0.1, inputForce);
        inputForce = Math.min(0.1, inputForce);
        inputForce *= rollInput;

        return -inputForce;
    }

    getYawVelocity(linearVelocity) {
        let result = 0.0;

        let restoreForce = Math.pow(linearVelocity.x, 2) * this.yawForce;
        if (linearVelocity.x < 0.0) restoreForce *= -1;
        result -= restoreForce;

        let yawInput = 0.0;
        if (this.playerController.yawLeft) yawInput += 1.0;
        if (this.playerController.yawRight) yawInput -= 1.0;
        if (this.playerController.freeCameraMode) yawInput = 0.0;

        let inputForce = Math.pow(linearVelocity.z, 2) * this.yawForce * 0.01;
        // inputForce *= yawInput * Math.exp(-Math.abs(linearVelocity.z * 0.002)) * 0.03;
        inputForce = Math.max(-0.1, inputForce);
        inputForce = Math.min(0.1, inputForce);
        inputForce *= yawInput;

        result += inputForce;

        return result;
    }

    copy() {
        const meshes = [];
        for (const mesh of this.meshes) {
            meshes.push(mesh.clone());
        }
        return new this.constructor(this.config, meshes, this.playerController);
    }

    beforeRender() {
        this.position = new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z);
        this.quaternion = new THREE.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
        // const delayedPosition = new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z);
        // const delayedQuaternion = new THREE.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
        // const setCameraQuaternionDelay = () => {
        //     this.position = delayedPosition;
        //     // this.quaternion = new THREE.Quaternion(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
        //     this.quaternion = delayedQuaternion;
        // }
        // setTimeout(setCameraQuaternionDelay, Math.exp(-this.body.velocity.length * 0.001) * 1000);

        for (const mesh of this.meshes) {
            mesh.position.set(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );
            mesh.quaternion.set(
                this.body.quaternion.x,
                this.body.quaternion.y,
                this.body.quaternion.z,
                this.body.quaternion.w
            );
        }
    }

    getCameraPosition() {
        // let result = new CANNON.Vec3(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);
        // result = this.body.quaternion.vmult(result);
        // result = this.body.position.vadd(result);
        // return new THREE.Vector3(result.x, result.y, result.z);

        let result = new THREE.Vector3(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);
        result = result.applyQuaternion(this.quaternion);
        result = result.add(this.position);
        // return result;

        const cameraPosition = new CANNON.Vec3(result.x, result.y, result.z);

        const angularVelocity = this.quaternion.conjugate().vmult(this.body.angularVelocity);
        const cameraDelayVelocity = new CANNON.Vec3(angularVelocity.y, angularVelocity.x, 0.0).scale(1.0);

        let cameraDelayPosition = new CANNON.Vec3(this.body.angularVelocity.y, this.body.angularVelocity.x, this.body.angularVelocity.z);
        cameraDelayPosition = cameraDelayPosition.scale(100.0);
        const worldCameraDelayPosition = this.quaternion.vmult(cameraDelayVelocity);
        return cameraPosition.vadd(worldCameraDelayPosition);
    }

    getCameraQuaternion() {
        const angularVelocity = this.body.quaternion.conjugate().vmult(this.body.angularVelocity);
        let cameraDelayVelocity = angularVelocity.scale(-0.1);
        let worldCameraDelayQuaternion = this.quatFromAngularVelocity(cameraDelayVelocity);
        return this.quaternion.mult(worldCameraDelayQuaternion);
        // return this.quaternion;
    }

    quatFromAngularVelocity(angularVelocity)
        {
        const x = angularVelocity.x;
        const y = angularVelocity.y;
        const z = angularVelocity.z;
        const angle = Math.sqrt(x * x + y * y + z * z);  // module of angular velocity

        const result = new CANNON.Quaternion();
        if (angle > 0.0) // the formulas from the link
        {
            result.x = x * Math.sin(angle / 2.0) / angle;
            result.y = y * Math.sin(angle / 2.0) / angle;
            result.z = z * Math.sin(angle / 2.0) / angle;
            result.w = Math.cos(angle / 2.0);
        } else    // to avoid illegal expressions
        {
            result.x = 0.0;
            result.y = 0.0;
            result.z = 0.0;
            result.w = 1.0;
        }
        return result;
    }

    getPosition() {
        return this.position;
    }

    fireGun() {
        if (!this.game) {
            return;
        }

        let bulletVelocity = this.body.quaternion.vmult(new CANNON.Vec3(0.0, 0.0, -1200.0));

        bulletVelocity = this.body.velocity.vadd(bulletVelocity);

        const muzzlePos = this.rightMuzzle ? 3.0 : -3.0;
        this.rightMuzzle = !this.rightMuzzle;

        let muzzlePosition1 = this.body.quaternion.vmult(new CANNON.Vec3(muzzlePos, 1.0, -11.0));
        muzzlePosition1 = this.body.position.vadd(muzzlePosition1);

        let muzzlePosition2 = this.body.quaternion.vmult(new CANNON.Vec3(3.0, 0.0, -10.0));
        muzzlePosition2 = this.body.position.vadd(muzzlePosition2);

        const bullet1 = new Bullet(muzzlePosition1, this.body.quaternion, bulletVelocity, this, {radius: 2.5, iff: this.iff});
        this.game.addGameObject(bullet1);

        // const bullet2 = new Bullet(muzzlePosition2, this.body.quaternion, bulletVelocity, this, {radius: 2.0});
        // this.game.addGameObject(bullet2);
    }

    destroy() {
        if (this.game) {
            this.game.removeGameObject(this);
        }
    }
}
