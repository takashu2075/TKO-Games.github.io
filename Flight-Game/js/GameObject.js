export default class GameObject {
    constructor() {
        this.mesh = null;
        this.transparentMesh = null;
        this.body = null;

        this.meshes = [];
        this.bodies = [];

        this.damage = 0.0;
        this.toDestroy = false;
    }

    getMesh() {
        return this.mesh;
    }

    getTransparentMesh() {
        return this.transparentMesh;
    }

    getBody() {
        return this.body; 
    }

    getMeshes() {
        return this.meshes;
    }

    getBodies() {
        return this.bodies; 
    }

    update(game) {
        if (this.toDestroy) {
            this.destroy();
        }
    }

    beforeRender(game) {
        
    }

    destroy() {
        if (this.game) {
            this.game.removeGameObject(this);
        }
    }
}
