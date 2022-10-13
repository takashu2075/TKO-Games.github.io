import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

function SkyPass(multipleRenderTargets, skyRenderTarget, mainCamera) {
    const shaderPass = new ShaderPass({
        vertexShader: `
            varying vec2 vUv;

            void main(void) {
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform sampler2D tNormal;
            uniform sampler2D tSkyColor;
            uniform sampler2D tDepth;

            uniform vec3 v3CameraPosition;
            uniform mat4 uProjectionInverse;
            uniform mat4 uMatrixWorld;

            varying vec2 vUv;

            vec3 computeWorldPosition4(float normalizedDepth) {
                vec4 ndc = vec4(
                    (vUv.x - 0.5) * 2.0,
                    (vUv.y - 0.5) * 2.0,
                    (normalizedDepth - 0.5) * 2.0,
                    1.0);

                vec4 clip = uProjectionInverse * ndc;
                vec4 view = uMatrixWorld * (clip / clip.w);
                vec3 result = view.xyz;

                return result;
            }

            void main(void) {
                float fNormalizedDepth = texture2D(tDepth, vUv).r;
                vec3 v3Position = computeWorldPosition4(fNormalizedDepth);

                float fScale = 1.0 / 100000.0;
                float fScaleDepth = 0.08;
                float fScaleOverScaleDepth = fScale / fScaleDepth;

                float fDepth = exp(fScaleOverScaleDepth * -v3Position.y);
                float t = fScaleOverScaleDepth * (v3CameraPosition.y - v3Position.y);
                float fHeightDelta = (1.0 - exp(-t) ) / t;
                float fScatter = fDepth * fScaleDepth * length(v3CameraPosition - v3Position) * fHeightDelta * 0.001;
                float fAlpha = 1.0 - exp(-fScatter);

                float fScatter2 = max(0.0, (-0000.0 + length(v3CameraPosition - v3Position)) * 0.00005);
                float fAlpha2 = min(1.0, exp(fScatter2) - 1.0);
                
                fAlpha = max(fAlpha, fAlpha2);

                gl_FragColor.rgb = mix(texture2D(tDiffuse, vUv).rgb, texture2D(tSkyColor, vUv).rgb, fAlpha);
                // gl_FragColor.rgb = mix(vec3(0.0, 0.0, 0.0), texture2D(tSkyColor, vUv).rgb, fAlpha);

                if (length(texture2D(tNormal, vUv).rgb) == 0.0) {
                    gl_FragColor.rgb = texture2D(tSkyColor, vUv).rgb;
                }

                gl_FragColor.rgb *= 1.0;
                gl_FragColor.a = 1.0;
            }
        `,
        uniforms: {
			"tDiffuse": {
				type: "t",
				value: new THREE.Texture()
			},
			"tSkyColor": {
				type: "t",
				value: skyRenderTarget.getColorTexture(),
			},
			"tNormal": {
				type: "t",
				value: multipleRenderTargets.getNormalTexture(),
			},
			"tDepth": {
				type: "t",
				value: multipleRenderTargets.getDepthTexture(),
			},
            "v3CameraPosition": {
                type: "v3",
                value: new THREE.Vector3()
            },
            "uProjectionInverse": {
                type: "m4",
                value: new THREE.Matrix4()
            },
            "uMatrixWorld": {
                type: "m4",
                value: new THREE.Matrix4()
            },
        }
    });

    shaderPass.update = function() {
        shaderPass.uniforms.tSkyColor.value = skyRenderTarget.getColorTexture();
        shaderPass.uniforms.tNormal.value = multipleRenderTargets.getNormalTexture();
        shaderPass.uniforms.tDepth.value = multipleRenderTargets.getDepthTexture();
        shaderPass.uniforms.v3CameraPosition.value = mainCamera.getCamera().position;
        shaderPass.uniforms.uProjectionInverse.value = mainCamera.getCamera().projectionMatrixInverse;
        shaderPass.uniforms.uMatrixWorld.value = mainCamera.getCamera().matrixWorld;
    };

    return shaderPass;
}

export default SkyPass;
