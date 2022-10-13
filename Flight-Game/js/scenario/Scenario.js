import GameObject from "../GameObject.js";

export default class Scenario extends GameObject {
    constructor() {
        super();

        this.playerAircraft = null;

        this.terrain = null;
        this.weather = null;
        this.time = null;
    
        this.player = null;
    
        this.vehicles = [];
        this.units = [];
        this.events = [];
    
        this.initialEvent = null;
    }

    setPlayerAircraft = function(playerAircraft) {
        this.playerAircraft = playerAircraft;
    };

    getPlayerAircraft = function() {
        return this.playerAircraft;
    };

    setTerrain = function(terrain) {
        this.terrain = terrain;
    };

    getTerrain = function() {
        return this.terrain;
    };

    setWeather = function(weather) {
        this.weather = weather;
    };

    getWeather = function() {
        return this.weather;
    };

    setTime = function(time) {
        this.time = time;
    };

    getTime = function() {
        return this.time;
    };

    addVehicle = function(vehicle) {
        this.vehicles.push(vehicle);
    };

    getVehicles = function() {
        return this.vehicles;
    };

    addUnit = function(unit) {
        this.units.push(unit);
    };

    getUnits = function() {
        return this.units;
    };

    addEvent = function(event) {
        this.events.push(event);
    };

    getEvents = function() {
        return this.events;
    };

    setInitialEvent = function(initialEvent) {
        this.initialEvent = initialEvent;
    };

    getInitialEvent = function() {
        return this.initialEvent;
    };

    update = function() {
        for (const event of this.events) {
            event.update();
        }
    };
}
