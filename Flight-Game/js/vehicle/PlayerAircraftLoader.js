import PlayerAircraft from "./PlayerAircraft.js";
import { loadModel } from '../ModelLoader.js';
import { loadJson } from "../Utils.js";

export async function loadPlayerAircraft(vehicleId, playerController) {
    const config = await loadJson(`vehicle/${vehicleId}/config.json`);

    const meshes = await loadModel(`vehicle/${vehicleId}/${config.model}`);
    
    return new PlayerAircraft(config, meshes, playerController);
}
