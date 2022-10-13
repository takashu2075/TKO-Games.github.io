import * as THREE from './lib/three/build/three.module.js';

function ColorMaterial(color) {
    return new THREE.ShaderMaterial({
        vertexShader: `
            out vec2 vUv;
            out vec3 vNormal;
            out mat4 vModelMatrix;

            void main() {
                vUv = uv;
                vNormal = normal;
                vModelMatrix = modelMatrix;

                vec3 transformedNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
                vNormal = normalize( transformedNormal );

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            precision highp int;
            precision highp sampler2DArray;

            uniform vec3 v3Color;

            layout(location = 0) out vec4 gColor;
            layout(location = 1) out vec4 gNormal;
            layout(location = 2) out vec4 gSurface;

            in vec2 vUv;
            in vec3 vNormal;
            in mat4 vModelMatrix;

            void main() {
                // vec3 transformedNormal = (vModelMatrix * vec4(vNormal, 0.0)).xyz;
                // vec3 v3Normal = normalize( transformedNormal );
                // gNormal = vec4(v3Normal, 0.0 );

                gNormal = vec4(vNormal, 0.0 );

                gColor = vec4(v3Color, 1.0);
                gSurface = vec4(0.0, 0.0, 0.0, 0.0);
            }
        `,
        uniforms: {
            v3Color: { value: color },
        },
        glslVersion: THREE.GLSL3,
        // polygonOffset: true,
        // polygonOffsetFactor: -3.0,
        // polygonOffsetUnits: 4.0
    });
}

export default ColorMaterial;
