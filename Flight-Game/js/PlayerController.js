import GameObject from "./GameObject.js";
import { RGBA_ASTC_10x10_Format } from './lib/three/build/three.module.js';

const STICK_DEAD_ZONE = 0.1;

export default class PlayerController extends GameObject {
    constructor() {
        super();

        this.aileron = 0.0;
        this.elevator = 0.0;

        this.cameraMoveFrontAndBack = 0.0;
        this.cameraMoveRightAndLeft = 0.0;

        this.cameraViewVertical = 0.0;
        this.cameraViewHorizontal = 0.0;
    
        this.fireGun = false;
        this.fireMissile = false;
        this.changeWeapon = false;
        this.changeTarget = false;

        this.timeBackward = false;
        this.timeForward = false;
    
        this.yawLeft = false;
        this.yawRight = false;

        this.cameraDecreaseMoveSpeed = false;
        this.cameraIncreaseMoveSpeed = false;
    
        this.brake = 0.0;
        this.throttle = 0.0;

        this.cameraDecreaseAltitude = false;
        this.cameraIncreaseAltitude = false;

        this.freeCameraMode = false;

        this.pause = false;
    }

    update() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (var i = 0; i < gamepads.length; i++) {
            if (gamepads[i] != null) {
                this.aileron = this.filterAxis(gamepads[i].axes[0]);
                this.elevator = this.filterAxis(gamepads[i].axes[1]);

                this.cameraMoveFrontAndBack = this.filterAxis(gamepads[i].axes[0]);
                this.cameraMoveRightAndLeft = this.filterAxis(gamepads[i].axes[1]);
    
                this.cameraViewVertical = this.filterAxis(-gamepads[i].axes[2]);
                this.cameraViewHorizontal = this.filterAxis(gamepads[i].axes[3]);
                
                this.fireGun = gamepads[i].buttons[0].pressed;
                this.fireMissile = this.fireMissile ? false : gamepads[i].buttons[1].pressed;
                this.changeWeapon = this.changeWeapon ? false : gamepads[i].buttons[2].pressed;
                this.changeTarget = this.changeTarget ? false : gamepads[i].buttons[3].pressed;

                this.increaseTimeOfDay = gamepads[i].buttons[15].pressed;
                this.decreaseTimeOfDay = gamepads[i].buttons[14].pressed;

                this.yawLeft = gamepads[i].buttons[4].pressed;
                this.yawRight = gamepads[i].buttons[5].pressed;

                this.cameraDecreaseMoveSpeed = gamepads[i].buttons[4].pressed;
                this.cameraIncreaseMoveSpeed = gamepads[i].buttons[5].pressed;
                
                this.brake = gamepads[i].buttons[6].value;
                this.throttle = gamepads[i].buttons[7].value;

                this.cameraDecreaseAltitude = gamepads[i].buttons[6].value;
                this.cameraIncreaseAltitude = gamepads[i].buttons[7].value;

                this.pause = this.pause ? false : gamepads[i].buttons[9].pressed;
            }
        }
    };
    
    filterAxis(value) {
        const a = Math.abs(value) - STICK_DEAD_ZONE;
        const b = a < 0 ? 0 : a / (1.0 - STICK_DEAD_ZONE);
        return value < 0 ? -b : b;
    }
}
