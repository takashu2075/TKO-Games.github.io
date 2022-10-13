function TerrainMaterial(terrainConfig, materialConfig, colorTexture, maskTexture, noiseTexture, terrainObjects) {
    this.getTerrainObjects = function() {
        return terrainObjects;
    };

    this.getColorTexture = function() {
        return colorTexture;
    };

    this.getMaskTexture = function() {
        return maskTexture;
    };

    this.getConfig = function() {
        return materialConfig;
    };
}

export default TerrainMaterial;
