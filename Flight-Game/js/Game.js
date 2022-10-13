import * as THREE from './lib/three/build/three.module.js';
import { EffectComposer } from './lib/three/examples/jsm/postprocessing/EffectComposer.js';
import * as CANNON from './lib/cannon-es/dist/cannon-es.js';
import Renderer from "./Renderer.js";
import MultipleRenderTargets from './MultipleRenderTargets.js';
import StandardRenderTarget from './StandardRenderTarget.js';
import MainCamera from './MainCamera.js';
import PlayerController from './PlayerController.js';
import Sun from './Sun.js';
import Sky from './Sky.js';
import TestMesh from './TestMesh.js';
import TestMesh2 from './TestMesh2.js';
import Composer from './composer/Composer.js';

import { loadScenario } from "./scenario/ScenarioLoader.js";
import { loadPlayerAircraft } from "./vehicle/PlayerAircraftLoader.js";
import { loadTerrain } from "./terrain_new/TerrainLoader.js";
import { loadVehicle } from "./vehicle/VehicleLoader.js";
import ComposerPass from './composer/pass/ComposerPass.js';
import { loadJson, loadTexture, loadDataTexture, loadObjFile, getImageData} from "./Utils.js";
import ColorDepthCopyMesh from './ColorDepthCopyMesh.js';

const CONFIG_FILE_NAME = "config.json";

export default class Game {
    constructor(scenarioId, onLoadComplete) {
        this.canvas = document.getElementById('canvas-2d');
        this.context = this.canvas.getContext('2d');

        this.multipleRenderTargets = new MultipleRenderTargets();
        this.transparentRenderTarget = new StandardRenderTarget();

        this.skyRenderTarget = new StandardRenderTarget();
        this.skyRenderTarget.depthBuffer = false;

        this.renderer = new Renderer();
        this.defaultRenderTarget = this.renderer.getRenderer().getRenderTarget();
    
        this.scene = new THREE.Scene();
        this.transparentScene = new THREE.Scene();
        this.skyScene = new THREE.Scene();
    
        this.world = new CANNON.World({
            // broadphase: new CANNON.QuadtreeBroadphase(),
            gravity: new CANNON.Vec3(0.0, -10.0, 0.0),
            quadtreeSize: 96000,
            quadtreeDepth: 5,
        });
        this.world.doProfiling = true;
        this.lastCallTime = null;
    
        this.gameObjects = [];

        // const testMesh1 = new TestMesh(100, new THREE.Vector3(1500.0, 500.0, 1500.0));
        // this.addGameObject(testMesh1);

        // const testMesh2 = new TestMesh(100, new THREE.Vector3(-1500.0, 500.0, 1500.0));
        // this.addGameObject(testMesh2);

        // const testMesh3 = new TestMesh(100, new THREE.Vector3(1500.0, 500.0, -1500.0));
        // this.addGameObject(testMesh3);

        // const testMesh4 = new TestMesh(100, new THREE.Vector3(-1500.0, 500.0, -1500.0));
        // this.addGameObject(testMesh4);
    
        this.playerController = new PlayerController();
        this.addGameObject(this.playerController);
        
        this.mainCamera = new MainCamera(this.playerController);
        this.addGameObject(this.mainCamera);
    
        this.sun = new Sun(45.0, this.playerController);
        this.addGameObject(this.sun);
        
        this.sky = new Sky(this.sun, this.mainCamera);
        this.addGameObject(this.sky);
        this.skyScene.add(this.sky.skyMesh);
    
        this.textures = [];
        this.vehicleBrueprints = [];
        this.vehicles = [];
        this.units = [];
    
        this.scenario = null;
        this.terrain = null;
    
        this.composer = new Composer(this.renderer, this.multipleRenderTargets,
                this.transparentRenderTarget, this.skyRenderTarget, this.mainCamera, this.sun);
    
        this.isRender = true;

        this.finalComposer = new EffectComposer(this.renderer.getRenderer());
        this.composerPass = new ComposerPass();
        this.finalComposer.addPass(this.composerPass);

        this.colorDepthCopyMesh = new ColorDepthCopyMesh();
        this.transparentScene.add(this.colorDepthCopyMesh.getMesh());

        this.colorDepthCopyMesh.setColorTexture(this.composer.getColorTexture());
        this.colorDepthCopyMesh.setDepthTexture(this.multipleRenderTargets.getDepthTexture());

        this.pause = false;

        this.intervalId = -1;

        this.stepCount = 0;
    
        // 読込後ゲーム開始
        this.load(scenarioId).then((() => {
            if (onLoadComplete) onLoadComplete();
            this.update();

            // this.intervalId = setInterval(this.update.bind(this), 1000 / 360);
            // this.render();
        }).bind(this));
    }

