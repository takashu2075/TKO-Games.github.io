import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

const SKY_CONFIG = {
	Kr         : 0.0025,
	Km         : 0.0010,
	ESun       : 30.0,
	g          : -0.95,
	innerRadius: 100.0,
	outerRadius: 102.5,
	wavelength : [0.650, 0.570, 0.475],
	scaleDepth : 0.25,
};

function AtmospherePass(renderTargets, mainCamera, sun) {
    const shaderPass = new ShaderPass({
        vertexShader: `
            varying vec2 vUv;

            void main(void) {
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0);
            }
        `,
        fragmentShader: `
            const int nSamples = 1;
            const float fInvSamples = 1.0;
            const float fCameraScaleMultiplier = 0.005;
            // const float fScatterMultiplier = 1.0;
            const float scaleMultiplier = 0.025;
            const float fFalloffDist = 10.0;
            const float fFalloffIntensity = 0.8;

            const float fHeightDelta = 0.00005;
            // const float fHeightDelta = 0.005;
            
            uniform sampler2D tDiffuse;
            uniform sampler2D tColor;
            uniform sampler2D tNormal;
            uniform sampler2D tSurface;
            uniform sampler2D tDepth;
            uniform sampler2D tSky;

            uniform mat4 uProjectionInverse;
            uniform mat4 uMatrixWorld;

            uniform vec3 v3LightPosition;		// The direction vector to the light source
            uniform vec3 v3InvWavelength;		// 1 / pow(wavelength, 4) for the red, green, and blue channels
            uniform float fCameraHeight;		// The camera's current height
            uniform float fCameraHeight2;		// fCameraHeight^2
            uniform float fOuterRadius;			// The outer (atmosphere) radius
            uniform float fOuterRadius2;		// fOuterRadius^2
            uniform float fInnerRadius;			// The inner (planetary) radius
            uniform float fInnerRadius2;		// fInnerRadius^2
            uniform float fKrESun;				// Kr * ESun
            uniform float fKmESun;			    // Km * ESun
            uniform float fKr4PI;               // Kr * 4 * PI
            uniform float fKm4PI;               // Km * 4 * PI
            uniform float fScale;			    // 1 / (fOuterRadius - fInnerRadius) // 1 / (110 - 100) = 0.1
            uniform float fScaleDepth;		    // The scale depth (i.e. the altitude at which the atmosphere's average density is found) //0.25
            uniform float fScaleOverScaleDepth;	// fScale / fScaleDepth //0.4

            uniform float g;
            uniform float g2;
            uniform float fESun;

            uniform vec3 v3CameraPosition;

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

            vec3 czm_saturation(vec3 rgb, float adjustment) {
                // Algorithm from Chapter 16 of OpenGL Shading Language
                const vec3 W = vec3(0.2125, 0.7154, 0.0721);
                vec3 intensity = vec3(dot(rgb, W));
                return mix(intensity, rgb, adjustment);
            }

            float scale(float fCos) {
                float x = (1.0 - fCos);
                return fScaleDepth * exp(-0.00287 + x * (0.459 + x * (3.83 + x * (-6.80 + x * 5.25))));
            }

            void main(void) {
                // gl_FragColor = texture2D(tColor, vUv);
                // return;

                if (length(texture2D(tNormal, vUv)) != 0.0) {
                    float fNormalizedDepth = texture2D(tDepth, vUv).r;
                    vec3 v3Position = computeWorldPosition4(fNormalizedDepth);
                    v3Position /= 240.0;
                    v3Position.y += fInnerRadius;
                    vec3 cameraPosition = v3CameraPosition;
                    cameraPosition /= 240.0;
                    cameraPosition.y += fInnerRadius;
                    vec3 v3Ray = v3Position - cameraPosition;
                    vec2 vRay = vec2(v3Ray.x, v3Ray.z);
                    float fFar = length(v3Ray);
                    v3Ray /= fFar;

                    vec3 v3Start = cameraPosition;
                    float fHeight = v3Start.y;
                    // float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));
                    // float fDepth = 0.0;
                    // float fStartAngle = dot(v3Ray, v3Start) / fHeight;
                    // float fStartOffset = fDepth * scale(fStartAngle);

                    float fSampleLength = fFar * fInvSamples;
                    float fScaledLength = fSampleLength * fScale;
                    vec3 v3SampleRay = v3Ray * fSampleLength;
                    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;

                    vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);
                    vec3 v3EnvColor = vec3(0.0);
                    for(int i = 0; i < nSamples; i++) {
                        float fHeight = v3SamplePoint.y;
                        float fDepth = exp(fScaleOverScaleDepth * -(computeWorldPosition4(fNormalizedDepth).y * fHeightDelta));
                        // fDepth = 1.0;

                        float t = fScaleOverScaleDepth * (v3CameraPosition.y - computeWorldPosition4(fNormalizedDepth).y) * fHeightDelta;
			            float fDelta = (1.0 - exp(-t) ) / t;
                        // fDelta = 1.0;

                        float fLightAngle = dot(v3LightPosition, vec3(0.0, 1.0, 0.0)) / 1.0;

                        float fScatter = fDepth * length(v3Position - cameraPosition) * fCameraScaleMultiplier * fDelta + 1.0 * scale(fLightAngle);
                        // fScatter *= fDelta;
                        vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                        v3FrontColor += v3Attenuate * (fDepth * fScaledLength * scaleMultiplier) * fDelta;

                        float fEnvScatter = fDepth * fDelta * length(v3Position - cameraPosition) * fCameraScaleMultiplier + fDepth * fDelta * scale(1.0);
                        // fEnvScatter *= fScatterMultiplier;
                        vec3 v3EnvAttenuate = exp(-fEnvScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                        v3EnvColor = v3EnvAttenuate * fDepth * fDelta * fScaledLength * scaleMultiplier * (exp(-1.0 * scale(fLightAngle)) + 0.1);
                        v3FrontColor += v3EnvColor * 1.5;
                    }

                    vec3 secondaryColor = v3FrontColor * fKmESun;
                    vec3 color = v3FrontColor * (v3InvWavelength * fKrESun);

                    vec3 v3Direction = cameraPosition - v3Position;

                    float fCos = dot(v3LightPosition, v3Direction) / length(v3Direction);
                    float fRayleighPhase = 0.75 * (1.0 + fCos * fCos);
                    fRayleighPhase = 1.0;
                    float fMiePhase = 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + fCos * fCos) / pow(1.0 + g2 - 2.0 * g * fCos, 1.5);
                    fMiePhase = 0.0;

                    gl_FragColor.rgb = fRayleighPhase * color + fMiePhase * secondaryColor;

                    float fDepth = exp(fScaleOverScaleDepth * -(v3CameraPosition.y * fHeightDelta));
                    // fDepth = 1.0;
                    float fLightAngle = dot(v3LightPosition, vec3(0.0, 1.0, 0.0)) / 1.0;

                    float t = fScaleOverScaleDepth * (computeWorldPosition4(fNormalizedDepth) - v3CameraPosition).y * fHeightDelta;
                    float fDelta = (1.0 - exp(-t) ) / t;

                    float fSunScatter = fDepth * scale(fLightAngle) * fDelta;
                    vec3 v3SunAttenuate = exp(-fSunScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                    float fCameraScatter = fDepth * length(v3Position - cameraPosition) * fCameraScaleMultiplier * fDelta;
                    vec3 v3CameraAttenuate = exp(-fCameraScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                    float fDirectional = max(pow(dot(texture2D(tNormal, vUv).xyz, v3LightPosition) * 0.5 + 0.5, 2.0), 0.0);
                    // pow(NdotL*0.5 + 0.5, 2)
                    gl_FragColor.rgb = czm_saturation(gl_FragColor.rgb, 1.5);
                    
                    vec3 L = normalize(v3LightPosition);
                    vec3 V = normalize(v3CameraPosition - computeWorldPosition4(fNormalizedDepth));
                    vec3 H = normalize(L + V);
                    vec3 specular = pow(max(0.0, dot(H, texture2D(tNormal, vUv).xyz)), 50.0) * vec3(1.0, 1.0, 1.0);
                    // specular = vec3(0.0);

                    float fOcclusion =  (1.0 - texture2D(tDiffuse, vUv).r) * 0.0;
                    vec3 v3Occlusion =  (1.0 - texture2D(tDiffuse, vUv).rgb) * 2.0;

                    vec3 v3Color = (texture2D(tColor, vUv).rgb - fOcclusion);
                    // vec3 v3Color = v3Occlusion;

                    vec3 v3GroundColor = (v3Color * fDirectional * v3SunAttenuate * v3CameraAttenuate + (v3Color * 0.05) * v3CameraAttenuate) + 0.0;
                    
                    gl_FragColor.rgb += czm_saturation(v3GroundColor.rgb, 1.5);
                    gl_FragColor = 1.0 - exp(-1.0 * gl_FragColor);

                    vec3 v3Surface = (texture2D(tSurface, vUv).rgb - fOcclusion);
                    gl_FragColor.rgb += v3Color * v3Surface.b;

                    gl_FragColor.a = 1.0;
                } else {
                    gl_FragColor = texture2D(tColor, vUv);
                }
            }
        `,
        uniforms: {
			"tDiffuse": {
				type: "t",
				value: new THREE.Texture()
			},
			"tColor": {
				type: "t",
				value: renderTargets.getColorTexture()
			},
			"tNormal": {
				type: "t",
				value: renderTargets.getNormalTexture()
			},
			"tSurface": {
				type: "t",
				value: renderTargets.getSurfaceTexture()
			},
			"tDepth": {
				type: "t",
				value: renderTargets.getDepthTexture()
			},
			"tSky": {
				type: "t",
				value: new THREE.Texture()
			},
            "v3LightPosition": {
                value: new THREE.Vector3(1.0, 1.0, 1.0).normalize()
            },
            "v3InvWavelength": {
                value: new THREE.Vector3(1 / Math.pow(SKY_CONFIG.wavelength[0], 4), 1 / Math.pow(SKY_CONFIG.wavelength[1], 4), 1 / Math.pow(SKY_CONFIG.wavelength[2], 4))
            },
            "fCameraHeight": {
                value: 0.0
            },
            "fCameraHeight2": {
                value: 0.0
            },
            "fOuterRadius": {
                value: SKY_CONFIG.outerRadius
            },
            "fOuterRadius2": {
                value: SKY_CONFIG.outerRadius * SKY_CONFIG.outerRadius
            },
            "fInnerRadius": {
                value: SKY_CONFIG.innerRadius
            },
            "fInnerRadius2": {
                value: SKY_CONFIG.innerRadius * SKY_CONFIG.innerRadius
            },
            "fKrESun": {
                value: SKY_CONFIG.Kr * SKY_CONFIG.ESun
            },
            "fKmESun": {
                value: SKY_CONFIG.Km * SKY_CONFIG.ESun
            },
            "fESun": {
                value: SKY_CONFIG.ESun
            },
            "fKr4PI": {
                value: SKY_CONFIG.Kr * 4.0 * Math.PI
            },
            "fKm4PI": {
                value: SKY_CONFIG.Km * 4.0 * Math.PI
            },
            "fScale": {
                value: 1.0 / (SKY_CONFIG.outerRadius - SKY_CONFIG.innerRadius)
            },
            "fScaleDepth": {
                value: SKY_CONFIG.scaleDepth
            },
            "fScaleOverScaleDepth": {
                value: (1.0 / (SKY_CONFIG.outerRadius - SKY_CONFIG.innerRadius)) / SKY_CONFIG.scaleDepth
            },
            "g": {
                value: SKY_CONFIG.g
            },
            "g2": {
                value: SKY_CONFIG.g * SKY_CONFIG.g
            },
            "v3CameraPosition": {
                value: new THREE.Vector3(0.0, SKY_CONFIG.fInnerRadius, 0.0)
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
        shaderPass.uniforms.tColor.value = renderTargets.getColorTexture();
        shaderPass.uniforms.tNormal.value = renderTargets.getNormalTexture();
        shaderPass.uniforms.tSurface.value = renderTargets.getSurfaceTexture();
        shaderPass.uniforms.tDepth.value = renderTargets.getDepthTexture();
        shaderPass.uniforms.v3LightPosition.value = sun.getSunDirection().normalize();
        shaderPass.uniforms.v3CameraPosition.value = mainCamera.getCamera().position;
        shaderPass.uniforms.uProjectionInverse.value = mainCamera.getCamera().projectionMatrixInverse;
        shaderPass.uniforms.uMatrixWorld.value = mainCamera.getCamera().matrixWorld;
    };

    return shaderPass;
}

export default AtmospherePass;
