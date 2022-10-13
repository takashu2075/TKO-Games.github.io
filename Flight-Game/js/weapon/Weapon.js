import * as THREE from './../lib/three/build/three.module.js';
import * as CANNON from '../lib/cannon-es/dist/cannon-es.js';
// import Vehicle from './Vehicle.js';
import GameObject from '../GameObject.js';
import { loadJson, loadTexture, loadObjFile } from "../Utils.js";
import { loadModel } from '../ModelLoader.js';
import PlayerController from '../PlayerController.js';

const CONFIG_FILE_NAME = "config.json";

export default class Weapon extends GameObject {
    constructor(mesh, shooter) {
        super();

        this.mesh = mesh;
        this.shooter = shooter;
        
        this.damage = 0.0;
        this.shooter = null;
        this.body = new CANNON.Body();
        this.body.addEventListener('collide', function(event) {
            this.destroy();
        }.bind(this));
    }
}
