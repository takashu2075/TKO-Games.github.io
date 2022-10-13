import * as THREE from '../lib/three/build/three.module.js';

const TERRAIN_OBJECT_VISIBLE_DISTANCE = 4000.0;

function TerrainObject(terrainConfig, materialConfig, objectConfig, mesh, positions, rotations, heightMap, normalMap, maskTexture, noiseTexture) {
    const terrainWidth = terrainConfig.terrainWidth;
    const heightOffset = terrainConfig.heightOffset ? terrainConfig.heightOffset : 0.0;
    const materialWidth = materialConfig.materialWidth;
    const heightMultiplier = terrainConfig.heightMultiplier ? terrainConfig.heightMultiplier : 1.0;
    const scaleMultiplier = objectConfig.scaleMultiplier;

    const tileLevels = Math.ceil(TERRAIN_OBJECT_VISIBLE_DISTANCE / materialWidth) + 1;
    const meshes = [];

    // 中心の4つのタイルを生成
    const scale = materialWidth;
    const offset = scale * 0.5;

    const allPositions = [];
    const allRotations = [];

    addAttributes(-scale + offset, -scale + offset, scale);
    addAttributes(-scale + offset,      0 + offset, scale);
    addAttributes(     0 + offset,      0 + offset, scale);
    addAttributes(     0 + offset, -scale + offset, scale);

    for (let i = 1; i < tileLevels; i++) {
        // 上辺とその角
        for (let j = -i - 1; j <= i; j++) {
            addAttributes(j * scale + offset, (-i - 1) * scale + offset, scale);
        }

        // 下辺とその角
        for (let j = -i - 1; j <= i; j++) {
            addAttributes(j * scale + offset, i * scale + offset, scale);
        }

        // // 左辺
        for (let j = -i; j < i; j++) {
            addAttributes((-i - 1) * scale + offset, j * scale + offset, scale);
        }

        // // 左辺
        for (let j = -i; j < i; j++) {
            addAttributes(i * scale + offset, j * scale + offset, scale);
        }

        for (const mesh of meshes) {
            // mesh.renderOrder = 0;
        }
    }

    createTile(0.0, 0.0, scale)

    function addAttributes(x, y) {
        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];
            allPositions.push([x + position[0], 0.0, y + position[1]]);
            const rotation = rotations[i];
            allRotations.push(rotation);
        }
    }

    function createTile(x, y, scale) {
        // const geometry = new THREE.BoxGeometry( 10, 10, 10 );
        const geometry = mesh.geometry;
        // geometry.computeTangents();

		const instancedGeometry = new THREE.InstancedBufferGeometry();
		instancedGeometry.setAttribute('position', geometry.attributes.position.clone());
		instancedGeometry.setAttribute('normal', geometry.attributes.normal.clone());
		instancedGeometry.setAttribute('uv', geometry.attributes.uv ? geometry.attributes.uv.clone() : Array(geometry.attributes.position.length));
		// instancedGeometry.setAttribute('tangent', geometry.attributes.tangent.clone());
		instancedGeometry.setIndex(geometry.index ? geometry.index.clone() : null);

        const translations = new THREE.InstancedBufferAttribute(new Float32Array(allPositions.length * 3), 3, false, 1);
        const rotations = new THREE.InstancedBufferAttribute(new Float32Array(allRotations.length), 1, false, 1);

        const falloffOffsets = new THREE.InstancedBufferAttribute(new Float32Array(allPositions.length), 1, false, 1);

        for (let i = 0; i < allPositions.length; i++) {
            const position = allPositions[i];
            translations.setXYZ(i, position[0], 0.0, position[2]);
            rotations.setXYZ(i, allRotations[i]);
            falloffOffsets.setX(i, Math.random());
        }
        instancedGeometry.setAttribute('translation', translations);
        instancedGeometry.setAttribute('rotation', rotations);
        instancedGeometry.setAttribute('falloffOffset', falloffOffsets);

        const material = createMaterial(
            new THREE.Vector3(x, 0.0, y),
            scale
        );
        const tile = new THREE.Mesh(instancedGeometry, material);
        tile.frustumCulled = false;
        meshes.push(tile);
    }

    function createMaterial(tileOffset, tileScale, material) {
        return new THREE.RawShaderMaterial({
            vertexShader: `
                in float rotation;
                in vec3 position;
                in vec3 normal;
                in vec2 uv;
                in vec4 tangent;

                in vec3 translation;
                in float falloffOffset;

                out float fDistance;
                out vec3 v3Position;
                out vec3 v3Normal;
                out vec2 vUv;
            
                uniform vec3 cameraPosition;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat3 normalMatrix;

                uniform sampler2D tHeightMap;
                uniform sampler2D tNormalMap;
                uniform sampler2D tMask;

                uniform sampler2D tNoise;

                uniform float fTerrainWidth;
                uniform float fHeightMultiplier;
                uniform float fScaleMultiplier;
                uniform float fHeightOffset;

                uniform vec3 v3TileOffset;
                uniform float fTileScale;

                struct MaterialConfig {
                    float fMinAngle;
                    float fMaxAngle;
                    float fMaxHeight;
                    float fMinHeight;
                };
                uniform MaterialConfig materialConfig;

                float getMask(vec2 v2Uv) {
                    return texture(tMask, v2Uv).r;
                }
                
                float getHeight(vec2 v2Uv) {
                    return texture(tHeightMap, v2Uv).r * fHeightMultiplier + fHeightOffset;
                }

                vec3 getNormal(vec2 v2Uv) {
                    return texture(tNormalMap, v2Uv).xyz * 2.0 - 1.0;
                }
                
                mat4 createRotationMatrix(vec3 axis, float angle) {
                    axis = normalize(axis);
                    float s = sin(angle);
                    float c = cos(angle);
                    float oc = 1.0 - c;
                    
                    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                                0.0,                                0.0,                                0.0,                                1.0);
                }

                float getOpacity(float fHeight, float fAngle) {
                    MaterialConfig config = materialConfig;

                    float alpha = 1.0;
                    // alpha *= clamp(fAngle - config.fMinAngle, 0.0, 1.0);
                    // alpha = ceil(alpha);
                    // alpha *= clamp(config.fMaxAngle + 0.05 - fAngle, 0.0, 1.0);
                    // alpha = ceil(alpha);
                    // alpha *= clamp(fHeight - config.fMinHeight, 0.0, 1.0);
                    // alpha = ceil(alpha);
                    // alpha *= clamp(config.fMaxHeight - fHeight, 0.0, 1.0);
                    // alpha = ceil(alpha);

                    alpha *= clamp(fAngle - config.fMinAngle, 0.0, 1.0);
                    alpha = ceil(alpha);
                    alpha *= clamp((config.fMaxAngle + 0.05 - fAngle) * 10.0, 0.0, 1.0);
                    alpha = ceil(alpha);
                    alpha *= clamp((fHeight - config.fMinHeight) * 0.1, 0.0, 1.0);
                    alpha = ceil(alpha);
                    alpha *= clamp((config.fMaxHeight - fHeight) * 0.1, 0.0, 1.0);
                    alpha = ceil(alpha);

                    return alpha;
                }
                
                void main() {
                    vec3 v3CameraPosition = floor(vec3(cameraPosition.x, 0.0, cameraPosition.z) / fTileScale) * fTileScale;

                    v3Position = translation + v3TileOffset + v3CameraPosition;

                    fDistance = length(v3Position.xz - cameraPosition.xz);
                    float fAlpha = clamp(floor(3000.0 / fDistance), 0.0, 1.0);

                    vec2 v2Uv = (vec2(v3Position.x, -v3Position.z) + fTerrainWidth * 0.5) * (1.0 / fTerrainWidth);

                    v3Position.y = getHeight(v2Uv);

                    float fHeight = v3Position.y;
                    float fAngle = acos(getNormal(v2Uv).b);

                    fAlpha *= min(round(getMask(v2Uv) + 0.2), 1.0);;
                    // fAlpha *= getOpacity(fHeight, fAngle);

                    v3Position.y -= (1.0 - fAlpha) * 100000.0;

                    v3Position += (vec4(position, 1.0) * createRotationMatrix(vec3(0.0, 1.0, 0.0), rotation)).xyz * fScaleMultiplier;

                    vUv = uv;
                    v3Normal = normal;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(v3Position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                precision highp int;

                layout(location = 0) out vec4 gColor;
                layout(location = 1) out vec4 gNormal;
                layout(location = 2) out vec4 gSurface;
                layout(location = 3) out vec4 gSky;

                uniform sampler2D tColor;
                uniform sampler2D tSurface;
                uniform sampler2D tNormal;
                uniform sampler2D tNoise;


                in vec2 vUv;
                in vec3 v3Normal;
                in float fDepth;
                in float fDistance;

                void main() {
                    vec2 v2ScreenUv = gl_FragCoord.xy / vec2(1920.0, 1080.0) * 70.0;

                    float fNoise = (texture(tNoise, v2ScreenUv).r * 2.0 - 1.0) * 2000.0;
                    // fNoise = rand(i);
                    float fNoisedDistance = fDistance + fNoise;
                    if (fNoisedDistance > 2500.0) discard;

                    gColor = texture(tColor, vUv) * 1.5;
                    // gColor = texture(tNoise, v2ScreenUv) * 1.5;
                    gNormal = vec4(v3Normal.xyz, 0.0);
                    gSurface = vec4(0.0);
                    gSky = vec4(0.0);
                }
            `,
            uniforms: {
                tHeightMap: {value: heightMap},
                tNormalMap: {value: normalMap},
                tMask: {value: maskTexture},
                fTerrainWidth: {value: terrainWidth},
                fHeightMultiplier: {value: heightMultiplier},
                fScaleMultiplier: {value: scaleMultiplier},
                v3TileOffset: {value: tileOffset},
                fTileScale: {value: tileScale},
                fHeightOffset: {value: heightOffset},
                tColor: {value: mesh.material.map},
                tNormal: {value: new THREE.Texture()},
                tSurface: {value: new THREE.Texture()},
                tNoise: {value: noiseTexture},
                materialConfig: {value: {
                    fMinAngle: materialConfig.minAngle ? materialConfig.minAngle : -Math.PI * 2.0,
                    fMaxAngle: materialConfig.maxAngle ? materialConfig.maxAngle : Math.PI * 2.0,
                    fMaxHeight: materialConfig.maxHeight ? materialConfig.maxHeight : 100 * 10000,
                    fMinHeight: materialConfig.minHeight ? materialConfig.minHeight : -100 * 10000,
                }},
                // v3Color: {value: new THREE.Vector3(material.color.r, material.color.g, material.color.b)},
                // tColor: {value: colorTexture},
            },
            alphaTest: 0.5,
            glslVersion: THREE.GLSL3,
        } );
    };

    this.getMeshes = function() {
        return meshes;
    };

    this.setHeightTexture = function(heightTexture) {
        for (const mesh of meshes) {
            mesh.material.uniforms.tHeightTexture.value = heightTexture;
        }
    };

    this.update = function() {
        for (const mesh of meshes) {
            mesh.material.uniforms.v3CameraPosition.value = heightMap;
        }
    }
}

export default TerrainObject;