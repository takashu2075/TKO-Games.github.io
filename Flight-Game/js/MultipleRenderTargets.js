import * as THREE from './lib/three/build/three.module.js';

const INDEX_COLOR_TEXTURE = 0;
const INDEX_NORMAL_TEXTURE = 1;
const INDEX_SURFACE_TEXTURE = 2;

const TEXTURES_LENGTH = 3;

function MultipleRenderTargets() {
    const multipleRenderTargets = new THREE.WebGLMultipleRenderTargets(
        1280 * window.devicePixelRatio, 
        720 * window.devicePixelRatio,
        TEXTURES_LENGTH
    );

    multipleRenderTargets.depthBuffer = true;
    multipleRenderTargets.depthTexture = new THREE.DepthTexture();
    multipleRenderTargets.depthTexture.type = THREE.FloatType;

    for (let i = 0; i < multipleRenderTargets.texture.length; i++) {
        multipleRenderTargets.texture[i].minFilter = THREE.NearestFilter;
        multipleRenderTargets.texture[i].magFilter = THREE.NearestFilter;
        multipleRenderTargets.texture[i].type = THREE.FloatType;
    }

    multipleRenderTargets.texture[INDEX_COLOR_TEXTURE].name = 'diffuse';
    multipleRenderTargets.texture[INDEX_NORMAL_TEXTURE].name = 'normal';
    multipleRenderTargets.texture[INDEX_SURFACE_TEXTURE].name = 'surface';
    // if (useUserDepth) {
    //     multipleRenderTargets.texture[INDEX_USER_DEPTH_TEXTURE].name = 'depth';
    // }

    // const resize = function () {
    //     const pixelRatio = window.devicePixelRatio;
    //     multipleRenderTargets.setSize(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio);
    // };
    // window.addEventListener('resize', resize, false);

    this.getRenderTarget = function() {
        return multipleRenderTargets;
    };

    this.getDepthTexture = function() {
        return multipleRenderTargets.depthTexture;
    };

    this.getColorTexture = function() {
        return multipleRenderTargets.texture[INDEX_COLOR_TEXTURE];
    };

    this.getNormalTexture = function() {
        return multipleRenderTargets.texture[INDEX_NORMAL_TEXTURE];
    };

    this.getSurfaceTexture = function() {
        return multipleRenderTargets.texture[INDEX_SURFACE_TEXTURE];
    };
}

export default MultipleRenderTargets;