import * as THREE from '../lib/three/build/three.module.js';
import * as CANNON from './../lib/cannon-es.js';
import {createTextureArray, bodyToMesh} from '../Utils.js';
import GameObject from "../GameObject.js";
import StandardMaterial from '../StandardMaterial.js';
import { MeshDepthMaterial } from '../lib/three.module.js';

const TILE_INITIAL_SCALE = 4000;
const TILE_RESOLUTION = 40;
const TILE_LEVELS = 3;
const GRID = TILE_INITIAL_SCALE / TILE_RESOLUTION * Math.pow(2, TILE_LEVELS);

const EDGE = {
    NONE: 0,
    TOP: 1,
    LEFT: 2,
    BOTTOM: 4,
    RIGHT: 8
};

export default class Terrain extends GameObject {
    constructor(config, heightTexture, normalTexture, noiseTexture, terrainMaterials, buildings, heightData) {
        super();

        this.damage = 100.0;

        this.terrainWidth = config.terrainWidth;
        const materialWidth = config.materialWidth;
        const heightMultiplier = config.heightMultiplier ? config.heightMultiplier : 1.0;
        this.heightMultiplier = config.heightMultiplier;
        const heightOffset = config.heightOffset ? config.heightOffset : 0.0;

        this.terrainMaterials = terrainMaterials;
    
        const colorTextureArray = createColorTextureArray(terrainMaterials);
        const maskTextureArray = createMaskTextureArray(terrainMaterials);
    
        const materialConfigs = createMaterialConfigs(terrainMaterials);
    
        const tileGeometry = new THREE.PlaneGeometry(1, 1, TILE_RESOLUTION, TILE_RESOLUTION);

        for (const building of buildings) {
            this.meshes.push(building);
        }

        this.body = this.createBody(heightData);
        this.body.gameObject = this;
        // this.body.position = new CANNON.Vec3(, 0.0, this.terrainWidth / 2);
        this.body.position.x = -this.terrainWidth / 2;
        this.body.position.z = -this.terrainWidth / 2;
        // const bodyMesh = bodyToMesh(this.body, new StandardMaterial());
        // bodyMesh.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
        // bodyMesh.quaternion.set(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
        // this.mesh = bodyMesh;

        this.body.gameObject = this;
        this.isTerrain = true;

        // 中心の4つのタイルを生成
        const offset = TILE_INITIAL_SCALE * 0.5;
        this.meshes.push(createTile(new THREE.Vector2(-TILE_INITIAL_SCALE + offset, -TILE_INITIAL_SCALE + offset), TILE_INITIAL_SCALE, EDGE.NONE));
        this.meshes.push(createTile(new THREE.Vector2(-TILE_INITIAL_SCALE + offset,                   0 + offset), TILE_INITIAL_SCALE, EDGE.NONE));
        this.meshes.push(createTile(new THREE.Vector2(                  0 + offset,                   0 + offset), TILE_INITIAL_SCALE, EDGE.NONE));
        this.meshes.push(createTile(new THREE.Vector2(                  0 + offset, -TILE_INITIAL_SCALE + offset), TILE_INITIAL_SCALE, EDGE.NONE));

        /**
         * 中心以外のタイルを順次生成
         * 
         * 1 5 7 9
         * 2     10
         * 3     11 
         * 4 6 8 13
         */
        for (let i = 0; i <= TILE_LEVELS; i++) {
            const scale = i == 0 ? TILE_INITIAL_SCALE : TILE_INITIAL_SCALE * Math.pow(2, i);
            const offset = scale * 0.5;
            this.meshes.push(createTile(new THREE.Vector2(-2 * scale + offset, -2 * scale + offset), scale,  EDGE.BOTTOM | EDGE.LEFT)); // 1
            this.meshes.push(createTile(new THREE.Vector2(-2 * scale + offset,     -scale + offset), scale,                EDGE.LEFT)); // 2
            this.meshes.push(createTile(new THREE.Vector2(-2 * scale + offset,          0 + offset), scale,                EDGE.LEFT)); // 3
            this.meshes.push(createTile(new THREE.Vector2(-2 * scale + offset,      scale + offset), scale,     EDGE.TOP | EDGE.LEFT)); // 4
            this.meshes.push(createTile(new THREE.Vector2(    -scale + offset, -2 * scale + offset), scale,              EDGE.BOTTOM)); // 5
            this.meshes.push(createTile(new THREE.Vector2(    -scale + offset,      scale + offset), scale,                 EDGE.TOP)); // 6
            this.meshes.push(createTile(new THREE.Vector2(         0 + offset, -2 * scale + offset), scale,              EDGE.BOTTOM)); // 7
            this.meshes.push(createTile(new THREE.Vector2(         0 + offset,      scale + offset), scale,                 EDGE.TOP)); // 8
            this.meshes.push(createTile(new THREE.Vector2(     scale + offset, -2 * scale + offset), scale, EDGE.BOTTOM | EDGE.RIGHT)); // 9
            this.meshes.push(createTile(new THREE.Vector2(     scale + offset,     -scale + offset), scale,               EDGE.RIGHT)); // 10
            this.meshes.push(createTile(new THREE.Vector2(     scale + offset,          0 + offset), scale,               EDGE.RIGHT)); // 11
            this.meshes.push(createTile(new THREE.Vector2(     scale + offset,      scale + offset), scale,    EDGE.TOP | EDGE.RIGHT)); // 12
        }
    
        // const segments = Math.sqrt(heightData.length);
        // const geometry = new THREE.PlaneGeometry(this.terrainWidth, this.terrainWidth, segments - 1, segments - 1);
        // // const material = new StandardMaterial();
        // const material = new THREE.MeshBasicMaterial({map: normalTexture});
        // this.transparentMesh = new THREE.Mesh(geometry, material);
        // for (let i = 0; i < heightData.length; i++) {
        //     if (!heightData[i]) {
        //         alert("NaN!!");
        //     }
        //     geometry.attributes.position.array[geometry.attributes.position.array.length + 1 - (i * 3 + 2)] = heightData[i] / 255 * heightMultiplier;
        // }
        // this.transparentMesh.rotation.z = Math.PI;
        // this.transparentMesh.rotation.x = Math.PI / -2;
        // this.meshes = null;
    
        /**
         * 地形タイルを作成
         * 
         * @param {*} offset 
         * @param {*} scale 
         * @param {*} edgeMorph 
         */
        function createTile(offset, scale, edgeMorph) {
            const material = createMaterial(
                offset,
                scale,
                edgeMorph,
                false
            );
            const tile = new THREE.Mesh(tileGeometry, material);
            tile.frustumCulled = false;
            tile.renderOrder = -2;
            return tile;
        }
    
        /**
         * 地形タイルの材質を作成
         * 
         * @param {*} offset 
         * @param {*} scale 
         * @param {*} edgeMorph 
         * @returns 
         */
        function createMaterial(offset, scale, edgeMorph, depthMode) {
            return depthMode ? getDepthMaterial(offset, scale, edgeMorph) : getMaterial(offset, scale, edgeMorph);
        };
    
        function createColorTextureArray(terrainMaterials) {
            const colorTextures = [];
            for (const terrainMaterial of terrainMaterials) {
                colorTextures.push(terrainMaterial.getColorTexture());
            }
            return createTextureArray(colorTextures);
        }
    
        function createMaskTextureArray(terrainMaterials) {
            const maskTextures = [];
            for (const terrainMaterial of terrainMaterials) {
                maskTextures.push(terrainMaterial.getMaskTexture());
            }
            return createTextureArray(maskTextures);
        }
    
        function createMaterialConfigs(terrainMaterials) {
            const materialConfigs = [];
            for (const terrainMaterial of terrainMaterials) {
                const config = terrainMaterial.getConfig();
                materialConfigs.push({
                    fMinAngle: config.minAngle ? config.minAngle : 0.0,
                    fMaxAngle: config.maxAngle ? config.maxAngle : Math.PI,
                    fMaxHeight: config.maxHeight ? config.maxHeight : 100 * 1000,
                    fMinHeight: config.minHeight ? config.minHeight : -1000.0,
                    fIntensity: config.intensity ? config.intensity : 1.0,
                });
            }
            return materialConfigs;
        }
    
        function getMaterial(offset, scale, edgeMorph) {
            return new THREE.ShaderMaterial({
                vertexShader: `
                    out vec3 v3Position;
                    out vec3 v3Normal;
                    out vec2 vTerrainUv;
                    out vec2 vMaterialUv;
    
                    const float MORPH_REGION = 0.1;
                    const int EGDE_MORPH_TOP = 1;
                    const int EGDE_MORPH_LEFT = 2;
                    const int EGDE_MORPH_BOTTOM = 4;
                    const int EGDE_MORPH_RIGHT = 8;
    
                    uniform sampler2D tHeightMap;
                    uniform sampler2D tNormalMap;
    
                    uniform float fTerrainWidth;
                    uniform float fMaterialWidth;
                    
                    uniform float fGrid;
    
                    uniform int nEdgeMorph;
    
                    uniform vec2 vTileOffset;
                    uniform float fTileScale;
                    uniform float fTileResolution;
                    uniform float fHeightMultiplier;
                    uniform float fHeightOffset;
                    
                    float getHeight(vec3 v3Position) {
                        v3Position = vec3(v3Position.x, 0.0, -v3Position.z);
                        vec2 vUv = (v3Position.xz + fTerrainWidth / 2.0) * (1.0 / fTerrainWidth);
                        return texture(tHeightMap, vUv).r * fHeightMultiplier + fHeightOffset;
                    }
    
                    vec3 getNormal(vec3 v3Position) {
                        v3Position = vec3(v3Position.x, 0.0, -v3Position.z);
                        vec2 vUv = (v3Position.xz + fTerrainWidth / 2.0) * (1.0 / fTerrainWidth);
                        vec3 v3Normal2 = texture(tNormalMap, vUv).xyz * 2.0 - 1.0;
                        // v3Normal2 = vec3(v3Normal2.z, v3Normal2.y, v3Normal2.x);
                        return v3Normal2;
                    }
    
                    vec3 getNormal2(vec3 v3Position, bool edge) {
                        // Get 2 vectors perpendicular to the unperturbed normal, and create at point at each (relative to position)
                        float vMorphFactor = 0.0;
                        if (edge) {
                            vMorphFactor = 1.0;
                        }
    
                        float delta = (vMorphFactor + 1.0) * fTileScale / fTileResolution;
                        vec3 dA = delta * normalize(cross(normal.yzx, normal));
                        vec3 dB = delta * normalize(cross(dA, normal));
                        vec3 p = v3Position;
                        vec3 pA = v3Position + dA;
                        vec3 pB = v3Position + dB;
                      
                        // Now get the height at those points
                        float h = getHeight(v3Position);
                        float hA = getHeight(pA);
                        float hB = getHeight(pB);
                      
                        // Update the points with their correct heights and calculate true normal
                        p += normal * h;
                        pA += normal * hA;
                        pB += normal * hB;
                        return normalize(cross(pB - p, pA - p));
                    }
    
                    bool edgePresent(int edge) {
                        int e = nEdgeMorph / edge;
                        return 2 * ( e / 2 ) != e;
                    }
    
                    bool isEdge(vec3 p) {
                        // float morphFactor = 0.0;
                        if ( edgePresent(EGDE_MORPH_TOP) && p.y >= 0.5 - MORPH_REGION ) {
                            return true;
                        }
                        if ( edgePresent(EGDE_MORPH_LEFT) && p.x <= -0.5 + MORPH_REGION ) {
                            return true;
                        }
                        if ( edgePresent(EGDE_MORPH_BOTTOM) && p.y <= -0.5 + MORPH_REGION ) {
                            return true;
                        }
                        if ( edgePresent(EGDE_MORPH_RIGHT) && p.x >= 0.5 - MORPH_REGION ) {
                            return true;
                        }
                        return false;
                    }
                    
                    void main() {
                        vec3 v3CameraPosition = floor(vec3(cameraPosition.x, 0.0, cameraPosition.z) / fGrid) * fGrid;
    
                        v3Position = fTileScale * vec3(position.x, position.z, position.y) 
                                + vec3(vTileOffset.x, 0.0, vTileOffset.y) + v3CameraPosition;
                        v3Position.y = getHeight(v3Position);
    
                        v3Normal = getNormal(v3Position);
    
                        bool edge = isEdge(position);
                        if (edge) {
                            float grid = 2.0 * fTileScale / fTileResolution;
                            vec3 v3PositionC = ceil(v3Position / grid) * grid;
                            vec3 v3PositionF = floor(v3Position / grid) * grid;
                            float fHeightC = getHeight(v3PositionC);
                            float fHeightF = getHeight(v3PositionF);
                            float fHeight = (fHeightC + fHeightF) / 2.0;
                            v3Position.y = fHeight;
                        }
    
                        vTerrainUv = (v3Position.xz + fTerrainWidth / 2.0) / fTerrainWidth;
                        // vTerrainUv = v3Position.xz / fTerrainWidth;
                        vMaterialUv = v3Position.xz * (1.0 / fMaterialWidth);
    
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(v3Position, 1.0);
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    precision highp int;
                    precision highp sampler2DArray;
    
                    layout(location = 0) out vec4 gColor;
                    layout(location = 1) out vec4 gNormal;
                    layout(location = 2) out vec4 gSurface;
    
                    uniform sampler2DArray tColors;
                    uniform sampler2DArray tMasks;
                    uniform sampler2D tNoise;
                    
                    uniform float fTerrainWidth;
                    uniform sampler2D tNormalMap;
    
                    uniform int materialsLength;
    
                    uniform float fNoiseScale;
                    uniform float fNoiseIntensity;
    
                    in vec2 vTerrainUv;
                    in vec2 vMaterialUv;
                    in vec3 v3Normal;
                    in vec3 v3Position;
    
                    vec3 getNormal(vec3 v3Position) {
                        v3Position = vec3(v3Position.x, 0.0, -v3Position.z);
                        vec2 vUv = (v3Position.xz + fTerrainWidth / 2.0) * (1.0 / fTerrainWidth);
                        vec3 v3Normal2 = texture(tNormalMap, vUv).xyz * 2.0 - 1.0;
                        // v3Normal2 = vec3(v3Normal2.z, v3Normal2.y, v3Normal2.x);
                        return v3Normal2;
                    }
    
                    float getNoise(vec2 v2Uv) {
                        float fNoise = texture(tNoise, v2Uv * fNoiseScale).r * 2.0 - 1.0;
                        return fNoise * fNoiseIntensity;
                    }
    
                    void main() {
                        if (vTerrainUv.x > 1.0 || vTerrainUv.x < 0.0 ||
                            vTerrainUv.y > 1.0 || vTerrainUv.y < 0.0) {
                            discard;
                        }
                        if (length(cameraPosition.xz - v3Position.xz) > 50000.0) {
                            discard;
                        }
                        vec3 v3NormalizedNormal = normalize(v3Normal);
    
                        float fNoise = getNoise(vMaterialUv * 3.0) * 0.008;
                        float fNoise1 = getNoise(vMaterialUv * 1.0) * 0.00003;
                        float fNoise2 = getNoise(vec2(1.0 - vMaterialUv.y, 1.0 - vMaterialUv.x)) * 0.00003;
    
                        vec4 tColor = vec4(0.0, 0.0, 0.0, 0.0);
                        for (int i = 0; i < materialsLength; i++) {
                            vec2 vNoisedTerrainUv = vec2(vTerrainUv.x + fNoise1, vTerrainUv.y + fNoise2);
                            // float alpha = texture(tMasks, vec3(vNoisedTerrainUv, i)).r * 1.0;
                            float alpha = texture(tMasks, vec3(vTerrainUv, i)).r * 1.0;
                            tColor = mix(tColor, texture(tColors, vec3(vMaterialUv, i)) * (1.0 + fNoise), alpha);
                        }
                        
                        gColor = tColor * 3.0;
                        gNormal.rgb = getNormal(v3Position);
                        gNormal = vec4(-gNormal.x, gNormal.z, -gNormal.y, 0.0);
                        gSurface = vec4(0.0, 0.0, 0.0, 0.0);
                    }
                `,
                uniforms: {
                    tHeightMap: {value: heightTexture},
                    tNormalMap: {value: normalTexture},
                    tNoise: {value: noiseTexture},
                    tColors: {value: colorTextureArray},
                    tMasks: {value: maskTextureArray},
                    nEdgeMorph: {value: edgeMorph},
                    fTileResolution: {value: TILE_RESOLUTION},
                    vTileOffset: {value: offset},
                    fTileScale: {value: scale},
                    fGrid: {value: GRID},
                    fTerrainWidth: {value: config.terrainWidth},
                    fMaterialWidth: {value: materialWidth},
                    fHeightOffset: {value: heightOffset},
                    fHeightMultiplier: {value: heightMultiplier},
                    fNoiseScale: {value: 2.0},
                    fNoiseIntensity: {value: 50.0},
                    materialConfigs: {value: materialConfigs},
                    materialsLength: {value: terrainMaterials.length}
                },
                side: THREE.BackSide,
                glslVersion: THREE.GLSL3,
                wireframe: false,
            });
        }
    }

