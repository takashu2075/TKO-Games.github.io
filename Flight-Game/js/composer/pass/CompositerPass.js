import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

function CompositerPass() {
    return new ShaderPass({
        vertexShader: `
            varying vec2 vUv;

            void main(void) {
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp sampler2DArray;

            layout(location = 0) out vec4 gDepth;
            layout(location = 1) out vec4 gColor;
            layout(location = 2) out vec4 gNormal;
            layout(location = 3) out vec4 gSurface;

            uniform sampler2D tDepth1;
            uniform sampler2D tColor1;
            uniform sampler2D tNormal1;
            uniform sampler2D tSurface1;

            uniform sampler2D tDepth2;
            uniform sampler2D tColor2;
            uniform sampler2D tNormal2;
            uniform sampler2D tSurface2;

            uniform int nScenesLength;

            varying vec2 vUv;

            void main(void) {
                vec4 tDepth = vec4(0.0, 0.0, 0.0, 0.0);
                vec4 tColor = vec4(0.0, 0.0, 0.0, 0.0);
                vec4 tNormal = vec4(0.0, 0.0, 0.0, 0.0);
                vec4 tSurface = vec4(0.0, 0.0, 0.0, 0.0);
                
                float fDepth1 = texture(tDepth, vUv).r;
                float fDepth2 = texture(tDepth, vUv).r;

                float fAlpha = fDepth1 - fDepth2;
                fAlpha = ceil(fAlpha);

                gDepth = mix(fDepth1, fDepth1, fAlpha);
                gColor = mix(texture(tColor1, vUv).r, texture(tColor2, vUv).r, fAlpha);
                gNormal = mix(texture(tNormal1, vUv).r, texture(tNormal2, vUv).r, fAlpha);
                gSurface = mix(texture(tSurface1, vUv).r, texture(tSurface2, vUv).r, fAlpha);

                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        `,
        uniforms: {
			"tDepth1": {
				type: "t",
				value: new THREE.Texture()
			},
			"tColor1": {
				type: "t",
				value: new THREE.Texture()
			},
			"tNormal1": {
				type: "t",
				value: new THREE.Texture()
			},
			"tSurface1": {
				type: "t",
				value: new THREE.Texture()
			},
			"tDepth2": {
				type: "t",
				value: new THREE.Texture()
			},
			"tColor2": {
				type: "t",
				value: new THREE.Texture()
			},
			"tNormal2": {
				type: "t",
				value: new THREE.Texture()
			},
			"tSurface2": {
				type: "t",
				value: new THREE.Texture()
			},
        }
    });
}

export default CompositerPass;
