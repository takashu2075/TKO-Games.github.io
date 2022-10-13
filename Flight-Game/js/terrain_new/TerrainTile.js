import GameObject from "../GameObject.js";
import { convGeometry2Mesh, convGeometry2Heightfield } from "../Utils.js";

export default class TerrainTile extends GameObject {
    constructor(config, mesh) {
        super();
        this.config = config;
        this.mesh = mesh;
        
        // this.shape = convGeometry2Mesh(mesh.geometry);
        this.shape = convGeometry2Heightfield(mesh.geometry);
    }
}
