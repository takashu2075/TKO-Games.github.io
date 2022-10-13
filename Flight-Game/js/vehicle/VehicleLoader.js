import Aircraft from "./Aircraft.js";
import { loadModel } from '../ModelLoader.js';
import { loadJson } from "../Utils.js";

export async function loadVehicle(vehicleId) {
    const config = await loadJson(`vehicle/${vehicleId}/config.json`);

    const meshes = await loadModel(`vehicle/${vehicleId}/${config.model}`);
    
    switch(config.type) {
        case 'aircraft':
            return new Aircraft(config, meshes);
        default:
            throw new Error(`The vehicle type is not supported: ${config.type}`);
    }
}
