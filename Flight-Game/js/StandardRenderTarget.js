import * as THREE from './lib/three/build/three.module.js';

export default function StandardRenderTarget() {
    const renderTarget = new THREE.WebGLRenderTarget(
        1280 * window.devicePixelRatio,
        720 * window.devicePixelRatio
    );

    this.getRenderTarget = function() {
        return renderTarget;
    };

    this.getColorTexture = function() {
        return renderTarget.texture;
    };

    this.getDepthTexture = function() {
        return renderTarget.depthTexture;
    };

    this.setColorTexture = function(colorTexture) {
        renderTarget.texture = colorTexture;
    };

    this.setDepthTexture = function(depthTexture) {
        renderTarget.depthTexture = depthTexture;
    };
}
