import * as THREE from '../lib/three/build/three.module.js';
import { EffectComposer } from '../lib/three/examples/jsm/postprocessing/EffectComposer.js';
import LightingPass from './pass/LightingPass.js';
// import AtmospherePass from './pass/AtmospherePass.js';
import SkyPass from './pass/SkyPass.js';
import { UnrealBloomPass } from '../lib/three/examples/jsm/postprocessing/UnrealBloomPass.js';
// import CompositerPass from './pass/CompositerPass.js';
import HbaoPass from './pass/HbaoPass.js';
// import TransparentCompositerPass from './pass/TransparentCompositerPass.js';
// import WorleyNoisePass from './pass/WorleyNoisePass.js';
// import HbaoCompositerPass from './pass/HbaoCompositerPass.js';
// import { createTextureArray } from '../Utils.js';
// import MultipleRenderTargets from '../MultipleRenderTargets.js';

function Composer(renderer, multipleRenderTargets, transparentRenderTarget, skyRenderTarget, mainCamera, sun) {
    const composer = new EffectComposer(renderer.getRenderer());
    composer.renderToScreen = false;
    // composer.readBuffer = renderTargets;

    const shaderPasses = [];
    const addShaderPass = function(shaderPass) {
        shaderPasses.push(shaderPass);
        composer.addPass(shaderPass);
    }

    const lightingPass = new LightingPass(multipleRenderTargets, mainCamera, sun);
    addShaderPass(lightingPass);
    
    // const hbaoPass = new HbaoPass(multipleRenderTargets, mainCamera);
    // addShaderPass(hbaoPass);

    const skyPass = new SkyPass(multipleRenderTargets, skyRenderTarget, mainCamera);
    addShaderPass(skyPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(1280, 720),
        0.3,
        1.2,
        0.0,
    );
    addShaderPass(bloomPass);

    composer.setSize(1280, 720);

    // const transparentCompositerPass = new TransparentCompositerPass(multipleRenderTargets, transparentRenderTarget);
    // addShaderPass(transparentCompositerPass);

    // const atmospherePass = new AtmospherePass(multipleRenderTargets, mainCamera, sun);
    // addShaderPass(atmospherePass);

    // const transparentCompositerPass = new TransparentCompositerPass(multipleRenderTargets, transparentRenderTarget);
    // addShaderPass(transparentCompositerPass);

    // const worleyNoisePass = new WorleyNoisePass(multipleRenderTargets, mainCamera, sun);
    // addShaderPass(worleyNoisePass);

    this.update = function() {
        for (const shaderPass of shaderPasses) {
            if (shaderPass.update) shaderPass.update();
        }
    };

    this.render = function() {
        composer.render();
    };

    this.getComposer = function() {
        return composer;
    }

    this.getColorTexture = function() {
        return composer.readBuffer.texture;
    };
}

export default Composer;
