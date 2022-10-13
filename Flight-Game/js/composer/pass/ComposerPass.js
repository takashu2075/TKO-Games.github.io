import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

export default function ComposerPass() {
    const shaderPass = new ShaderPass({
        vertexShader: `
            varying vec2 vUv;

            void main(void) {
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform sampler2D tColor;

            varying vec2 vUv;

            void main() {
                gl_FragColor = texture2D(tColor, vUv);
                // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
        `,
        uniforms: {
            "tDiffuse": {
				type: "t",
				value: new THREE.Texture(),
            },
            "tColor": {
				type: "t",
				value: new THREE.Texture(),
            },
        },
    });

    shaderPass.update = function(colorTexture) {
		shaderPass.uniforms.tColor.value = colorTexture;
    }

    return shaderPass;
}
