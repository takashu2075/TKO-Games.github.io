function BillBoardTree(config, sideTexture, topTexture) {
    const material = new THREE.RawShaderMaterial({
        vertexShader: `
            in vec3 position;
            in vec3 normal;
            in vec2 uv;
            in vec4 tangent;

            in vec3 translation;

            out vec3 v3Position;
            out vec3 v3Normal;
            out vec2 vUv;
            out float fDepth;
        
            uniform vec3 cameraPosition;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform mat3 normalMatrix;

            uniform sampler2D tHeightMap;

            uniform float fTerrainWidth;
            uniform float fHeightMultiplier;
            uniform float fScaleMultiplier;
            uniform float fHeightOffset;

            uniform vec2 vTileOffset;
            uniform float fTileScale;
            
            float getHeight(vec3 v3Position) {
                v3Position = vec3(v3Position.x, 0.0, -v3Position.z);
                vec2 vUv = (v3Position.xz + fTerrainWidth / 2.0) * (1.0 / fTerrainWidth);
                return texture(tHeightMap, vUv).r * fHeightMultiplier + fHeightOffset;
            }
            
            void main() {
                vec3 v3CameraPosition = floor(vec3(cameraPosition.x, 0.0, cameraPosition.z) / fTileScale) * fTileScale;

                vUv = uv;

                v3Position = 
                        position * fScaleMultiplier
                        + vec3(translation.x, 0.0, translation.z) 
                        + vec3(vTileOffset.x, 0.0, vTileOffset.y) 
                        + v3CameraPosition;

                v3Position = v3Position + vec3(0.0, 1.0, 0.0) * getHeight(v3Position);

                vec3 transformedNormal = normalMatrix * normal;
                v3Normal = normalize( transformedNormal );
                v3Normal = normal;
                
                fDepth = gl_Position.w;
            }
        `,
        fragmentShader: `
            precision highp float;
            precision highp int;

            layout(location = 0) out vec4 gColor;
            layout(location = 1) out vec4 gNormal;
            layout(location = 2) out vec4 gSurface;
            layout(location = 3) out vec4 gSky;

            uniform vec3 debugColor;

            uniform sampler2D tColor;
            uniform sampler2D tSurface;
            uniform sampler2D tNormal;

            // uniform sampler2D tColor;

            in vec2 vUv;
            in vec3 v3Normal;
            in float fDepth;

            void main() {
                gColor = texture(tColor, vUv) * 2.0;
                gNormal = vec4(v3Normal.xyz, 0.0);
                gSurface = vec4(1.0);
                gSky = vec4(0.0);
            }
        `,
        uniforms: {
            tHeightMap: {value: heightTexture},
            fTerrainWidth: {value: terrainWidth},
            fHeightMultiplier: {value: heightMultiplier},
            fScaleMultiplier: {value: scaleMultiplier},
            vTileOffset: {value: tileOffset},
            fTileScale: {value: tileScale},
            fHeightOffset: {value: heightOffset},
            tColor: {value: heightTexture},
            tNormal: {value: new THREE.Texture()},
            tSurface: {value: new THREE.Texture()},
            // v3Color: {value: new THREE.Vector3(material.color.r, material.color.g, material.color.b)},
            // tColor: {value: colorTexture},
        },
        glslVersion: THREE.GLSL3,
    });
}

export default BillBoardTree;
