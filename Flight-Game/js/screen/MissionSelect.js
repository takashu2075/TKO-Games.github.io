
import Screen from './Screen.js';
import { missions } from '../Missions.js'; 

export default class MissionSelect extends Screen {
    constructor(menu) {
        super(menu);
        
        // this.components = [
        //     {
        //         type: 'text',
        //         value: 'Now loading...',
        //         size: 32,
        //         x: 800,
        //         y: 600,
        //     },
        // ];

        this.components = [];

        for (let i = 0; i < 10; i++) {
            if (!missions[i]) break;

            this.components.push({
                type: 'button',
                value: missions[i],
                size: 32,
                x: 128,
                y: 96 + 64 * i,
            });
        }
    }

    draw() {
        super.draw();

        // this.context.beginPath();
        // this.context.arc(1070, 590, 20, this.theta, this.theta + (Math.PI * 1.5), false);
        // this.context.strokeStyle = `rgba(250, 250, 250, 1.0)`;
        // this.context.stroke();
    }
}
