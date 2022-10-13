import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

export default function TransparentCompositerPass(multipleRenderTargets, transparentRenderTarget) {
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
            uniform sampler2D tTransparentColor;

            varying vec2 vUv;

            void main(void) {
                vec3 v3Color = texture2D(tDiffuse, vUv).rgb;
                vec3 v3TransparentColor = texture2D(tTransparentColor, vUv).rgb;
                
                float fAlpha = texture2D(tTransparentColor, vUv).a;

                gl_FragColor = vec4(mix(v3Color, v3TransparentColor, fAlpha), 1.0);
            }
        `,
        uniforms: {
			"tDiffuse": {
				type: "t",
				value: new THREE.Texture()
			},
			"tColor": {
				type: "t",
				value: multipleRenderTargets.getColorTexture(),
			},
			"tTransparentColor": {
				type: "t",
				value: transparentRenderTarget.getColorTexture(),
			},
        }
    });

    shaderPass.update = function() {
        shaderPass.uniforms.tColor.value = multipleRenderTargets.getColorTexture();
        shaderPass.uniforms.tTransparentColor.value = transparentRenderTarget.getColorTexture();
    };

    return shaderPass;
}
