
import Screen from './Screen.js';
import LoadScreen from './LoadScreen.js';
import MissionSelect from './MissionSelect.js';

export default class ModeSelect extends Screen {
    constructor(menu) {
        super(menu);

        const self = this;
        
        this.components = [
            {
                type: 'button',
                value: 'Campaign',
                size: 32,
                x: 100,
                y: 200,
                onEnter: function() {
                    self.startGame();
                    // self.menu.openScreen(new MissionSelect(self.menu));
                },
            },
            {
                type: 'button',
                value: 'Multiplayer',
                size: 32,
                x: 100,
                y: 300,
            },
            {
                type: 'button',
                value: 'Options',
                size: 32,
                x: 100,
                y: 400,
            },
        ];
    }

    // draw() {
    //     super.draw();

    //     this.context.beginPath();
    //     this.context.arc(1070, 590, 20, this.theta, this.theta + (Math.PI * 1.5), false);
    //     this.context.strokeStyle = `rgba(250, 250, 250, 1.0)`;
    //     this.context.stroke();
    // }

    onClick() {
        // console.log('LoadScreen clicked');
        // super.onClick();
        // this.menu.startGame();
    }

    startGame() {
        this.menu.openScreen(new LoadScreen(this.menu));
        this.menu.startGame();
    }


}
