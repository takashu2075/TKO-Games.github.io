import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

const SKY_DOME_RADIUS = 5000;
const SKY_DOME_DIVISION = 100;

const SKY_CONFIG = {
	Kr         : 0.0030,
	Km         : 0.0005,
	ESun       : 20.0,
	g          : -0.80,
	innerRadius: SKY_DOME_RADIUS,
	outerRadius: SKY_DOME_RADIUS * 1.025,
	wavelength : [0.650, 0.570, 0.475],
	scaleDepth : 0.25,
};
function LightingPass(multipleRenderTargets, mainCamera, sun) {
    const shaderPass = new ShaderPass({
        vertexShader: `
            uniform vec3 v3LightPosition;

            uniform float fKr4PI;
            uniform float fKm4PI;
            uniform float fScaleDepth;
            uniform float fScaleOverScaleDepth;
            uniform vec3 v3InvWavelength;

            varying vec2 vUv;
            varying vec3 vAttenuate;

            varying vec3 v3SunEnvLight;
            varying vec3 v3StarLight;

            float scale(float fCos) {
                float x = (1.0 - fCos);
                return fScaleDepth * exp(-0.00287 + x * (0.459 + x * (3.83 + x * (-6.80 + x * 5.25))));
            }

            void main(void) {
                float fDepth = exp(fScaleOverScaleDepth * -0.0);
                float fLightAngle = dot(v3LightPosition, vec3(0.0, 1.0, 0.0)) / 1.0;
                float fScatter = fDepth * scale(fLightAngle);
                
                vAttenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));

                // 太陽の環境光
                v3SunEnvLight = vec3(1.0, 1.0, 1.0) * vAttenuate;

                // 星の環境光
                float fStarLightScatter = fDepth * scale(1.0);
                vec3 v3StarLightAttenuate = exp(-fStarLightScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                v3StarLight = vec3(1.0, 1.0, 1.0) * v3StarLightAttenuate;
                
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform sampler2D tColor;
            uniform sampler2D tNormal;
            uniform sampler2D tSurface;
            uniform sampler2D tDepth;

            uniform vec3 v3CameraPosition;
            uniform mat4 uProjectionInverse;
            uniform mat4 uMatrixWorld;
            
            uniform vec3 v3LightPosition;
            
            uniform vec3 v3InvWavelength;
            uniform float fKrESun;				// Kr * ESun
            uniform float fKmESun;			    // Km * ESun

            varying vec2 vUv;
            varying vec3 vAttenuate;

            varying vec3 v3SunEnvLight;
            varying vec3 v3StarLight;

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
    
            vec3 czm_saturation(vec3 rgb, float adjustment) {
                // Algorithm from Chapter 16 of OpenGL Shading Language
                const vec3 W = vec3(0.2125, 0.7154, 0.0721);
                vec3 intensity = vec3(dot(rgb, W));
                return mix(intensity, rgb, adjustment);
            }

            // https://qiita.com/yoship1639/items/75505244b6c242d50f71#%E3%82%B9%E3%83%9A%E3%82%AD%E3%83%A5%E3%83%A9%E9%96%A2%E6%95%B0%E3%81%AE%E5%AE%9A%E7%BE%A9
            float calcSpecular(vec3 surfToEye, vec3 normal, vec3 surfToLight, float shininess)
            {
                vec3 refDir = normalize(reflect(-surfToLight, normal));
                float factor = dot(surfToEye, refDir);
                return pow(max(factor, 0.0), shininess);
            }

            void main(void) {
                vec3 v3Color = texture2D(tColor, vUv).xyz;
                vec3 v3Normal = normalize(texture2D(tNormal, vUv).xyz);

                float fNormalizedDepth = texture2D(tDepth, vUv).r;
                vec3 v3CameraDirection = normalize(v3CameraPosition - computeWorldPosition4(fNormalizedDepth));
                float specular = calcSpecular(v3CameraDirection, v3Normal, v3LightPosition, 50.0);

                float fDirectional = max(pow(dot(v3Normal, v3LightPosition) * 0.5 + 0.5, 2.0), 0.0);
                // float fDirectional = max(dot(v3Normal, v3LightPosition), 0.0);

                vec3 v3SunLightColor = 1.0 - exp(-vec3(1.0, 1.0, 1.0) * vAttenuate);
                v3SunLightColor = czm_saturation(v3SunLightColor, 1.5);
                
                vec3 v3InhancedColor = v3Color * 1.2;
                vec3 result = 
                        v3InhancedColor * fDirectional * v3SunLightColor
                        + v3InhancedColor * specular * v3SunLightColor * 1.5
                        + v3InhancedColor * v3SunLightColor * 0.2
                        + v3InhancedColor * v3StarLight * 0.3;
                    
                gl_FragColor.rgb = result;

                if (length(v3Normal) == 0.0) {
                    gl_FragColor.rgb = v3Color;
                }

                gl_FragColor.a = 1.0;
            }
        `,
        uniforms: {
			"tDiffuse": {
				type: "t",
				value: new THREE.Texture()
			},
			"tColor": {
				type: "t",
				value: multipleRenderTargets.getColorTexture()
			},
			"tNormal": {
				type: "t",
				value: multipleRenderTargets.getNormalTexture()
			},
			"tSurface": {
				type: "t",
				value: multipleRenderTargets.getSurfaceTexture()
			},
			"tDepth": {
				type: "t",
				value: multipleRenderTargets.getDepthTexture()
			},
            "fKrESun": {
                value: SKY_CONFIG.Kr * SKY_CONFIG.ESun
            },
            "fKmESun": {
                value: SKY_CONFIG.Km * SKY_CONFIG.ESun
            },
            "v3LightPosition": {
                value: new THREE.Vector3(1.0, 1.0, 1.0).normalize()
            },
            "v3CameraPosition": {
                value: mainCamera.getCamera().position,
            },
            "uProjectionInverse": {
                type: "m4",
                value: new THREE.Matrix4()
            },
            "uMatrixWorld": {
                type: "m4",
                value: new THREE.Matrix4()
            },
            "fKr4PI": { value: SKY_CONFIG.Kr * 4.0 * Math.PI },
            "fKm4PI": { value: SKY_CONFIG.Km * 4.0 * Math.PI },
            "fScaleDepth": { value: SKY_CONFIG.scaleDepth },
            "fScaleOverScaleDepth": { value: (1.0 / (SKY_CONFIG.outerRadius - SKY_CONFIG.innerRadius)) / SKY_CONFIG.scaleDepth },
            "v3InvWavelength": { value: new THREE.Vector3(1 / Math.pow(SKY_CONFIG.wavelength[0], 4), 1 / Math.pow(SKY_CONFIG.wavelength[1], 4), 1 / Math.pow(SKY_CONFIG.wavelength[2], 4)) },
        }
    });

    shaderPass.update = function() {
        shaderPass.uniforms.tColor.value = multipleRenderTargets.getColorTexture();
        shaderPass.uniforms.tNormal.value = multipleRenderTargets.getNormalTexture();
        shaderPass.uniforms.tSurface.value = multipleRenderTargets.getSurfaceTexture();
        shaderPass.uniforms.tDepth.value = multipleRenderTargets.getDepthTexture();
        shaderPass.uniforms.v3LightPosition.value = sun.getSunDirection().normalize();
        shaderPass.uniforms.v3CameraPosition.value = mainCamera.getCamera().position;
        shaderPass.uniforms.uProjectionInverse.value = mainCamera.getCamera().projectionMatrixInverse;
        shaderPass.uniforms.uMatrixWorld.value = mainCamera.getCamera().matrixWorld;
    };

    return shaderPass;
}

export default LightingPass;
