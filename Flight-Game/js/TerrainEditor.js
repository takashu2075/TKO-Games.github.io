import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";
import Renderer from "./Renderer.js";
import MultipleRenderTargets from './RenderTarget.js';
import MainCamera from './MainCamera.js';
import PlayerController from './PlayerController.js';
import Sun from './Sun.js';
import Sky from './Sky.js';
import TestMesh from './TestMesh.js';
import Composer from './composer/Composer.js';
import {loadTerrain} from "./terrain/TerrainLoader.js";

function TerrainEditor() {
    const renderer = new Renderer();
    const multipleRenderTargets = new MultipleRenderTargets();
    renderer.setRenderTarget(multipleRenderTargets);

    const composer = new Composer(renderer);

    const mainCamera = new MainCamera();
    const playerController = new PlayerController();

    const scene = new THREE.Scene();

    const gameObjects = [];
    this.addGameObject = function(gameObject) {
        gameObjects.push(gameObject);
        if (gameObject.getMesh()) {
            scene.add(gameObject.getMesh());
        }
    }

    const sun = new Sun(45.0);

    const sky = new Sky(multipleRenderTargets);
    this.addGameObject(sky);

    const testMesh = new TestMesh(1000 * 1);
    this.addGameObject(testMesh);

    // 読込後ゲーム開始
    load().then(
        tick()
    );

    /**
     * 毎フレーム実行
     */
    function tick() {
        playerController.update();
        mainCamera.update(playerController);

        sun.update(playerController);
        sky.update(sun, mainCamera, multipleRenderTargets);

        composer.update(mainCamera, sun);

        render();

        requestAnimationFrame(tick);
    }

    /**
     * レンダリング
     */
    function render() {
        renderer.render(scene, mainCamera);
        composer.render(multipleRenderTargets);
    }

    /**
     * リソースの読込
     */
    async function load() {
        const terrain = await loadTerrain("test", multipleRenderTargets);
        for (const terrainTile of terrain.getMeshes()) {
            scene.add(terrainTile);
        }

        for (const terrainMaterial of terrain.getTerrainMaterials()) {
            for (const terrainObject of terrainMaterial.getTerrainObjects()) {
                for (const mesh of terrainObject.getMeshes()) {
                    scene.add(mesh);
                }
            }
        }
    }
}

export default TerrainEditor;
