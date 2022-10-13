import * as THREE from './lib/three/build/three.module.js';
import GameObject from "./GameObject.js";
import StandardMaterial from "./StandardMaterial.js";

export default class ColorDepthCopyMesh extends GameObject {
    constructor(size) {
        super();

        const material = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tColorTexture;
                uniform sampler2D tDepthTexture;

                varying vec2 vUv;
                
                void main() {
                    gl_FragColor = texture2D(tColorTexture, vUv);
                    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                    gl_FragDepth = texture2D(tDepthTexture, vUv).r;
                }
            `,
            uniforms: {
                tColorTexture: {
                    value: new THREE.Texture(),
                },
                tDepthTexture: {
                    value: new THREE.Texture(),
                },
            },
            // depthWrite: false,
        });
        const geometry = new THREE.PlaneBufferGeometry(2, 2);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.renderOrder = -1;
        this.mesh.frustumCulled = false;
    }

    setColorTexture(colorTexture) {
        this.mesh.material.uniforms.tColorTexture.value = colorTexture;
    }

    setDepthTexture(depthTexture) {
        this.mesh.material.uniforms.tDepthTexture.value = depthTexture;
    }
}
