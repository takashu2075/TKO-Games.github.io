import * as THREE from './lib/three/build/three.module.js';

export default function ImposterMaterial(texture, size, meshPosition, cameraPosition) {
    return new THREE.RawShaderMaterial({
        vertexShader: `
            attribute vec2 offset;
            attribute vec2 uv;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            
            uniform float fSize;

            uniform vec3 meshPosition;
            uniform vec3 cameraPosition;
            uniform vec3 cameraUpVec;

            varying vec2 vUv;

            varying vec2 testVec;

            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                vec4 vertPosition = projectionMatrix * mvPosition;

                vec4 mvPositionUv = modelViewMatrix * vec4(offset.x * fSize, offset.y * fSize, 0.0, 1.0);

                vec3 cameraVec = mvPosition.xyz / length(mvPosition.xyz);
                vec3 vecX = cross(cameraVec, vec3(0.0, 1.0, 0.0));
                vec3 vecY = cross(cameraVec, vecX);
                // mvPosition.xy += offset * fSize;
                mvPosition.xyz += vecX * offset.x * fSize;
                mvPosition.xyz -= vecY * offset.y * fSize;
                // mvPosition.y += offset.y * fSize;
                gl_Position = projectionMatrix * mvPosition;

                // vec2 uvOffset = vec2(
                //     mvPosition.x - mvPositionUv.x,
                //     mvPosition.y - mvPositionUv.y
                // );
                // vUv = uv + uvOffset / (fSize);
                vUv = uv;

                vec4 imposterVertPosition = projectionMatrix * modelViewMatrix * vec4(offset.x * fSize, offset.y * fSize, 0.0, 1.0);
                vec4 centerPosition = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                // gl_Position = centerPosition;
                // gl_Position.xy = centerPosition.xy + offset * 100.0;
                vec2 centerOffset = vec2(
                    centerPosition.x / centerPosition.w,
                    centerPosition.y / centerPosition.w
                );
                centerOffset = vec2(
                    centerPosition.x,
                    centerPosition.y
                );

                // gl_Position = vertPosition;

                vec2 screenVertOffset = vec2(
                    vertPosition.x - centerOffset.x,
                    vertPosition.y - centerOffset.y
                );

                vec2 screenImposterOffset = vec2(
                    imposterVertPosition.x - centerOffset.x,
                    imposterVertPosition.y - centerOffset.y
                );

                vec2 uvOffset = vec2(
                    screenVertOffset.x / screenImposterOffset.x,
                    screenVertOffset.y / screenImposterOffset.y
                );
                testVec = vec2(vertPosition.x / vertPosition.w, vertPosition.y / vertPosition.w);
                vUv = (offset * uvOffset + 1.0) / 2.0;
                testVec = uv * uvOffset;
            }
        `,
        fragmentShader: `
            precision mediump float;

            uniform sampler2D tTexture;

            varying vec2 vUv;
            varying vec2 testVec;

            void main() {
                // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                if (vUv.x < 0.0 || 1.0 < vUv.x || vUv.y < 0.0 || 1.0 < vUv.y) {
                    // discard;
                }
                gl_FragColor.rgba = vec4(1.0, 1.0, 1.0, 1.0);
                if (testVec.x < -0.9 || 0.9 < testVec.x || testVec.y < -0.9 || 0.9 < testVec.y) {
                    // gl_FragColor.rgba = vec4(1.0, 0.0, 0.0, 1.0);
                }
                // gl_FragColor.a = vec4(texture2D(tTexture, vUv)).r;

            }
        `,
        uniforms: {
            tTexture: {
                value: texture,
            },
            fSize: {
                value: size ? size : 1,
            },
            meshPosition: {
                value: meshPosition,
            },
            cameraPosition: {
                value: cameraPosition,
            },
            cameraUpVec: {
                value: cameraPosition,
            },
        },
        transparent: true,
        // blending: THREE.AdditiveBlending,
        // depthWrite: false,
        // depthTest: false,
    });
}
