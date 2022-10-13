import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";

const SKY_DOME_RADIUS = 5000;
const SKY_DOME_DIVISION = 100;

const SKY_CONFIG = {
	Kr         : 0.0030,
	Km         : 0.0010,
	ESun       : 20.0,
	g          : -0.80,
	innerRadius: SKY_DOME_RADIUS,
	outerRadius: SKY_DOME_RADIUS * 1.025,
	wavelength : [0.650, 0.570, 0.475],
	scaleDepth : 0.25,
};

class Sky extends GameObject {
    constructor(sun, mainCamera) {
        super();

        this.sun = sun;
        this.mainCamera = mainCamera;

        const geometry = new THREE.SphereGeometry(
            SKY_CONFIG.outerRadius, SKY_DOME_DIVISION, SKY_DOME_DIVISION);
        
        const material = new THREE.RawShaderMaterial({
            vertexShader: `
                layout(location = 0) in vec3 position;
                layout(location = 1) in vec3 normal;
                layout(location = 2) in vec2 uv;
    
                const int nSamples = 4;
                const float fInvSamples = 0.25;
                
                uniform vec3 cameraPosition;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat3 normalMatrix;
    
                uniform sampler2D depthTexture;
                uniform float near;
                uniform float far;
    
                uniform vec3 v3LightPosition;		// The direction vector to the light source
                uniform vec3 v3InvWavelength;		// 1 / pow(wavelength, 4) for the red, green, and blue channels
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
    
                uniform vec3 v3MeshPosition;
                
                const float PI  = 3.141592653589793;
    
                out vec3 color;
                out vec3 secondaryColor;
                out vec3 v3Direction;
                out vec3 color2;
                out vec3 secondaryColor2;
                out float vHorizonAngle;
                out vec3 vPosition;
                out vec3 vCameraPosition;
    
                out vec2 vUv;
    
                float scale(float fCos) {
                    float x = (1.0 - fCos);
                    return fScaleDepth * exp(-0.00287 + x * (0.459 + x * (3.83 + x * (-6.80 + x * 5.25))));
                }

                vec3 getFrontColor(vec3 v3Position, vec3 v3CameraPosition) {
                    vec3 v3Ray = v3Position - v3CameraPosition;
                    float fFar = length(v3Ray);
                    v3Ray /= fFar;
    
                    vec3 v3Start = v3CameraPosition;
                    float fHeight = length(v3Start);
                    float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));
                    float fStartAngle = dot(v3Ray, v3Start) / fHeight;
                    float fStartOffset = fDepth * scale(fStartAngle);
    
                    float fSampleLength = fFar * fInvSamples;
                    float fScaledLength = fSampleLength * fScale;
                    vec3 v3SampleRay = v3Ray * fSampleLength;
                    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;
    
                    vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);
                    for(int i = 0; i < nSamples; i++) {
                        float fHeight = length(v3SamplePoint);
                        float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));
                        float fLightAngle = dot(v3LightPosition, v3SamplePoint) / fHeight;
    
                        float fCameraAngle = dot(v3Ray, v3SamplePoint) / fHeight;
    
                        float fScatter = (fStartOffset - fDepth * scale(fCameraAngle)) + fDepth * scale(fLightAngle);
                        vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));
    
                        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);
    
                        float fEnvScatter = fStartOffset - fDepth * scale(fCameraAngle) + fDepth * scale(1.0);
                        vec3 v3EnvAttenuate = exp(-fEnvScatter * (v3InvWavelength * fKr4PI + fKm4PI));
                        vec3 v3EnvColor = v3EnvAttenuate * fDepth * fScaledLength * (exp(-fDepth * scale(fLightAngle)) + 0.1);
                        v3FrontColor += v3EnvColor * 1.5;
    
                        v3SamplePoint += v3SampleRay;
                    }

                    return v3FrontColor;
                }
    
                void main(void) {
                    vec3 v3Position = position;
                    vec3 v3CameraPosition = cameraPosition - v3MeshPosition;

                    vPosition = position;
                    vCameraPosition = v3CameraPosition;

                    vec3 v3FrontColor = getFrontColor(v3Position, v3CameraPosition);
                    secondaryColor.rgb = v3FrontColor * fKmESun;
                    color.rgb = v3FrontColor * (v3InvWavelength * fKrESun);

                        vHorizonAngle = -acos(fInnerRadius / v3CameraPosition.y);
                    
                        v3CameraPosition = vec3(0.0, fInnerRadius, 0.0);

                        vec2 v2LightDirection = normalize(vec2(v3LightPosition.x, v3LightPosition.z));
                        float temp = fOuterRadius * cos(fInnerRadius / fOuterRadius);
                        vec3 v3Vec = normalize(vec3(v2LightDirection.y * temp, fInnerRadius, -v2LightDirection.x * temp));
                        v3Vec *= fOuterRadius;
                        v3Vec *= cos(fInnerRadius / fOuterRadius);
                        v3Position = vec3(v3Vec.x, fInnerRadius, v3Vec.z);

                        vec3 v3FrontColor2 = getFrontColor(v3Position, v3CameraPosition);
                        secondaryColor2.rgb = v3FrontColor2 * fKmESun;
                        color2.rgb = v3FrontColor2 * (v3InvWavelength * fKrESun);
    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    v3Direction = v3CameraPosition - position;

                    vUv = (gl_Position.xy) * 0.5 + 0.5;
                }
            `,
            fragmentShader: `
                precision highp float;
                precision highp int;
    
                in vec3 color;
                in vec3 secondaryColor;
                in vec3 v3Direction;
                in vec3 color2;
                in vec3 secondaryColor2;
                in float vHorizonAngle;
                in vec3 vPosition;
                in vec3 vCameraPosition;
    
                in vec2 vUv;
    
                uniform sampler2D tColor;
                uniform sampler2D tNormal;
                uniform sampler2D tDepth;
    
                uniform float nWindowWidth;
                uniform float nWindowHeight;
    
                uniform vec3 v3LightPosition;
                uniform vec3 cameraPosition;
                uniform float g;
                uniform float g2;
                uniform float fESun;
    
                layout(location = 0) out vec4 gColor;
                layout(location = 1) out vec4 gNormal;
                layout(location = 2) out vec4 gSurface;
    
                vec3 czm_saturation(vec3 rgb, float adjustment) {
                    // Algorithm from Chapter 16 of OpenGL Shading Language
                    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
                    vec3 intensity = vec3(dot(rgb, W));
                    return mix(intensity, rgb, adjustment);
                }
    
                float getRayleighPhase(float fCos2) {
                    // return 0.75 + 0.75 * fCos2;
                    // returm 0.75 * (1.0 + fCos * fCos);
                    return 1.0;
                }
    
                float getMiePhase(float fCos, float fCos2, float g, float g2) {
                    return 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + fCos2) / pow(1.0 + g2 - 2.0 * g * fCos, 1.5);
                }
    
                void main (void) {
                    float fCos = dot(v3LightPosition, v3Direction) / length(v3Direction);
                    float fCos2 = fCos * fCos;
                    float fRayleighPhase = getRayleighPhase(fCos2);
                    float fMiePhase = getMiePhase(fCos, fCos2, g, g2);
    
                    vec3 v3SkyColor1 = fRayleighPhase * color + fMiePhase * secondaryColor;
                    v3SkyColor1 = 1.0 - exp(-1.0 * (v3SkyColor1));
                    vec3 v3SkyColor2 = fRayleighPhase * color2;
                    v3SkyColor2 = 1.0 - exp(-1.0 * (v3SkyColor2));
    
                    vec3 v3Ray = vPosition - vCameraPosition;
                    v3Ray = normalize(v3Ray);
                    float fViewAngle = dot(v3Ray, vCameraPosition) / length(vCameraPosition.y);

                    vec3 v3SkyColor = vec3(0.0, 0.0, 0.0);
                    float alpha = (exp(-fViewAngle + vHorizonAngle) - 1.0) * 20.0;
                    alpha = max(0.0, alpha);
                    alpha = min(1.0, alpha);

                    v3SkyColor = mix(
                        v3SkyColor1, 
                        v3SkyColor2,
                        alpha
                    );
                    
                    if (fViewAngle < vHorizonAngle - 0.05) {
                        v3SkyColor = v3SkyColor2;
                    }

                    // v3SkyColor = 1.0 - exp(-1.0 * (v3SkyColor));
                    v3SkyColor = czm_saturation(v3SkyColor, 1.5);
    
                    vec2 v2Uv = gl_FragCoord.xy / vec2(nWindowWidth, nWindowHeight);
                    gColor = vec4(v3SkyColor, 1.0);
                    gNormal = vec4(0.0);
                    gSurface = vec4(1.0);
                }
            `,
            uniforms: {
                "tColor": {
                    type: "t",
                    value: new THREE.Texture()
                },
                "tNormal": {
                    type: "t",
                    value: new THREE.Texture()
                },
                "tDepth": {
                    type: "t",
                    value: new THREE.Texture()
                },
                "nWindowWidth": {
                    value: 0
                },
                "nWindowHeight": {
                    value: 0
                },
                "v3LightPosition": {
                    value: new THREE.Vector3(1.0, 1.0, 1.0).normalize()
                },
                "v3InvWavelength": {
                    value: new THREE.Vector3(
                        1 / Math.pow(SKY_CONFIG.wavelength[0], 4),
                        1 / Math.pow(SKY_CONFIG.wavelength[1], 4),
                        1 / Math.pow(SKY_CONFIG.wavelength[2], 4)
                    )
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
                "v3MeshPosition": {
                    value: new THREE.Vector3()
                },
            },
            glslVersion: THREE.GLSL3,
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: false,
        });
    
        this.skyMesh = new THREE.Mesh(geometry, material);
        this.skyMesh.renderOrder = -2;
        this.skyMesh.onBeforeRender = function( renderer, scene, camera, geometry, material, group ) {
            // material.uniforms.tColor.value = multipleRenderTargets.getDiffuseTexture().clone();
            // material.uniforms.tNormal.value = multipleRenderTargets.getNormalTexture().clone();
            // material.uniforms.tDepth.value = multipleRenderTargets.getRenderTarget().depthTexture.clone();
            // material.uniforms.v3MeshPosition = this.skyMesh.position;
            // material.uniforms.nWindowWidth.value = 1280;
            // material.uniforms.nWindowHeight.value = 720;
        }

    }

    update = function() {
        // this.skyMesh.position.x = this.mainCamera.getCamera().position.x;
        // this.skyMesh.position.y = this.mainCamera.getCamera().position.y - SKY_CONFIG.innerRadius - this.mainCamera.getCamera().position.y * 0.003;
        // this.skyMesh.position.z = this.mainCamera.getCamera().position.z;
        
        // this.skyMesh.material.uniforms.v3LightPosition.value = this.sun.getSunDirection().normalize();

        // this.skyMesh.material.uniforms.nWindowWidth.value = window.innerWidth;
        // this.skyMesh.material.uniforms.nWindowHeight.value = window.innerHeight;
        // this.skyMesh.material.uniforms.v3MeshPosition.value = new THREE.Vector3(this.skyMesh.position.x, this.skyMesh.position.y, this.skyMesh.position.z);

        // material.uniforms.tColor.value = multipleRenderTargets.getDiffuseTexture();
        // material.uniforms.tNormal.value = multipleRenderTargets.getNormalTexture();
        // material.uniforms.tDepth.value = multipleRenderTargets.getRenderTarget().depthTexture;

        // material.uniforms.tColor.value = multipleRenderTargets.getDiffuseTexture().clone();
        // material.uniforms.tNormal.value = multipleRenderTargets.getNormalTexture().clone();
        // material.uniforms.tDepth.value = multipleRenderTargets.getRenderTarget().depthTexture.clone();
    }

    beforeRender = function() {
        this.skyMesh.position.x = this.mainCamera.getCamera().position.x;
        this.skyMesh.position.y = this.mainCamera.getCamera().position.y - SKY_CONFIG.innerRadius 
                - this.mainCamera.getCamera().position.y * ((SKY_CONFIG.outerRadius - SKY_CONFIG.innerRadius) / 100000);
        // this.skyMesh.position.y = -SKY_CONFIG.innerRadius;
        this.skyMesh.position.z = this.mainCamera.getCamera().position.z;
        
        this.skyMesh.material.uniforms.v3LightPosition.value = this.sun.getSunDirection().normalize();

        this.skyMesh.material.uniforms.nWindowWidth.value = 1280;
        this.skyMesh.material.uniforms.nWindowHeight.value = 720;
        this.skyMesh.material.uniforms.v3MeshPosition.value = new THREE.Vector3(this.skyMesh.position.x, this.skyMesh.position.y, this.skyMesh.position.z);
    }

    setHeightMap = function(heightMap) {
        // material.uniforms.tColor.value = heightMap;
    }
}

export default Sky;