    createBody(heightData) {
        // Create a matrix of height values
        const matrix = []
        const sizeX = 15
        const sizeZ = 15

        const size = Math.sqrt(heightData.length);

        for (let i = 0; i < size; i++) {
            matrix.push([])
            for (let j = 0; j < size; j++) {
                // matrix[i].push(heightData[size * i + j] * this.heightMultiplier * this.terrainWidth / size);
                matrix[i].push(heightData[size * i + j] / 255 * this.heightMultiplier);
            }
        }

        // Create the heightfield
        const heightfieldShape = new CANNON.Heightfield(matrix, {
            elementSize: this.terrainWidth / size,
        });
        const heightfieldBody = new CANNON.Body({
            // mass: 5,
            shape: heightfieldShape,
            // type: CANNON.Body.STATIC, // can also be achieved by setting the mass to 0
        });
        heightfieldBody.invInertiaWorld = new CANNON.Mat3([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]);
        // heightfieldBody.addShape(heightfieldShape);
        heightfieldBody.position.set(
            -((sizeX - 1) * heightfieldShape.elementSize) / 2,
            0,
            ((sizeZ - 1) * heightfieldShape.elementSize) / 2
        )
        heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, -Math.PI / 2, 0, 'YZX');

        return heightfieldBody;
    }

    beforeRender() {
        // this.testMesh.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
    }

    getBuildings = function() {
        return this.buildings;
    };

    getTerrainMaterials = function() {
        return this.terrainMaterials;
    };

    getHeightMap = function() {
        return this.heightTexture;
    };
}
