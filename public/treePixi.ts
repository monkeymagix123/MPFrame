import { Application, Assets, Sprite } from "pixi.js";

let app: Application;

const treeArea = document.getElementById('tree-area') as HTMLElement;
const treeElement = document.getElementById('skill-tree') as HTMLDivElement;

let hasInitTree: boolean = false;

export function drawTree() {
    treeArea.classList.remove('hidden');

    if (!hasInitTree) {
        initTreeUI();
        hasInitTree = true;
        return;
    }
}

function initTreeUI() {
    app = new Application();

    console.log(treeElement.className);

    if (!treeElement) {
        console.error('Tree element not found');
    }

    (async () => {
        // Intialize the application.
        await app.init({
            backgroundAlpha: 0,
            resizeTo: treeElement,
        });

        // Then adding the application's canvas to the DOM body.
        treeElement.appendChild(app.canvas);

        const texture = await Assets.load('https://pixijs.com/assets/bunny.png');

        // 2. Create the Sprite using the texture
        const bunny = new Sprite(texture);

        // 3. Set properties (position, scale)
        bunny.x = app.screen.width / 2;
        bunny.y = app.screen.height / 2;
        bunny.anchor.set(0.5); // Center the anchor point for easy positioning

        // 4. Add the sprite to the stage (the root container)
        app.stage.addChild(bunny);
        
        // 5. You can even animate it using the PIXI ticker!
        app.ticker.add((time) => {
            bunny.rotation += 0.1 * time.deltaTime; // Rotate the bunny
        });
    })();
}
