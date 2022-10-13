
import Game from './Game.js';
import TitleScreen from './screen/TitleScreen.js';

export default class Menu {
    constructor() {
        this.canvas = document.getElementById('canvas-2d');
        this.context = this.canvas.getContext('2d');
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.previousScreen = null;
        this.currentScreen = null;

        this.loading = false;
        this.inGame = false;

        this.canvas.addEventListener('click', this.onClick.bind(this), false);
        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    }
    
    start() {
        this.openScreen(this.titleScreen);
        this.previousScreen = null;
        this.currentScreen = new TitleScreen(this);
        this.draw();
    }

    openScreen(screen) {
        this.previousScreen = this.currentScreen;
        this.currentScreen = screen;
    }

    draw() {
        if (this.inGame) {
            // this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            requestAnimationFrame(this.draw.bind(this));
            return;
        }

        if (this.previousScreen) this.previousScreen.draw();
        if (this.currentScreen) this.currentScreen.draw();

        requestAnimationFrame(this.draw.bind(this));
    }

    onClick() {
        if (this.currentScreen) this.currentScreen.onClick();
    }

    onKeyDown(e) {
        if (this.currentScreen) this.currentScreen.onKeyDown(e);
    }

    startGame() {
        if (this.loading) return;
        
        this.loading = true;
        console.log('inGame is now TRUE:' + this.inGame);
        const game = new Game('mission-1', function() {
            this.inGame = true;
            this.currentScreen = null;
            this.previousScreen = null;
        }.bind(this));
    }
}
