import Scenario from "./Scenario.js";
import { loadJson } from "../Utils.js";

export async function loadScenario(scenarioId) {
    const config = await loadJson(`scenario/${scenarioId}.json`);

    const scenario = new Scenario();

    scenario.setPlayerAircraft(config.playerAircraft);

    scenario.setTerrain(config.terrain);
    scenario.setWeather(config.weather);
    scenario.setTime(config.time);
    
    for (const vehicle of config.vehicles) {
        scenario.addVehicle(vehicle);
    }

    for (const unit of config.units) {
        scenario.addUnit(unit);
    }

    for (const event of config.events) {
        scenario.addEvent(event);
    }
    
    scenario.setInitialEvent(config.initialEvent);

    return scenario;
}
