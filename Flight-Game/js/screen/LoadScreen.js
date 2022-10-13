
import Screen from './Screen.js';

export default class LoadScreen extends Screen {
    constructor(menu) {
        super(menu);
        
        this.components = [
            {
                type: 'text',
                value: 'Now loading...',
                size: 32,
                x: 800,
                y: 600,
            },
        ];
    }

    draw() {
        super.draw();

        this.context.beginPath();
        this.context.arc(1070, 590, 20, this.theta, this.theta + (Math.PI * 1.5), false);
        this.context.strokeStyle = `rgba(250, 250, 250, 1.0)`;
        this.context.stroke();
    }
}
