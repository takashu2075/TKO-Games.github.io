
import ModeSelect from './ModeSelect.js';
import Screen from './Screen.js';

export default class TitleScreen extends Screen {
    constructor(menu) {
        super(menu);
        
        this.components = [
            {
                type: 'text',
                value: 'Flight Game 2022',
                center: true,
                size: 50,
                fadeIn: true,
            },
            {
                type: 'text',
                value: 'Press any button to start',
                horizontalCenter: true,
                y: '80%',
                size: 18,
                flash: true,
            },
        ];

        // this.canvas.addEventListener('click', this.openLoadScreen.bind(this));
    }

    onKeyDown(e) {
        this.menu.openScreen(new ModeSelect(this.menu));
    }

    onClick() {
        // this.menu.openScreen(new LoadScreen(this.menu));
        // this.menu.startGame();
        this.menu.openScreen(new ModeSelect(this.menu));
    }
}