    addGameObject(gameObject) {
        gameObject.game = this;
        this.gameObjects.push(gameObject);

        if (gameObject.getMesh()) {
            this.scene.add(gameObject.getMesh());
        }

        if (gameObject.getTransparentMesh()) {
            // if (gameObject.getTransparentMesh().material.uniforms.tColorTexture) {
            //     gameObject.getTransparentMesh().material.uniforms.tColorTexture.value = this.multipleRenderTargets.getColorTexture();
            // }
            // if (gameObject.getTransparentMesh().material.uniforms.tDepthTexture) {
            //     gameObject.getTransparentMesh().material.uniforms.tDepthTexture.value = this.multipleRenderTargets.getDepthTexture();
            // }
            
            this.transparentScene.add(gameObject.getTransparentMesh());
        }

        if (gameObject.getMeshes()) {
            for (const mesh of gameObject.getMeshes()) {
                this.scene.add(mesh);
            }
        }
        if (gameObject.getBody()) {
            this.world.addBody(gameObject.getBody());
        }
        if (gameObject.getBodies()) {
            for (const body of gameObject.getBodies()) {
                this.world.addBody(body);
            }
        }
    }

    removeGameObject(gameObject) {
        const targetIndex = this.gameObjects.indexOf(gameObject);
        if (0 <= targetIndex) {
            this.gameObjects.splice(targetIndex, 1);
        }

        if (gameObject.getMesh()) {
            this.scene.remove(gameObject.getMesh());
        }
        if (gameObject.getTransparentMesh()) {
            this.transparentScene.remove(gameObject.getTransparentMesh());
        }
        if (gameObject.getMeshes()) {
            for (const mesh of gameObject.getMeshes()) {
                this.scene.remove(mesh);
            }
        }
        if (gameObject.getBody()) {
            this.world.removeBody(gameObject.getBody());
        }
    }

    /**
     * 毎フレーム実行
     */
    update() {
        requestAnimationFrame(this.update.bind(this));

        this.step();

        // if (this.isRender) {
        //     this.render();
        //     this.isRender = false;
        // } else {
        //     this.isRender = true;
        // }

        for (const gameObject of this.gameObjects) {
            gameObject.update(this);
        }

        for (const gameObject of this.gameObjects) {
            gameObject.beforeRender(this);
        }

        this.render();
    }

    /**
     * レンダリング
     */
    render() {
        this.renderer.render(this.multipleRenderTargets.getRenderTarget(), this.scene, this.mainCamera);

        this.renderer.render(this.skyRenderTarget.getRenderTarget(), this.skyScene, this.mainCamera);

        this.composer.update();
        this.composer.render();

        this.colorDepthCopyMesh.setColorTexture(this.composer.getColorTexture());
        this.colorDepthCopyMesh.setDepthTexture(this.multipleRenderTargets.getDepthTexture());

        this.renderer.renderToScreen(this.transparentScene, this.mainCamera);

        // this.composerPass.update(this.composer.getColorTexture());
        // this.finalComposer.render();

        // requestAnimationFrame(this.render.bind(this));
    }

