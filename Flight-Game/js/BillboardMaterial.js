import * as THREE from './lib/three/build/three.module.js';
import { loadTexture } from './Utils.js';

// const texture = loadTexture('img/smoke.png');

export default function BillboardMaterial(texture, size) {
    // reference: https://takumifukasawa.hatenablog.com/entry/threejs-billboard-shader
    return new THREE.RawShaderMaterial({
        vertexShader: `
            attribute vec3 position;
            attribute vec2 uv;
            attribute vec2 offset;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            
            uniform float fSize;

            uniform float fRandomTheta;
            
            uniform float fTimeElapsed;
        
            varying float vTimeElapsed;

            varying vec2 vUv;
            varying float vSize;

            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

                vec2 v2RotatedOffset = vec2(offset.x * cos(fRandomTheta) - offset.y * sin(fRandomTheta), offset.x * sin(fRandomTheta) + offset.y * cos(fRandomTheta));
                float fCurrentSize = fSize * (1.0 - exp(-fTimeElapsed));

                mvPosition.xy += v2RotatedOffset * vec2(fCurrentSize);
                gl_Position = projectionMatrix * mvPosition;

                vTimeElapsed = fTimeElapsed;
                vSize = fSize;
            }
        `,
        fragmentShader: `
            precision mediump float;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            
            uniform sampler2D tTexture;
            uniform sampler2D tColorTexture;
            uniform sampler2D tDepthTexture;
            
            uniform vec3 v3InitialColor;
            uniform vec3 v3FinalColor;

            varying vec2 vUv;
            varying float vTimeElapsed;
            varying float vSize;

            void main() {
                float fAlpha = texture2D(tTexture, vUv).r * 2.0 * exp(-vTimeElapsed / 20.0);

                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
                gl_FragColor.rgb = mix(v3FinalColor, v3InitialColor, exp(exp(-texture2D(tTexture, vUv).r) * -vTimeElapsed * 0.5));
                gl_FragColor.a = fAlpha;

            }
        `,
        uniforms: {
            tColorTexture: {
                value: new THREE.Texture(),
            },
            tDepthTexture: {
                value: new THREE.Texture(),
            },
            tTexture: {
                value: texture,
            },
            fSize: {
                value: size ? size : 1,
                // value: 1,
            },
            fRandomTheta: {
                value: 1.0,
            },
            fTimeElapsed: {
                value: 100.0,
            },
            v3InitialColor: {
                value: new THREE.Vector3(3.0, 1.5, 0.0),
            },
            v3FinalColor: {
                value: new THREE.Vector3(0.1, 0.1, 0.1),
            },
        },
        transparent: true,
        // blending: THREE.AdditiveBlending,
        // depthWrite: false,
        // depthTest: false,
    });
}
