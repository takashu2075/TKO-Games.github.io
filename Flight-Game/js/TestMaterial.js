import * as THREE from './lib/three/build/three.module.js';

function StandardMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: `
            out vec3 vNormal;
            out vec2 vUv;

            void main() {
                vUv = uv;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            precision highp int;
            precision highp sampler2DArray;

            uniform sampler2D tTexture;

            layout(location = 0) out vec4 gColor;
            layout(location = 1) out vec4 gNormal;
            layout(location = 2) out vec4 gSurface;

            in vec3 vNormal;
            in vec2 vUv;

            void main() {
                gColor = vec4(10.0, 10.0, 10.0, 1.0);
                gNormal = vec4(-vNormal.z, vNormal.y, -vNormal.x, 0.0 );
                gSurface = vec4(1.0, 1.0, 1.0, 1.0);
            }
        `,
        uniforms: {
        },
        glslVersion: THREE.GLSL3,
    });
}

export default StandardMaterial;
