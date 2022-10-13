import GameObject from "../GameObject.js";

export default class TerrainTile extends GameObject {
    constructor(mesh, objects) {
        super();
        this.mesh = mesh;
        this.objects = objects;
    }
}
