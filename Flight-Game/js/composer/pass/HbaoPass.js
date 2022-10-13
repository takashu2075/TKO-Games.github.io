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

function HbaoPass(renderTargets, mainCamera) {
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
            uniform sampler2D tDepth;
            uniform sampler2D tColor;

            varying vec2 vUv;

            //THIS NEEDS TO MATCH YOUR CAMERA SETTINGS---------------------
            uniform float zNear;  //Z-near
            uniform float zFar;   //Z-far
            uniform float fov;    //FoV
            //-------------------------------------------------------------


            //USER VARIABLES-----------------------------------------------
            float intensity = 0.1;            //Intensity of the AO effect

            bool useAttenuation = true;       //Applies attenuation to each AO sample, true = better quality, off = better performance
            float attenuationScale = 0.1;     //Depth scale of the attenuation, different values look better depending on your scene

            float angleBias = 0.3;            //Brightens up the AO effect. Higer values mean less noise but less accuracy

            bool noise = true;                //Use noise instead of pattern for sample dithering, much slower but EXTREMLY better looking
            const float noiseamount = 0.8;    //Per-Pixel noise amount, bigger values need more performance
            float jitterAmount = 0.5;         //Per-Sample noise amount, bigger values need more performance

            float lumInfluence = 0.5;         //Influence of the luminance on the AO effect
            vec3 aoColor = vec3(0.264, 0.531, 1.0) * 0.4; // Color of the AO effect

            bool onlyAO = true;                //Only show AO pass for debugging
            bool externalBlur = false;         //Store AO in alpha pass for a later blur

            float fogCutoff = 50.0;            // distance where AOu cuts off
            //-------------------------------------------------------------

            /*
            * TKO Parameters
            */
            const float fSampleRadius = 100.0;
            const int nSampleDirections = 4;
            const int nSampleSteps = 4;
            
            
            uniform float width;
            uniform float height;
            uniform float aspectratio;

            uniform float thfov;

            uniform float pW;
            uniform float pH;

            uniform mat4 uProjectionInverse;
            uniform mat4 uMatrixWorld;

            float TWO_PI = 6.283185307;

            float getLinearDepth(vec2 coord) {
                float zdepth = texture2D(tDepth, coord).r;
                return zFar * zNear / (zFar + zdepth * (zNear - zFar));
            }

            vec3 getViewVector(vec2 coord) {
                vec2 ndc = (coord * 2.0 - 1.0);
                return vec3(ndc.x * thfov, ndc.y * thfov / aspectratio, 1.0);
            }

            vec3 getViewPosition(vec2 coord) {
                return getViewVector(coord) * getLinearDepth(coord);
            }

            
            // vec3 getViewNormal(vec2 coord) {
            //     // return texture2D(tNormal, coord).rgb;
            //     vec3 v3Normal = (uMatrixWorld * vec4(texture2D(tNormal, coord).rgb, 0.0)).rgb;
            //     return normalize(v3Normal); 
            //     return v3Normal;            
            // }
            
            vec3 getViewNormal(vec2 coord){
                vec3 p1 = getViewPosition(coord+vec2(pW,0.0)).xyz;
                vec3 p2 = getViewPosition(coord+vec2(0.0,pH)).xyz;
                vec3 p3 = getViewPosition(coord+vec2(-pW,0.0)).xyz;
                vec3 p4 = getViewPosition(coord+vec2(0.0,-pH)).xyz;

                vec3 vP = getViewPosition(coord);

                vec3 dx = vP-p1;
                vec3 dy = p2-vP;
                vec3 dx2 = p3-vP;
                vec3 dy2 = vP-p4;

                if(length(dx2) < length(dx) && coord.x-pW >= 0.0 || coord.x+pW > 1.0) {
                    dx = dx2;
                }
                if(length(dy2) < length(dy) && coord.y-pH >= 0.0 || coord.y+pH > 1.0) {
                    dy = dy2;
                }

                return normalize(cross( dx , dy ));
            }

            float rand(vec2 co) {
                if (noise) {
                    return fract(sin(dot(co.xy,vec2(12.9898,78.233)*4.0)) * 43758.5453)*2.0-1.0;
                } else {
                    return ((fract(1.0-co.s*(width/2.0))*0.3)+(fract(co.t*(height/2.0))*0.6))*2.0-1.0;
                }
            }

            const vec2 noiseOffset2d = vec2(max(1.0 - noiseamount, 0.0), 0.0);

            vec2 rand2D(vec2 coord) {
                float noiseX = ((fract(1.0-coord.s*(width/2.0))*0.25)+(fract(coord.t*(height/2.0))*0.75))*2.0-1.0;
                float noiseY = ((fract(1.0-coord.s*(width/2.0))*0.75)+(fract(coord.t*(height/2.0))*0.25))*2.0-1.0;

                if (noise) {
                    noiseX = clamp(fract(sin(dot(coord ,vec2(12.9898,78.233))) * 43758.5453),0.0,1.0)*2.0-1.0;
                    noiseY = clamp(fract(sin(dot(coord ,vec2(12.9898,78.233)*2.0)) * 43758.5453),0.0,1.0)*2.0-1.0;
                }
                return (normalize(vec2(noiseX,noiseY)) * noiseamount) + noiseOffset2d;
            }

            mat4 getViewProjectionMatrix() {
                mat4 result;

                float frustumDepth = zFar - zNear;
                float oneOverDepth = 1.0 / frustumDepth;

                result[0][0] = 1.0 / thfov;
                result[1][1] = aspectratio * result[0][0];
                result[2][2] = zFar * oneOverDepth;
                result[2][3] = 1.0;
                result[3][2] = (-zFar * zNear) * oneOverDepth;

                return result;
            }

            vec2 ComputeFOVProjection(vec3 pos, mat4 VPM) {
                vec4 offset = vec4(pos, 1.0);
                offset = VPM * offset;
                offset.xy /= offset.w;
                return offset.xy * 0.5 + 0.5;
            }

            void main() {
                float fTheta = TWO_PI / float(nSampleDirections);
                float fCosTheta = cos(fTheta);
                float fSinTheta = sin(fTheta);
                mat2 mDeltaRotationMatrix = mat2(fCosTheta, -fSinTheta, fSinTheta, fCosTheta);

                vec2 vSampleNoise = normalize(rand2D(vUv));
                mat2 mRotationMatrix = mat2(vSampleNoise.x, -vSampleNoise.y, vSampleNoise.y, vSampleNoise.x);

                vec3 v3OriginPosition = getViewPosition(vUv);
                vec3 v3OriginNormal = getViewNormal(vUv);
                
                vec2 vSampleDirection = vec2(1.0, 0.0) * mRotationMatrix;

                float fTotalOcclusion = 0.0;
                float jitter = rand(vUv) * jitterAmount;
                
                float fSampleLength = fSampleRadius / float(nSampleSteps);

                for (int i = 0; i < nSampleDirections; i++) {
                    vSampleDirection *= mDeltaRotationMatrix;

                    vec2 sampleDirUV = vSampleDirection / 100.0; /// v3OriginPosition.z * vec2(20.0);
                    float oldAngle = angleBias;

                    float tmpOcclusion = 0.0;
                    vec2 v2OffsetNoise = mod(jitter + vec2(float(i) * 0.429, float(i) * 0.555), 1.0);
                    for (int j = 0; j < nSampleSteps; j++) {
                        vec2 vDeltaSample = 
                            vSampleDirection * 2.5 +
                            vSampleDirection * fSampleLength * mod(rand(vUv), 1.0) + 
                            vSampleDirection * fSampleLength * float(j);
                        
                        vec2 vSampleUV = vUv + vec2(vDeltaSample.x / width, vDeltaSample.y / height);
                        vec3 v3SamplePosition = getViewPosition(vSampleUV);
                        vec3 v3SampleNormal = normalize(v3SamplePosition - v3OriginPosition);

                        float fHorizonAngle = 1.570796326 - acos(dot(v3OriginNormal, v3SampleNormal));

                        if (fHorizonAngle > oldAngle) {
                            // float fTmpOcclusion = sin(fHorizonAngle) - sin(angleBias);
                            float fTmpOcclusion = sin(fHorizonAngle);

                            float attenuation = exp(-length(v3SamplePosition - v3OriginPosition) * (acos(0.0) - atan(length(v3OriginPosition))) * 10.0 );
                            fTmpOcclusion *= attenuation;

                            if (tmpOcclusion < fTmpOcclusion) {
                                tmpOcclusion = fTmpOcclusion;
                            }

                            oldAngle = fHorizonAngle;
                        }
                    }
                    fTotalOcclusion += tmpOcclusion;
                }
                
                fTotalOcclusion *= 0.8;

                float fFinalOcclusion = fTotalOcclusion / float(nSampleDirections);
                fFinalOcclusion = clamp(fFinalOcclusion, 0.0, 1.0);
                
                gl_FragColor.rgb = texture2D(tDiffuse, vUv).rgb - fFinalOcclusion;
                // gl_FragColor.rgb = vec3(v3OriginNormal);
                gl_FragColor.a = 1.0;
            }
        `,
        uniforms: {
            "tDiffuse": {
				type: "t",
				value: null
            },
            "tNormal": {
				type: "t",
				value: null
            },
            "tDepth": {
				type: "t",
				value: null
            },
            "width": {
                value: 0
            },
            "height": {
                value: 0
            },
            "aspectratio": {
                value: 0
            },
            "pW": {
                value: 0
            },
            "pH": {
                value: 0
            },
            "zNear": {
                value: 0
            },
            "zFar": {
                value: 0
            },
            "fov": {
                value: 0
            },
            "thfov": {
                value: 0
            },
            "uProjectionInverse": {
                value: new THREE.Matrix4()
            },
            "uMatrixWorld": {
                value: new THREE.Matrix4()
            },
        },
    });

    shaderPass.update = function() {
        const camera = mainCamera.getCamera();
        // const cameraRotMat = new THREE.Matrix4()
        // cameraRotMat.compose(new THREE.Vector3(0.0, 0.0, 0.0), camera.quaternion, new THREE.Vector3(1.0, 1.0, 1.0));
        // cameraRotMat.setRotationFromQuaternion( new THREE.Quaternion().copy(camera.quaternion) );
        // cameraRotMat.invert();

        shaderPass.uniforms.zNear.value = camera.near;
        shaderPass.uniforms.zFar.value = camera.far;
        shaderPass.uniforms.fov.value = camera.fov;
        shaderPass.uniforms.thfov.value = Math.tan(camera.fov * 0.0087266462597222)
        shaderPass.uniforms.width.value = 1280;
        shaderPass.uniforms.height.value = 720;
        shaderPass.uniforms.aspectratio.value = camera.aspect;
        shaderPass.uniforms.pW.value = 1.0 / 1280;
        shaderPass.uniforms.pH.value = 1.0 / 720;
        shaderPass.uniforms.tNormal.value = renderTargets.getNormalTexture();
        shaderPass.uniforms.tDepth.value = renderTargets.getDepthTexture();
        shaderPass.uniforms.uProjectionInverse.value = camera.projectionMatrixInverse;
        // shaderPass.uniforms.uMatrixWorld.value = cameraRotMat;
    }

    return shaderPass;
}

export default HbaoPass;
