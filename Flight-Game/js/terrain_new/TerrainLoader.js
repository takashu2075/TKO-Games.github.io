import * as THREE from '../lib/three/build/three.module.js';
import ImprovedNoise from '../ImprovedNoise.js';
import Terrain from "./Terrain.js"
import TerrainTile from "./TerrainTile.js"
import TerrainObject from "./TerrainObject.js"
import { loadJson } from "../Utils.js";
import { loadModel } from '../ModelLoader.js';
import InstancedMaterial from '../InstancedMaterial.js';

const CONFIG_FILE_NAME = "config.json";

async function loadTerrain(terrainName) {
    const config = await loadJson(`terrain/${terrainName}/${CONFIG_FILE_NAME}`);

    const terrainTileLoaders = [];
    for (const tileName of config.tiles) {
        terrainTileLoaders.push(loadTerrainTile(terrainName, tileName));
    }

    const terrainTiles = [];
    await Promise.all(
        terrainTileLoaders
    ).then(values => {
        for (const value of values) {
            terrainTiles.push(value);
        }
    }).catch(error => {
        throw error;
    });

    return new Terrain(config, terrainTiles);
}

async function loadTerrainTile(terrainName, tileName) {
    const config = await loadJson(`terrain/${terrainName}/tiles/${tileName}/${CONFIG_FILE_NAME}`);

    const meshes = await loadModel(`terrain/${terrainName}/tiles/${tileName}/${config.model}`);
    const tileMesh = meshes[0];
    tileMesh.geometry.computeVertexNormals();

    const objectLoaders = [];
    for (const objectName of config.objects ? config.objects : []) {
        objectLoaders.push(loadTerrainObject(terrainName, tileName, objectName));
    }

    const objectMeshes = [];
    await Promise.all(
        objectLoaders
    ).then(values => {
        for (const value of values) {
            objectMeshes.push(value);
        }
    }).catch(error => {
        throw error;
    });

    for (const objectMesh of objectMeshes) {
        objectMesh.frustumCulled = false;
        tileMesh.add(objectMesh)
    }

    // return new TerrainTile(config, tileMesh, terrainObjects);
    return new TerrainTile(config, tileMesh);
}

async function loadTerrainObject(terrainName, tileName, objectName) {
    const config = await loadJson(`terrain/${terrainName}/tiles/${tileName}/objects/${objectName}/${CONFIG_FILE_NAME}`);

    const meshBase = await loadModel(`terrain/${terrainName}/tiles/${tileName}/objects/${objectName}/${config.model}`);
    // meshBase[0].geometry.computeBoundingBox();
    // const mesh = createInstancedMesh(meshBase[0].geometry, config.instances);

    const boxGeometry = new THREE.BoxBufferGeometry(500.0, 500.0, 500.0);
    const mesh = createInstancedMesh(meshBase[0].geometry, meshBase[0].material.map, config.instances);
    // mesh.geometry.boundingBox = new THREE.Box3(new THREE.Vector3(15000, 15000, 15000), new THREE.Vector3(-15000, -15000, -15000));
    mesh.geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-1500, -1500, -1500), new THREE.Vector3(1500, 1500, 1500));
    mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0.0, 0.0, 0.0), 3000);
    
    // return new TerrainObject(config, mesh);
    return mesh;
}

function createInstancedMesh(geometry, texture, instances) {
    const instancedGeometry = new THREE.InstancedBufferGeometry();
    instancedGeometry.setAttribute('position', geometry.attributes.position.clone());
    instancedGeometry.setAttribute('normal', geometry.attributes.normal.clone());
    instancedGeometry.setAttribute('uv', geometry.attributes.uv ? geometry.attributes.uv.clone() : Array(geometry.attributes.position.length));
    instancedGeometry.setIndex(geometry.index ? geometry.index.clone() : null);

    const translations = new THREE.InstancedBufferAttribute(new Float32Array(instances.length * 3), 3);
    const rotations = new THREE.InstancedBufferAttribute(new Float32Array(instances.length), 1);

    for (let i = 0; i < instances.length; i++) {
        const position = instances[i].position;
        translations.setXYZ(i, position.x, position.y, position.z);
        rotations.setX(i, instances[i].rotation);
    }
    instancedGeometry.setAttribute('translation', translations);
    instancedGeometry.setAttribute('rotation', rotations);

    return new THREE.Mesh(instancedGeometry, new InstancedMaterial(texture));
}

export { loadTerrain };
