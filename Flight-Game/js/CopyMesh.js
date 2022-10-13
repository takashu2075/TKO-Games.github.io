import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";
import StandardMaterial from "./StandardMaterial.js";

export default class TestMesh extends GameObject {
    constructor(size) {
        super();

        const material = new THREE.RawShaderMaterial({
            vertexShader: `
                attribute vec3 position;
                attribute vec2 uv;
                attribute vec2 offset;
    
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                
                uniform float fSize;
                
                varying vec2 vUv;
    
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    mvPosition.xy += offset * vec2(fSize);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                precision mediump float;
    
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                
                uniform sampler2D tColorTexture;
                uniform sampler2D tDepthTexture;
                
                varying vec2 vUv;
    
                void main() {
                    vec2 v2ScreenUv = gl_FragCoord.xy / vec2(1920.0, 1080.0);
                    vec4 v4BillboardColor = texture2D(tTexture, vUv);
                    float fAlpha = v4BillboardColor.r;
    
                    gl_FragColor.a = 1.0;
                    gl_FragColor.rgb = mix(texture2D(tColorTexture, v2ScreenUv).rgb, vec3(1.0, 1.0, 1.0), fAlpha);
                }
            `,
            uniforms: {
                tColorTexture: {
                    value: new THREE.Texture(),
                },
                tDepthTexture: {
                    value: new THREE.Texture(),
                },
                tTexture: {
                    value: texture,
                },
                fSize: {
                    value: size ? size : 1,
                },
            },
            transparent: true,
            // blending: THREE.AdditiveBlending,
            // depthWrite: false,
            // depthTest: false,
        });

        // const geometry = new THREE.PlaneGeometry(2500.0, 120.0, 20, 1);
    
        // const geometry = new THREE.BoxGeometry(10.0, 10.0, 10.0);
        const geometry = new THREE.PlaneGeometry(300.0);
        
        const material = new StandardMaterial();
    
        this.mesh = new THREE.Mesh(geometry, material);
    
        // this.mesh.position.set(500.0, 1500.0, -10000.0);
        // this.mesh.rotation.x = -Math.PI / 2;
    }
}
