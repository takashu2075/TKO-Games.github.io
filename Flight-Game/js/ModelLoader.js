import * as THREE from './lib/three/build/three.module.js';
import { loadTexture } from "./Utils.js";
import { GLTFLoader } from './lib/GLTFLoader.js';
import StandardMaterial from "./StandardMaterial.js";

const CONFIG_FILE_NAME = "config.json";

export async function loadModel(modelPath, config) {
    // const config = await loadFileAsJson(`terrain/${terrainId}/object/${modelId}/${CONFIG_FILE_NAME}`);

    const testTexture = await loadTexture(`img/test.png`);

    return new Promise((resolve, refect) => {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(modelPath, function(gltf) {
            const meshes = extractMeshes(gltf.scene);
            const results = [];
            for (const mesh of meshes) {
                const convertedMesh = convertMesh(mesh, testTexture);
                // convertedMesh.position.set(
                //     config.position.x ? config.position.x : 0.0, 
                //     config.position.y ? config.position.y : 0.0, 
                //     config.position.z ? config.position.z : 0.0
                // );
                // convertedMesh.rotation.set(
                //     config.rotation.x ? config.rotation.x / ( 180 / Math.PI ) : 0.0, 
                //     config.rotation.y ? config.rotation.y / ( 180 / Math.PI ) : 0.0, 
                //     config.rotation.z ? config.rotation.z / ( 180 / Math.PI ) : 0.0
                // );
                results.push(convertedMesh);
            }
            resolve(results);
        });
    });
}

function extractMeshes(group) {
    if (group.children.length > 0) {
            let result = [];
            for (const child of group.children) {
                const meshes = extractMeshes(child);
                result = result.concat(meshes);
            }
            return result;
    } else {
        let results = [];
        results.push(group);
        return results;
    }
}

/**
 * THREE.jsオリジナルのマテリアルから本ゲーム専用のマテリアルに変換。
 */
function convertMesh(mesh, testTexture) {
    const geometry = mesh.geometry.clone();
    const material = new StandardMaterial(mesh.material.map);
    material.map = mesh.material.map;
    // const material = new StandardMaterial();

    return new THREE.Mesh(geometry, material);
}