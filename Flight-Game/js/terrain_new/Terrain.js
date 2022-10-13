import * as THREE from '../lib/three/build/three.module.js';
import * as CANNON from '../lib/cannon-es/dist/cannon-es.js';
import GameObject from "../GameObject.js";

export default class Terrain extends GameObject {
    constructor(config, terrainTiles) {
        super();

        this.config = config;

        this.isTerrain = true;

        this.mesh = new THREE.Group();

        this.tileBodies = [];

        for (let i = 0; i < this.config.tilePlacements.length; i++) {
            const terrainTile = terrainTiles[this.config.tilePlacements[i]];
            const tileMesh = this.createTileMesh(terrainTile.mesh, i);


            const tilePosition = this.getTilePosition(i);
            const tileBody = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                shape: terrainTile.shape,
                // shape: new CANNON.Box(new CANNON.Vec3(3000, 10, 3000)),
            });
            const offset = this.config.size / this.config.tileDivision / 2;
            tileBody.position = new CANNON.Vec3(tilePosition.x - offset, tilePosition.y, tilePosition.z + offset);
            // tileBody.position = new CANNON.Vec3(tilePosition.x, tilePosition.y, tilePosition.z);
            tileBody.quaternion.setFromEuler(-Math.PI / 2, 0.0, 0.0, 'XYZ');
            tileBody.updateAABB();
            tileBody.gameObject = this;
            
            this.bodies.push(tileBody);
            this.mesh.add(tileMesh);
        }
    }

    createTileMesh(tileMeshBase, tileIndex) {
        const tileMesh = new THREE.Mesh(tileMeshBase.geometry, tileMeshBase.material);
        const tilePosition = this.getTilePosition(tileIndex);
        tileMesh.position.set(tilePosition.x, tilePosition.y, tilePosition.z);

        for (const objectMeshBase of tileMeshBase.children) {
            const objectMesh = new THREE.Mesh(objectMeshBase.geometry, objectMeshBase.material);
            // objectMesh.onBeforeRender = (renderer, scene, camera) => {
            //     const objectMeshPosition = new THREE.Vector2(tileMesh.position.x, tileMesh.position.z);
            //     const cameraPosition = new THREE.Vector2(camera.position.x, camera.position.z);
            //     if (10000 < objectMeshPosition.distanceTo(cameraPosition)) {
            //         objectMesh.visible = false;
            //     } else {
            //         objectMesh.visible = true
            //     }
            // };
            // objectMesh.frustumCulled = false;
            tileMesh.add(objectMesh);
        }

        return tileMesh;
    }

    getTilePosition(tileIndex) {
        const tileSize = this.config.size / this.config.tileDivision;
        const offset = -this.config.size / 2 + tileSize / 2;
        const x = offset + tileIndex % this.config.tileDivision * tileSize;
        const y = offset + Math.floor(tileIndex / this.config.tileDivision) * tileSize;
        return {
            x: x,
            y: 0,
            z: y,
        };
    }
}
