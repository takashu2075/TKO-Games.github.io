import * as THREE from './lib/three/build/three.module.js';

export default function Renderer(renderTargets) {
    const renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#canvas'),
		context: document.querySelector('#canvas').getContext('webgl2'),
        alpha: true,  /// <= これ
        sortObjects: true,
    });
    renderer.setRenderTarget(renderTargets ? renderTargets.getRenderTarget() : null);
    // renderer.setClearColor( 0x000000, 0 );
    // renderer.toneMappingExposure = Math.pow(0.1, 4.0);

    const canvas = document.getElementById('canvas');

    // const resize = function () {
    //     renderer.setPixelRatio(window.devicePixelRatio);
    //     // renderer.setSize(window.innerWidth, window.innerHeight);
    //     renderer.setSize(canvas.width, canvas.height);
    // };
    // window.addEventListener('resize', resize, false);
    // resize();

    this.renderToScreen = function(scene, mainCamera) {
        renderer.setRenderTarget(null);
        renderer.render(scene, mainCamera.getCamera());
    };

    this.render = function(renderTarget, scene, mainCamera) {
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, mainCamera.getCamera());
    };

    this.getRenderer = function() {
        return renderer;
    };

    this.setRenderTarget = function(renderTargets) {
        renderer.setRenderTarget(renderTargets ? renderTargets.getRenderTarget() : null);
    };
}
