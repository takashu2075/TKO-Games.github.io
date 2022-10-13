import * as THREE from './../lib/three/build/three.module.js';
import * as CANNON from '../lib/cannon-es/dist/cannon-es.js';
import Vehicle from './Vehicle.js';
import { loadJson, loadTexture, loadObjFile } from "../Utils.js";
import { loadModel } from '../ModelLoader.js';
import PlayerController from '../PlayerController.js';
import Smoke from '../Smoke.js';
import Bullet from '../weapon/Bullet.js';

const CONFIG_FILE_NAME = "config.json";

export default class Aircraft extends Vehicle {
    constructor(config, meshes) {
        super(config, meshes);

        this.leader = null;

        this.target = null;
        this.waypoints = [];
        this.waypointIndex = 0;

        const bodySize = config.bodySize 
            ? new CANNON.Vec3(config.bodySize.x, config.bodySize.y, config.bodySize.z)
            : new CANNON.Vec3(1.0, 1.0, 1.0);
        
        this.body = new CANNON.Body({
            type: CANNON.Body.KINEMATIC,
            mass: 5,
            shape: new CANNON.Sphere(config.bodySize.x),
            position: new CANNON.Vec3(0.0, 10000.0, 0.0),
            angularDamping: 0.0,
            LinearDamping: 0.0,
        });
        // this.body.invInertiaWorld = new CANNON.Mat3([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]);
        this.body.gameObject = this;
        this.body.isTrigger = true;

        this.linearVelocity = new THREE.Vector3(0.0, 0.0, 0.0);
        this.angularVelocity = new THREE.Vector3(0.0, 0.0, 0.0);

        this.thrustForce = config.thrustForce ? config.thrustForce : 0.0;
        this.brakeForce = config.brakeForce ? config.brakeForce : 0.0;

        this.pitchForce = config.pitchForce ? config.pitchForce : 0.0;
        this.rollForce = config.rollForce ? config.rollForce : 0.0;

        this.position = new CANNON.Vec3(100.0, 3000.0, 500.0);
        this.quaternion = new CANNON.Quaternion().setFromEuler(0.0, -Math.PI/ 4, 0.0, 'YZX');

        this.rollSwitch = false;

        this.gravity =  0.001;

        this.health = config.health ? config.health : 100.0;

        this.gunInterval = 60.0;

        this.iff = config.iff ? config.iff : 2;

        this.isWrecked = false;

        this.body.addEventListener('collide', function(event) {
            console.log('hit!');
            if (event.body.gameObject) {
                if (-1 < event.body.gameObject.isTerrain) {
                    this.explode();
                }
            }
        }.bind(this));

        this.lastPosition = null;

        this.smokeInterval = 0.0;
    }

    update(game) {
        super.update(game);

        if (this.isWrecked) {

            if (this.health < -200) {
                console.log('overkill!')
                const smoke = new Smoke(this.body.position, {size: 12.0})
                this.game.addGameObject(smoke);
    
                this.toDestroy = true;
            }

            if (this.smokeInterval < 0) {
                const smoke = new Smoke(this.body.position, {size: 1.5})
                this.game.addGameObject(smoke);
                this.smokeInterval = 5;
            } else {
                this.smokeInterval -= 1;
            }


            const normalizedVelocity = new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z).normalize();
            const tmpVec = this.quaternion.conjugate().vmult(normalizedVelocity);
            const angularForce = new CANNON.Vec3(tmpVec.y, tmpVec.x, 0.0);
            const angularQuaternion = this.quatFromAngularVelocity(angularForce);

            // this.position = this.position.vadd(this.quaternion.vmult(new CANNON.Vec3(0.0, 0.0, -this.thrustForce)));
            this.quaternion = this.quaternion.mult(angularQuaternion);
            // this.body.position.set(this.position.x, this.position.y, this.position.z);
            this.body.quaternion.set(this.quaternion.x, this.quaternion.y, this.quaternion.z, this.quaternion.w);

            return;
        }

        const targetDirection = this.getTargetDirection();

        const wingVector = this.quaternion.conjugate().vmult(new CANNON.Vec3(0.0, -1.0, 0.0)).x;
        const yawMomentum = wingVector * this.gravity;

        const rollOutput = this.getRollOutput(targetDirection, yawMomentum, wingVector);
        const pitchOutput = this.getPitchOutput(targetDirection, yawMomentum);

        const angularVelocity = new CANNON.Vec3(pitchOutput, yawMomentum, rollOutput);
        const angularQuaternion = this.quatFromAngularVelocity(angularVelocity);

        this.lastPosition = this.position;

        this.position = this.position.vadd(this.quaternion.vmult(new CANNON.Vec3(0.0, 0.0, -this.thrustForce)));
        this.quaternion = this.quaternion.mult(angularQuaternion);
        this.body.position.set(this.position.x, this.position.y, this.position.z);
        this.body.quaternion.set(this.quaternion.x, this.quaternion.y, this.quaternion.z, this.quaternion.w);

