import Terrain from "./Terrain.js"
import TerrainMaterial from "./TerrainMaterial.js"
import TerrainObject from "./TerrainObject.js"
import { loadJson, loadTexture, loadDataTexture, loadObjFile, getImageData} from "../Utils.js";
import { loadModel } from '../ModelLoader.js';

const CONFIG_FILE_NAME = "config.json";

async function loadTerrain(terrainId) {
    const terrainConfig = await loadJson(`terrain/${terrainId}/${CONFIG_FILE_NAME}`);
    const heightMap = await loadTexture(`terrain/${terrainId}/${terrainConfig.heightMap}`);
    const normalMap = await loadTexture(`terrain/${terrainId}/${terrainConfig.normalMap}`);

    const noiseTexture = await loadTexture(`img/noise.png`);

    const imageData = await getImageData(heightMap.image);

    const heightData = [];
    for (let i = 0; i < imageData.data.length; i++) {
        if (i % 4 == 0) {
            heightData.push(imageData.data[i]);
        }
    }

    const materialLoaders = [];
    for (const materialId of terrainConfig.materials ? terrainConfig.materials : []) {
        materialLoaders.push(loadTerrainMaterial(terrainConfig, terrainId, materialId, heightMap, normalMap, noiseTexture));
    }

    const modelLoaders = [];
    const buildingMeshes = [];
    for (const modelId of terrainConfig.objects ? terrainConfig.objects : []) {
        const config = await loadJson(`terrain/${terrainId}/object/${modelId}/${CONFIG_FILE_NAME}`);
        const meshes = await loadModel(`terrain/${terrainId}/object/${modelId}/${config.model}`, config);
        for (const mesh of meshes) {
            mesh.position.set(
                config.position.x ? config.position.x : 0.0, 
                config.position.y ? config.position.y : 0.0, 
                config.position.z ? config.position.z : 0.0
            );
            mesh.rotation.set(
                config.rotation.x ? config.rotation.x / ( 180 / Math.PI ) : 0.0, 
                config.rotation.y ? config.rotation.y / ( 180 / Math.PI ) : 0.0, 
                config.rotation.z ? config.rotation.z / ( 180 / Math.PI ) : 0.0
            );
            buildingMeshes.push(mesh);
        }
    }


    const materials = [];
    await Promise.all(
        materialLoaders
    ).then(values => {
        for (const value of values) {
            materials.push(value);
        }
    }).catch(error => {
        throw error;
    });


    // const meshes = [];
    // await Promise.all(
    //     modelLoaders
    // ).then(values => {
    //     for (const value of values) {
    //         for (const mesh of value) {
    //             convertedMesh.position.set(
    //                 config.position.x ? config.position.x : 0.0, 
    //                 config.position.y ? config.position.y : 0.0, 
    //                 config.position.z ? config.position.z : 0.0
    //             );
    //             convertedMesh.rotation.set(
    //                 config.rotation.x ? config.rotation.x / ( 180 / Math.PI ) : 0.0, 
    //                 config.rotation.y ? config.rotation.y / ( 180 / Math.PI ) : 0.0, 
    //                 config.rotation.z ? config.rotation.z / ( 180 / Math.PI ) : 0.0
    //             );
    //             meshes.push(mesh);
    //         }
    //     }
    // }).catch(error => {
    //     throw error;
    // });

    return new Terrain(terrainConfig, heightMap, normalMap, noiseTexture, materials, buildingMeshes, heightData);
}

async function loadTerrainMaterial(terrainConfig, terrainId, materialId, heightMap, normalMap, noiseTexture) {
    const materialConfig = await loadJson(`terrain/${terrainId}/${materialId}/${CONFIG_FILE_NAME}`);

    const colorTexture = materialConfig.colorTexture ? await loadTexture(`terrain/${terrainId}/${materialId}/${materialConfig.colorTexture}`) : null;
    const maskMap = materialConfig.maskTexture ? await loadTexture(`terrain/${terrainId}/${materialId}/${materialConfig.maskTexture}`) : null;

    const objectLoaders = [];
    for (const objectId of materialConfig.objects ? materialConfig.objects : []) {
        objectLoaders.push(loadTerrainObject(terrainConfig, materialConfig, terrainId, materialId, objectId, heightMap, normalMap, maskMap));
    }

    const terrainObjects = [];
    await Promise.all(
        objectLoaders
    ).then(values => {
        for (const value of values) {
            terrainObjects.push(value);
        }
    }).catch(error => {
        throw error;
    });

    return new TerrainMaterial(terrainConfig, materialConfig, colorTexture, maskMap, noiseTexture, terrainObjects);
}

