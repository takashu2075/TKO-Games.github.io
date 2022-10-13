import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

const SKY_CONFIG = {
	Kr         : 0.0030,
	Km         : 0.0010,
	ESun       : 50.0,
	g          : -0.80,
	innerRadius: 1000000,
	outerRadius: 1025000,
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
            uniform sampler2D tDiffuse;
            uniform sampler2D tColor;
            uniform sampler2D tDepth;
            uniform sampler2D tNormal;

            uniform mat4 uProjectionInverse;
            uniform mat4 uMatrixWorld;


            uniform vec3 v3CameraPosition;
            uniform vec3 v3LightPos;		    // The direction vector to the light source
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
            
            const int nSamples = 4;
            const float fSamples = 4.0;

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
                float fScaleFactor = (fOuterRadius - fInnerRadius);

                float fNormalizedDepth = texture2D(tDepth, vUv).r;
                vec3 v3Pos = computeWorldPosition4(fNormalizedDepth);
                v3Pos.y += fInnerRadius;

                vec3 v3CameraPos = v3CameraPosition;
                v3CameraPos.y += fInnerRadius;

                // Get the ray from the camera to the vertex, and its length (which is the far point of the ray passing through the atmosphere)
                vec3 v3Ray = v3Pos - v3CameraPos;
                float fFar = length(v3Ray);
                v3Ray /= fFar;

                // Calculate the ray's starting position, then calculate its scattering offset
                vec3 v3Start = v3CameraPos;
                float fHeight = v3Start.y;
                float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));
                // float fStartAngle = dot(v3Ray, v3Start) / fHeight;
                // float fStartOffset = fDepth * scale(fStartAngle);

                // Initialize the scattering loop variables
                float fSampleLength = fFar / fSamples;
                float fScaledLength = fSampleLength * fScale;
                vec3 v3SampleRay = v3Ray * fSampleLength;
                vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;

                // Now loop through the sample rays
                vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);
                for (int i = 0; i < nSamples; i++) {
                    float fHeight = v3SamplePoint.y;
                    float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));
                    float fLightAngle = dot(v3LightPos, vec3(0.0, fHeight, 0.0)) / fHeight;
                    float fCameraAngle = dot(v3Ray, vec3(0.0, fHeight, 0.0)) / fHeight;

                    // float fScatter = (fStartOffset + fDepth * (scale(fLightAngle) - scale(fCameraAngle)));
                    float t = fScaleOverScaleDepth * (v3CameraPos.y - v3SamplePoint.y);
                    float fDelta = (1.0 - exp(-t) ) / t;
                    float fScatter = fDepth * scale(fLightAngle) + fDepth * fScaleDepth * length(v3CameraPos - v3SamplePoint) * fDelta * 0.0002;

                    vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                    v3FrontColor += v3Attenuate * (fDepth * fScaledLength);
                    v3SamplePoint += v3SampleRay;
                }

                vec3 frontSecondaryColor = v3FrontColor * fKmESun;
                vec3 frontColor = v3FrontColor * (v3InvWavelength * fKrESun);

                gl_FragColor.rgb = frontColor + frontSecondaryColor;

                if (length(texture2D(tNormal, vUv)) == 0.0) {
                    gl_FragColor.rgb = texture2D(tDiffuse, vUv).rgb;
                } else {
                    float fGroundDepth = exp(fScaleOverScaleDepth * (fInnerRadius - v3Pos.y));
                    float fLightAngle = dot(v3LightPos, vec3(0.0, 1.0, 0.0)) / 1.0;
                    float fGroundScatter = fGroundDepth * scale(fLightAngle);
                    vec3 v3GroundAttenuate = exp(-fGroundScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                    vec3 v3GroundColor = texture2D(tDiffuse, vUv).rgb * v3GroundAttenuate;

                    float t = fScaleOverScaleDepth * (v3CameraPos.y - v3Pos.y);
                    float fHeightDelta = (1.0 - exp(-t) ) / t;
                    float fScatter = fGroundDepth * fFar * fScaleDepth * fHeightDelta * 0.0002;
                    vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                    gl_FragColor.rgb += v3GroundColor * v3Attenuate;

                    gl_FragColor.rgb = 1.0 - exp(-1.0 * gl_FragColor.rgb);
                    gl_FragColor.rgb = czm_saturation(gl_FragColor.rgb, 1.5);
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
            "v3LightPos": {
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
        // shaderPass.uniforms.tSurface.value = renderTargets.getSurfaceTexture();
        shaderPass.uniforms.tDepth.value = renderTargets.getDepthTexture();
        shaderPass.uniforms.v3LightPos.value = sun.getSunDirection().normalize();
        shaderPass.uniforms.v3CameraPosition.value = mainCamera.getCamera().position;
        shaderPass.uniforms.uProjectionInverse.value = mainCamera.getCamera().projectionMatrixInverse;
        shaderPass.uniforms.uMatrixWorld.value = mainCamera.getCamera().matrixWorld;
    };

    return shaderPass;
}

export default AtmospherePass;
