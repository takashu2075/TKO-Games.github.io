import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

function HbaoCompositerPass() {
    return new ShaderPass({
        vertexShader: `
            varying vec2 vUv;

            void main(void) {
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D ColorSampler;
            uniform sampler2D tDiffuse;
            uniform float OcclusionPower;
            uniform vec3 OcclusionColor;
            varying vec2 vUv;

            void main() {
                vec4 color = texture2D(ColorSampler, vUv);
                color =texture2D(ColorSampler, vUv);
                float occlusion = pow(texture2D(tDiffuse, vUv).x, OcclusionPower);
                gl_FragColor = vec4(mix(OcclusionColor, color.xyz, occlusion), 1.0);
                //gl_FragColor = vec4(vec3(occlusion), 1.0);
            }
        `,
		uniforms: {
			"ColorSampler": {
				type: "t",
				value: null
			},
			"tDiffuse": {
				type: "t",
				value: new THREE.Texture()
			},
			"OcclusionPower": {
				type: "f",
				value: 5.0
			},
			"OcclusionColor": {
				type: "v3",
				value: new THREE.Vector3(0.0, 0.0, 0.0)
			},
		},
    });
}

export default HbaoCompositerPass;
