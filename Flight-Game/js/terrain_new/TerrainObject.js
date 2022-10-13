import GameObject from "../GameObject.js";

export default class TerrainObject extends GameObject {
    constructor(config, mesh) {
        super();
        this.config = config;
        this.mesh = mesh;
    }
}