        if (Math.abs(targetDirection.x) < 0.1 && Math.abs(targetDirection.y) < 0.1 && this.target && this.gunInterval < 0.0) {
            this.fireGun();
            this.gunInterval = 12;
        } else {
            this.gunInterval -= 1;
        }
    }

    getRollOutput(targetDirection, yawMomentum, rollAmount) {
        const targetDirectionXY = new CANNON.Vec3(targetDirection.x, targetDirection.y, 0.0);
        targetDirectionXY.normalize();

        const momentumDirection = new CANNON.Vec3(yawMomentum, this.pitchForce, 0.0);
        momentumDirection.normalize();

        let result = 0.0;
        result = momentumDirection.x < targetDirectionXY.x ? 1.0 : -1.0;
        result *= this.rollForce;

        // 旋回によるオーバーシュートの防止
        if ((0 < targetDirectionXY.x && 0 < yawMomentum && 0 < result)
                || (0 > targetDirectionXY.x && 0 > yawMomentum && 0 > result)) {
            const turnIntegral = Math.atan(Math.sin(Math.abs(rollAmount))) * yawMomentum * 2.0 / this.rollForce;
            const targetAngle = Math.acos(targetDirection.z);
            if (Math.abs(targetAngle) < Math.abs(turnIntegral)) {
                result *= -1;
            }
        }

        return result;
    }

    getPitchOutput(targetDirection, yawMomentum) {
        const targetDirectionXY = new CANNON.Vec3(targetDirection.x, targetDirection.y, 0.0);
        targetDirectionXY.normalize();

        const momentumDirectionRatio = yawMomentum / targetDirectionXY.x;
        let result = targetDirectionXY.y * momentumDirectionRatio;

        if ((0 < targetDirectionXY.x && yawMomentum < 0)
                || (0 > targetDirectionXY.x && yawMomentum > 0)) {
            const momentumDirectionRatio = -targetDirectionXY.x / yawMomentum;
            result = targetDirectionXY.y / momentumDirectionRatio;
        }

        result = Math.min(result, this.pitchForce);
        result = Math.max(result, -this.pitchForce);
        

        return result;
    }

    quatFromAngularVelocity(angularVelocity)
        {
        const x = angularVelocity.x;
        const y = -angularVelocity.y;
        const z = -angularVelocity.z;
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

    rotateQuaternion(quaternion, angularVelocity) {
        const vec = angularVelocity;
        const length = vec.length();
        if( length < 0.0000001) {
            quaternion;    // Otherwise we'll have division by zero when trying to normalize it later on
        }
        // Convert the rotation vector to quaternion. The following 4 lines are very similar to CreateFromAxisAngle method.
        const half = length * 0.5;
        const sin = Math.sin( half );
        const cos = Math.cos( half );
        // Instead of normalizing the axis, we multiply W component by the length of it. This method normalizes result in the end.
        const q = new CANNON.Quaternion( vec.x * sin, vec.y * sin, vec.z * sin, length * cos );

        quaternion = quaternion.mult(q);
        quaternion.normalize();
        // The following line is not required, only useful for people. Computers are fine with 2 different quaternion representations of each possible rotation.
        // if( q.W < 0 ) q = Negate( q );
        return quaternion;
    }

    getTargetDirection() {
        let worldTargetDirection = null;
        if (this.target) {
            let worldTargetPosition = new THREE.Vector3(this.target.getPosition().x, this.target.getPosition().y, this.target.getPosition().z);
            worldTargetDirection = this.position.vsub(new CANNON.Vec3(worldTargetPosition.x, worldTargetPosition.y, worldTargetPosition.z));
        } else if (this.waypoints[this.waypointIndex]){
            worldTargetDirection = this.position.vsub(this.waypoints[this.waypointIndex].applyQuaternion(this.quaternion));
        } else {
            // worldTargetDirection = this.position.vsub(new CANNON.Vec3(this.position.x + 3000.0, this.position.y + 0.0, this.position.z - 1000.0));
            worldTargetDirection = this.position.vsub(new CANNON.Vec3(0.0, 3000.0, 0.0));
        }
        const targetDirection = this.quaternion.conjugate().vmult(worldTargetDirection);
        targetDirection.normalize();
        targetDirection.x *= -1;
        targetDirection.y *= -1;
        return targetDirection;
    }

    getOffset(rollAngle) {
        let result = 0.0;
        let testRollAngle = Math.abs(rollAngle);
        while (0.0 < testRollAngle) {
            testRollAngle -= this.rollForce;
            result += Math.tan(testRollAngle) * this.gravity;
        }
        return result;
    }

    beforeRender() {
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
        let result = new THREE.Vector3(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);
        result = result.applyQuaternion(this.quaternion);
        result = result.add(this.position);
        return result;
    }

    getCameraQuaternion() {
        return this.quaternion;
    }

    wreck() {
        this.isWrecked = true;
        const smoke = new Smoke(this.body.position, {size: 8.0})
        this.game.addGameObject(smoke);
        
        this.body.velocity = this.body.position.vsub(this.lastPosition).scale(120.0);
        this.body.isTrigger = false;
        this.body.damping = 0.1;

        this.body.type = CANNON.Body.DYNAMIC;
    }

    explode() {
        const smoke = new Smoke(this.body.position, {size: 12.0})
        this.game.addGameObject(smoke);
        this.toDestroy = true;
    }

    copy() {
        const meshes = [];
        for (const mesh of this.meshes) {
            meshes.push(mesh.clone());
        }
        return new this.constructor(this.config, meshes, this.playerController);
    }

    fireGun() {
        if (!this.game) {
            return;
        }

        let bulletVelocity = this.quaternion.vmult(new CANNON.Vec3(0.0, 0.0, -1200.0));

        const muzzlePos = this.rightMuzzle ? 3.0 : -3.0;
        this.rightMuzzle = !this.rightMuzzle;

        let muzzlePosition1 = this.quaternion.vmult(new CANNON.Vec3(muzzlePos, 0.0, -10.0));
        muzzlePosition1 = this.body.position.vadd(muzzlePosition1);

        let muzzlePosition2 = this.quaternion.vmult(new CANNON.Vec3(3.0, 0.0, -10.0));
        muzzlePosition2 = this.body.position.vadd(muzzlePosition2);

        const bullet1 = new Bullet(muzzlePosition1, this.quaternion, bulletVelocity, this, {radius: 2.5, iff: this.iff});
        this.game.addGameObject(bullet1);
    }
}
