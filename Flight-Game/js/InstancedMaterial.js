import * as THREE from './lib/three/build/three.module.js';

export default function InstancedMaterial(texture) {
    return new THREE.ShaderMaterial({
        vertexShader: `
            attribute vec3 translation;
            attribute float rotation;

            out vec3 vNormal;
            out vec2 vUv;
            out mat3 m4NormalMatrix;

            const float PI  = 3.141592653589793;
            
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
            
            void main() {
                vUv = uv;
                vNormal = normal;

                // mat4 rotationMatrix = createRotationMatrix(vec3(0.0, 1.0, 0.0), PI / 2.0 - rotation * PI / 180.0);
                mat4 rotationMatrix = createRotationMatrix(vec3(0.0, 1.0, 0.0), -rotation * PI / 180.0);

                // vec3 v3Position = (vec4(position + translation, 1.0) * createRotationMatrix(vec3(0.0, 1.0, 0.0), rotation)).xyz;
                vec3 transformedNormal = (vec4(normal, 0.0) * rotationMatrix).xyz;
                vNormal = normalize( transformedNormal );
                vec3 v3Position = (vec4(position, 0.0) * rotationMatrix).xyz + translation;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(v3Position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            precision highp int;

            uniform sampler2D tTexture;

            layout(location = 0) out vec4 gColor;
            layout(location = 1) out vec4 gNormal;
            layout(location = 2) out vec4 gSurface;

            uniform sampler2D tColor;
            uniform sampler2D tSurface;
            uniform sampler2D tNormal;

            in vec3 vNormal;
            in vec2 vUv;
            in mat3 m4NormalMatrix;

            void main() {
                // vec3 transformedNormal = m4NormalMatrix * vNormal;
                // vec3 v3Normal = normalize( transformedNormal );
                vec3 v3Normal = vNormal;

                gColor = texture(tTexture, vUv);
                gNormal = vec4(vNormal, 0.0 );
                gSurface = vec4(0.0, 0.0, 0.0, 0.0);
            }
        `,
        uniforms: {
            tTexture: {value: texture},
        },
        glslVersion: THREE.GLSL3,
        // polygonOffset: true,
        // polygonOffsetFactor: -3.0,
        // polygonOffsetUnits: 4.0
    } );
};
