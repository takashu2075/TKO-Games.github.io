import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";

const CAMERA_NEAR_CLIP = 1.0;
const CAMERA_FAR_CLIP = 15000.0;

const CAMERA_WIDTH = 1280;
const CAMERA_HEIGHT = 720;
const ASPECT_RATIO = 1280 / 720;
const CAMERA_FOV = 110;

const CAMERA_MOVE_SPEED = 5.0;
const CAMERA_ROTATION_SPEED = 0.03;

const AXIS_INVERT = -1;

class MainCamera extends GameObject {
    constructor(playerController) {
        super();

        this.camera = new THREE.PerspectiveCamera(CAMERA_FOV / ASPECT_RATIO, ASPECT_RATIO, CAMERA_NEAR_CLIP, CAMERA_FAR_CLIP);
        this.cameraPosition = new THREE.Vector3(0.0, 3777.0, 0.0);
        this.camera.rotation.set(-45, 0.0, 0.0);

        this.cameraTarget = null;
        
        this.playerController = playerController;

        // window.addEventListener('resize', function() {
        //     this.resize(this.camera);
        // }.bind(this), false);
        // this.resize(this.camera);

        this.cameraChangeInterval = 0;
    }

    resize() {
        // this.camera.aspect = window.innerWidth / window.innerHeight;
        const canvas = document.getElementById('canvas');
        this.camera.aspect = canvas.width / canvas.height;
        this.camera.updateProjectionMatrix();
    }

    update = function(game) {
        if (this.playerController.changeTarget && this.cameraChangeInterval < 0) {
            const vehicles = game.getVehicles();
            // if (this.cameraTarget) {
            //     const nextIndex = vehicles.indexOf(this.cameraTarget);
            //     this.cameraTarget = vehicles[nextIndex + 1];
            //     vehicles[0];
            // } else {
            //     this.cameraTarget = vehicles[0];
            // }
            this.cameraTarget = this.cameraTarget ? null : vehicles[0];
            this.cameraChangeInterval = 10;
        } else {
            this.cameraChangeInterval -= 1;
        }

        this.playerController.freeCameraMode = !this.cameraTarget;
        // console.log(this.camera.position);
    }

    beforeRender() {
        if (this.cameraTarget) {
            const cameraPosition = this.cameraTarget.getCameraPosition();
            const cameraRotation = this.cameraTarget.getCameraRotation();
            const cameraQuaternion = this.cameraTarget.getCameraQuaternion();

            this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            // this.camera.rotation.set(cameraRotation.x, cameraRotation.y, cameraRotation.z);
            this.camera.quaternion.set(cameraQuaternion.x, cameraQuaternion.y, cameraQuaternion.z, cameraQuaternion.w);

            this.cameraPosition = cameraPosition;
        } else {
            this.updateFreeCamera();
        }
    }

    updateFreeCamera() {
        const cameraDirection = new THREE.Vector3(); 
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        this.camera.rotation.order = "YXZ"
        this.camera.rotation.x += this.playerController.cameraViewHorizontal * CAMERA_ROTATION_SPEED * AXIS_INVERT;
        this.camera.rotation.y += this.playerController.cameraViewVertical * CAMERA_ROTATION_SPEED;
        this.camera.rotation.z = 0.0;

        let cameraMoveSpeed = CAMERA_MOVE_SPEED;
        if (this.playerController.cameraIncreaseMoveSpeed) {
            cameraMoveSpeed *= 10.0;
        } else if (this.playerController.cameraDecreaseMoveSpeed) {
            cameraMoveSpeed /= 10.0;
        }

        this.cameraPosition.x += cameraDirection.x * this.playerController.cameraMoveRightAndLeft * cameraMoveSpeed * AXIS_INVERT;
        this.cameraPosition.z += cameraDirection.z * this.playerController.cameraMoveRightAndLeft * cameraMoveSpeed * AXIS_INVERT;

        this.cameraPosition.x -= cameraDirection.z * this.playerController.cameraMoveFrontAndBack * cameraMoveSpeed;
        this.cameraPosition.z -= -cameraDirection.x * this.playerController.cameraMoveFrontAndBack * cameraMoveSpeed;

        this.cameraPosition.y += (this.playerController.cameraIncreaseAltitude - this.playerController.cameraDecreaseAltitude) * cameraMoveSpeed;

        this.camera.position.set(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);
    }

    getCamera = function() {
        return this.camera;
    };

    // const cursorMesh = new THREE.Mesh(
    //     new THREE.ConeGeometry(5, 20, 32),
    //     new StandardMaterial()
    // );

    // const raycaster = new THREE.Raycaster();
    // this.raycast = function(scene) {
    //     scene.add(cursorMesh);
    //     // レイキャスト = マウス位置からまっすぐに伸びる光線ベクトルを生成
    //     raycaster.setFromCamera(new THREE.Vector2(), camera);

    //     // その光線とぶつかったオブジェクトを得る
    //     const intersects = raycaster.intersectObjects(scene.children);

    //     for (const intersect of intersects) {
    //         if (intersect.object.isTerrain == true) {
    //             const point = intersect.point;
    //             cursorMesh.position.set(point.x, point.y, point.z);
    //             return;
    //         }
    //     }
    // }
}
// MainCamera.prototype = new GameObject();

export default MainCamera;
