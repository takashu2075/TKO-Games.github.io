
export default class Screen {
    constructor(menu) {
        this.menu = menu;
        this.canvas = menu.canvas;
        this.context = menu.context;
        this.components = [];
        this.compAlpha = 0.0;
        this.backAlpha = 0.0;
        this.theta = 0.0;
        this.selectIndex = 0;

        this.currentComp = null;

        if (this.components.length != 0) {
            for (const comp of components) {
                if (comp.type == 'button') {
                    this.currentComp = comp;
                    break;
                } 
            }
        }

        this.lastScreen = null;
    }

    draw() {
        if (this.inGame) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            requestAnimationFrame(this.draw.bind(this));
            return;
        }

        this.compAlpha += 0.003;
        this.backAlpha += 0.003;
        this.theta = (this.theta + 0.03) % (Math.PI * 2);

        this.drawBackground();

        this.components.forEach(comp => {
            switch(comp.type) {
                case 'text':
                    this.drawText(comp);
                    break;
                case 'button':
                    this.drawButton(comp);
                    break;
                default:
                    break;
            }
        });
    }

    drawBackground() {
        const grad = this.context.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0.0, 'rgb(30, 36, 113)');
        grad.addColorStop(1.0, 'rgb(63, 72, 204)');

        this.context.beginPath();
        this.context.fillStyle = grad;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.fillStyle = `rgba(250, 250, 250, 1.0)`;
    }

    drawText(comp) {
        this.context.beginPath();
        this.context.font = `${comp.size ? comp.size : 18}px meiryo`;

        const fontSize = comp.size ? comp.size : 18;
        let x = 0;
        let y = 0;

        if (comp.center) {
            const textWidth = this.context.measureText(comp.value).width;
            x = (this.canvas.width - textWidth) / 2;
            y = this.canvas.height / 2 - fontSize / 2;
        } else if (comp.horizontalCenter) {
            const textWidth = this.context.measureText(comp.value).width;
            x = (this.canvas.width - textWidth) / 2;
        } else if (comp.verticalCenter) {
            y = this.canvas.height / 2 - fontSize / 2;
        }

        if (comp.x) {
            if (isNaN(comp.x)) {
                const ratio = new Number(comp.x.substring(0, comp.x.indexOf('%'))) / 100;
                x = this.canvas.width * ratio; 
            } else {
                x = comp.x;
            }
        }
        if (comp.y) {
            if (isNaN(comp.y)) {
                const ratio = new Number(comp.y.substring(0, comp.y.indexOf('%'))) / 100;
                y = this.canvas.height * ratio; 
            } else {
                y = comp.y;
            }
        }

        let alpha = 1.0;
        if (comp.fadeIn) alpha = this.compAlpha;
        if (comp.flash) alpha = (Math.sin(this.theta) + 1.0) / 4 + 0.5;

        this.context.fillStyle = `rgba(250, 250, 250, ${alpha})`;

        this.context.fillText(comp.value, x, y);
    }

    drawButton(comp) {
        this.context.beginPath();
        this.context.font = `${comp.size ? comp.size : 18}px meiryo`;

        const fontSize = comp.size ? comp.size : 18;
        let x = 0;
        let y = 0;

        if (comp.center) {
            const textWidth = this.context.measureText(comp.value).width;
            x = (this.canvas.width - textWidth) / 2;
            y = this.canvas.height / 2 - fontSize / 2;
        } else if (comp.horizontalCenter) {
            const textWidth = this.context.measureText(comp.value).width;
            x = (this.canvas.width - textWidth) / 2;
        } else if (comp.verticalCenter) {
            y = this.canvas.height / 2 - fontSize / 2;
        }

        if (comp.x) {
            if (isNaN(comp.x)) {
                const ratio = new Number(comp.x.substring(0, comp.x.indexOf('%'))) / 100;
                x = this.canvas.width * ratio; 
            } else {
                x = comp.x;
            }
        }
        if (comp.y) {
            if (isNaN(comp.y)) {
                const ratio = new Number(comp.y.substring(0, comp.y.indexOf('%'))) / 100;
                y = this.canvas.height * ratio; 
            } else {
                y = comp.y;
            }
        }

        let alpha = 1.0;
        if (comp.fadeIn) alpha = this.compAlpha;
        if (comp.flash) alpha = (Math.sin(this.theta) + 1.0) / 4 + 0.5;

        this.context.fillStyle = `rgba(250, 250, 250, ${alpha})`;

        this.context.fillText(comp.value, x, y);

        if (comp != this.currentComp) return;
        this.context.beginPath();
        this.context.rect(x - 15, y - fontSize - 10, this.context.measureText(comp.value).width + 30, fontSize + 30);
        this.context.strokeStyle = `rgba(250, 250, 250, 1.0)`;
        this.context.stroke();
    }


    onClick() {
        // do something
    }

    onKeyDown(e) {
        let currentIndex = 0;
        switch (e.key) {
            case 'ArrowUp':
                if (this.currentComp) currentIndex = this.components.indexOf(this.currentComp);
                for (let i = currentIndex; 0 <= i; i--) {
                    const comp = this.components[i];
                    if (comp.type == 'button' && comp != this.currentComp) {
                        this.currentComp = comp;
                        break;
                    }
                }
                break;
            case 'ArrowDown':
                if (this.currentComp) currentIndex = this.components.indexOf(this.currentComp);
                for (let i = currentIndex; i < this.components.length; i++) {
                    const comp = this.components[i];
                    if (comp.type == 'button' && comp != this.currentComp) {
                        this.currentComp = comp;
                        break;
                    }
                }
                break;
            case 'Enter':
            case ' ':
                if (this.currentComp) {
                    if (this.currentComp.onEnter) {
                        this.currentComp.onEnter();
                    }
                }
                break;
            case 'Escape':
                break;
        }
    }
}