async function loadTerrainObject(terrainConfig, materialConfig, terrainId, materialId, objectId, heightMap, normalMap, maskMap) {
    const objectConfig = await loadJson(`terrain/${terrainId}/${materialId}/${objectId}/${CONFIG_FILE_NAME}`);
    const positions = await loadJson(`terrain/${terrainId}/${materialId}/${objectId}/positions.json`);
    const rotations = await loadJson(`terrain/${terrainId}/${materialId}/${objectId}/rotations.json`);
    
    const noiseTexture = await loadTexture(`img/noise.png`);

    const mesh = await loadObjFile(
        `terrain/${terrainId}/${materialId}/${objectId}/${objectConfig.objectFile}`,
        `terrain/${terrainId}/${materialId}/${objectId}/${objectConfig.materialFile}`
    );
    
    return new TerrainObject(terrainConfig, materialConfig, objectConfig,
        mesh, positions.positions, rotations.rotations, heightMap, normalMap, maskMap, noiseTexture);
}

function createMaskTextures() {

}

/**
 * ??????????????????????????????????????????????????????????????????
 * @param {*} heights 
 * @returns 
 */
// function createHeightTexture(heights) {
//     const segments = Math.sqrt(heights.length);
//     if (segments % 1 != 0) {
//         throw new Error("The terrain segments should be an integer.");
//     }
//     const data = new Float32Array(heights.length * 1);
//     for (let i = 0; i < heights.length; i += 1) {
//         data[i] = heights[i];
//         // data[i + 1] = heights[i];
//         // data[i + 2] = heights[i];
//         // data[i + 3] = heights[i];
//     }
//     // for (let i = 0; i < data.length; i++) {
//     //     data[i] = 0.0;
//     // }
//     const heightTexture = new THREE.DataTexture(data, segments, segments, THREE.AlphaFormat, THREE.FloatType);
//     heightTexture.wrapS = THREE.MirroredRepeatWrapping;
//     heightTexture.wrapT = THREE.MirroredRepeatWrapping;
//     heightTexture.magFilter = THREE.LinearFilter;
//     heightTexture.minFilter = THREE.LinearMipMapLinearFilter;
//     heightTexture.generateMipmaps = true;
//     heightTexture.needsUpdate = true;
    
//     return heightTexture;
// }

// function createHeightTexture() {
//     // Create noise and save it to texture
//     const width = 1024;
//     const size = width * width;
//     const data = new Uint8Array(size);

//     // Zero out height data
//     for (let i = 0; i < size; i ++ ) {
//         data[i] = 0;
//     }

//     const perlin = new ImprovedNoise();
//     let quality = 1;
//     const z = Math.random() * 100;

//     // Do several passes to get more detail
//     for (let iteration = 0; iteration < 4; iteration++) {
//         for (let i = 0; i < size; i ++) {
//             const x = i % width;
//             const y = Math.floor(i / width);
//             data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality);
//         }
//         quality *= 5;
//     }

//     const noiseTexure = new THREE.DataTexture(data, width, width, THREE.AlphaFormat);
//     noiseTexure.wrapS = THREE.MirroredRepeatWrapping;
//     noiseTexure.wrapT = THREE.MirroredRepeatWrapping;
//     noiseTexure.magFilter = THREE.LinearFilter;
//     noiseTexure.minFilter = THREE.LinearMipMapLinearFilter;
//     noiseTexure.generateMipmaps = true;
//     noiseTexure.needsUpdate = true;
//     return noiseTexure;
// }

export {loadTerrain, loadTerrainMaterial, loadTerrainObject};