    step() {

        // this.world.fixedStep();

        if (this.playerController.pause) {
            this.pause = !this.pause;
        }

        const timeStep = 1.0 / 120.0 // seconds
        const time = performance.now() / 1000 // seconds
        let latency = 0.0;
        if (!this.pause) {
            if (!this.lastCallTime) {
                latency = this.world.step(timeStep)
            } else {
                const dt = time - this.lastCallTime;
                latency = this.world.step(timeStep, dt, 1);
            }
        }
        this.lastCallTime = time;
        
        // if (this.stepCount < 10) {
        //     this.stepCount += 1;
        //     return;
        // } else {
        //     this.stepCount = 0;
        // }

		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.beginPath();
        this.context.font = `18px Ariel`;
        this.context.fillStyle = `rgba(255, 255, 255, 1.0)`;
        this.context.fillText(`Camera position: 
                ${Math.round(this.mainCamera.camera.position.x)}, 
                ${Math.round(this.mainCamera.camera.position.y)}, 
                ${Math.round(this.mainCamera.camera.position.z)}
        ` , 10, 20);

        let i = 2;
        this.context.fillText(`quadtreeUpdate: ${this.world.profile.quadtreeUpdate}` , 10, 20 * ++i);
        this.context.fillText(`afterQuadtreeUpdate: ${this.world.profile.afterQuadtreeUpdate}` , 10, 20 * ++i);
        this.context.fillText(`broadphase: ${this.world.profile.broadphase}` , 10, 20 * ++i);
        this.context.fillText(`afterBroadphase : ${this.world.profile.afterBroadphase}` , 10, 20 * ++i);
        this.context.fillText(`narrowphase: ${this.world.profile.narrowphase}` , 10, 20 * ++i);
        this.context.fillText(`makeContactConstraints: ${this.world.profile.makeContactConstraints}` , 10, 20 * ++i);
        this.context.fillText(`solve: ${this.world.profile.solve}` , 10, 20 * ++i);
        this.context.fillText(`afterSolve: ${this.world.profile.afterSolve}` , 10, 20 * ++i);
        this.context.fillText(`integrate  : ${this.world.profile.integrate}` , 10, 20 * ++i);
        this.context.fillText(`afterIntegrate  : ${this.world.profile.afterIntegrate}` , 10, 20 * ++i);
        this.context.fillText(`totalInternalStep: ${this.world.profile.internalStep}` , 10, 20 * ++i);
        this.context.fillText(`Physics    : ${latency}` , 10, 20 * ++i);

        // if (3 < this.world.profile.internalStep) {
        //     console.log(`high physics latancy!: ${this.world.profile.internalStep} ms`)
        //     console.log(`quadtreeUpdate: ${this.world.profile.quadtreeUpdate}`)
        //     console.log(`afterQuadtreeUpdate: ${this.world.profile.afterQuadtreeUpdate}`)
        //     console.log(`broadphase: ${this.world.profile.broadphase}`)
        //     console.log(`afterBroadphase : ${this.world.profile.afterBroadphase}`)
        //     console.log(`narrowphase: ${this.world.profile.narrowphase}`)
        //     console.log(`makeContactConstraints: ${this.world.profile.makeContactConstraints}`)
        //     console.log(`solve: ${this.world.profile.solve}`)
        //     console.log(`afterSolve: ${this.world.profile.afterSolve}`)
        //     console.log(`integrate  : ${this.world.profile.integrate}`)
        //     console.log(`afterIntegrate  : ${this.world.profile.afterIntegrate}`)
        //     console.log(`totalInternalStep: ${this.world.profile.internalStep}`)
        // }
    }

    /**
     * リソースの読込
     */
    async load(scenarioId) {
        this.scenario = await loadScenario(scenarioId);

        this.terrain = await loadTerrain(this.scenario.getTerrain());
        this.addGameObject(this.terrain);
        for (let i = 0; i < this.terrain.bodies; i++) {
            this.world.addBody(this.terrain.bodies[i]);
        }

        const playerAircraftId = this.scenario.playerAircraft;
        this.playerAircraft = await loadPlayerAircraft(playerAircraftId, this.playerController);
        this.vehicles.push(this.playerAircraft);
        this.addGameObject(this.playerAircraft);

        for (const vehicleId of this.scenario.getVehicles()) {
            const vehicle = await loadVehicle(vehicleId);
            this.vehicleBrueprints[vehicleId] = vehicle;
        }

        for (const unit of this.scenario.getUnits()) {
            this.addUnit(unit);
        }

        this.vehicles[1].setTarget(this.playerAircraft);
        this.vehicles[2].setTarget(this.playerAircraft);

        this.loadTextures();
    }

    async loadTextures() {
        const config = await loadJson(`img/${CONFIG_FILE_NAME}`);
        for (const texture of config.textures) {
            this.textures[texture.name] = await loadTexture(`img/${texture.file}`);
        }
    }

    getVehicles = function() {
        return this.vehicles;
    };

    addUnit(unit) {
        const vehicleBrueprint = this.vehicleBrueprints[unit.vehicleId];
        const vehicle = vehicleBrueprint.copy();

        vehicle.position = unit.position 
            ? new CANNON.Vec3(unit.position.x, unit.position.y, unit.position.z)
            : vehicleBrueprint.position;
        
        vehicle.rotation = unit.rotation
            ? new CANNON.Vec3(unit.rotation.x, unit.rotation.y, unit.rotation.z)
            : vehicleBrueprint.rotation;

        this.vehicles.push(vehicle);
        this.addGameObject(vehicle);

        if (unit.members) {
            for (const member of unit.members) {
                this.addUnit(member);
            }
        }
    }
}
