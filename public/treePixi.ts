import { Application, Graphics, GraphicsContext, Container, TextStyle, Text } from "pixi.js";
import { Player } from "../shared/player";
import { session } from "./session";
import { Skill, skillData, treeUtil } from "../shared/skillTree";
import { Vec2 } from "../shared/v2";
import { start } from "repl";

// Game elements
let player: Player;

// PIXI elements
let app: Application;

const upgrades = new Container(); // nodes themselves

const ui = new Container();
const tooltipContainer = new Container();
ui.addChild(tooltipContainer);
let tooltipText: Text;
let tooltipBg: Graphics;

const nodes: Map<string, Graphics> = new Map();

// UI Elements
const treeArea = document.getElementById('tree-area') as HTMLElement;
const treeElement = document.getElementById('skill-tree') as HTMLDivElement;
const skillPointsContainer = document.getElementById('skill-points-container') as HTMLDivElement;
const skillPointsElement = document.getElementById('skill-points') as HTMLSpanElement;
const skillsElement = document.getElementById('skill-tree') as HTMLDivElement;
const skillReadyBtn = document.getElementById('skill-ready-btn') as HTMLButtonElement;

// Logic elements
let interval: number; // game loop
let hasInitTree: boolean = false;

// Basic graphics
function createNode(color: string): GraphicsContext {
    return new GraphicsContext().circle(0, 0, 10).fill(color);
}
// const circle = new GraphicsContext().circle(0, 0, 10).fill('blue');
const circle = createNode('blue');
const circleStatus: Record<string, GraphicsContext> = {
    unlocked: createNode('darkgreen'),
    available: createNode('blue'),
    locked: createNode('gray'),
    hidden: new GraphicsContext(),
}

export function drawTree(): void {
    treeArea.classList.remove('hidden');

    if (!hasInitTree) {
        initTreeUI();
        hasInitTree = true;
    }

    startUpdateLoop();
}

export function hideTree(): void {
    cancelUpdateLoop();

    treeArea.classList.add('hidden');
}

function initTreeUI(): void {
    // init the player
    player = session.player!;

    app = new Application();

    (async () => {
        // Intialize the application.
        await app.init({
            backgroundAlpha: 0,
            resizeTo: treeElement,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });

        // Then adding the application's canvas to the DOM body.
        treeElement.appendChild(app.canvas);

        // create tooltip
        createTooltip();

        // add nodes, ui
        app.stage.addChild(upgrades);
        app.stage.addChild(ui);

        // initialize skill tree nodes
        for (const [skillId, skill] of Object.entries(skillData)) {
            const node = new Graphics(circle);

            nodes.set(skillId, node);

            // 3. Set properties (position, scale)
            node.position.set(app.screen.width * Math.random(), app.screen.height * Math.random());
            // pivot already at (0, 0)

            // make it a button
            node.eventMode = 'static';
            node.cursor = 'pointer';

            // make tooltip
            node
                .on('pointerdown', () => { requestUnlock(skillId); })
                .on('pointerover', () => { showSkillTooltip(skill, node.position); })
                .on('pointerout', () => { hideTooltip(); });

            // 4. Add the sprite to the stage (the root container)
            app.stage.addChild(node);
        }

        app.stage.addChild(ui);
        
        // // 5. You can even animate it using the PIXI ticker!
        // app.ticker.add((time) => {
        //     bunny.rotation += 0.1 * time.deltaTime; // Rotate the bunny
        // });
    })();

    startUpdateLoop();
}

function redrawUI(): void {
    // refresh player
    player = session.player!;

    // show points
    skillPointsElement.innerText = player.skillPoints.toString();

    // update skill tree
    for (const skillId in skillData) {
        const skill = skillData[skillId];

        const node = nodes.get(skillId)!;

        node.context = getClass(skillId);

        // tooltip automatically updates
    }
}

// Class utilities
function getClass(skillId: string): GraphicsContext {
    // already unlocked
    if (player.unlockedSkills.includes(skillId)) {
        return circleStatus.unlocked;
    }

    // don't have all prereqs
    if (!treeUtil.hasPrereqs(skillId, player.unlockedSkills)) {
        return circleStatus.hidden;
    }
    
    // have all prereqs, but can't buy it
    if (player.skillPoints < skillData[skillId].cost) {
        return circleStatus.locked;
    }
    
    return circleStatus.available;
}

// Tooltip Utilities
function createTooltip(): void {
    tooltipBg = new Graphics().roundRect(0, 0, 10, 10, 6).fill({ color: 0x000000, alpha: 0.85 });

    const style = new TextStyle(
        {
            fontSize: 14,
            fill: 0xffffff,
            wordWrap: true,
            wordWrapWidth: 220,
            lineHeight: 18
        },
    );
    tooltipText = new Text({
        text: 'Hello',
        style: style
    });
    tooltipText.resolution = window.devicePixelRatio || 1;

    tooltipText.scale.set(1);
    tooltipText.roundPixels = true;

    tooltipText.position.set(0, 0);

    tooltipContainer.addChild(tooltipBg, tooltipText);
    ui.visible = false;
}

function showSkillTooltip(skill: Skill, pos: Vec2): void {
    ui.visible = true;

    // position tooltip container
    tooltipContainer.position.set(pos.x + 20 < app.screen.width ? pos.x + 10 : pos.x - 10, pos.y + 20 < app.screen.height ? pos.y + 10 : pos.y - 10);

    const text = [
        skill.desc,
        'Cost: ' + skill.cost,
        'Prereq: ' + skill.prereq.map(prereq => skillData[prereq].name).join(', ')
    ]

    if (skill.effects !== undefined) {
        text.push('Effects:');
        text.push(treeUtil.effectsString(player, skill.effects));
    }

    setText(text.join('\n'));

    // update tooltip position
    updateTooltipPosition(pos, tooltipContainer);
}

function updateTooltipPosition(pos: Vec2, tooltip: Container): void {
    const margin = 10; // space from cursor or edge
    let x = pos.x + margin;
    let y = pos.y + margin;

    // Clamp right edge
    if (x + tooltip.width > app.screen.width) {
        x = pos.x - tooltip.width - margin;
    }

    // Clamp bottom edge
    if (y + tooltip.height > app.screen.height) {
        y = pos.y - tooltip.height - margin;
    }

    // Optional: clamp left/top (if cursor is near edges)
    x = Math.max(margin, x);
    y = Math.max(margin, y);

    // Round to avoid blurry text
    tooltip.position.set(Math.round(x), Math.round(y));
}

function hideTooltip(): void {
    ui.visible = false;
}

/**
 * Sets the text of the tooltip and resizes the background to fit the new text.
 * @param {string} value The new text to set.
 */
function setText(value: string) {
    tooltipText.text = value;
    tooltipText.position.set(8, 6); // in the middle
    tooltipBg.clear();
    tooltipBg.roundRect(0, 0, tooltipText.width + 16, tooltipText.height + 12, 6);
    tooltipBg.fill({ color: 0x000000, alpha: 0.85 });
}


// Loops
function startUpdateLoop() {
    interval = requestAnimationFrame(gameLoop);
}

function cancelUpdateLoop() {
    cancelAnimationFrame(interval);
}

function gameLoop() {
    redrawUI();
    requestAnimationFrame(gameLoop);
}

// server stuff
/**
 * Emits a socket event to the server to unlock a skill.
 * @param {string} skillId - The ID of the skill to unlock.
 */
export function requestUnlock(skillId: string): void {
    session.socket.emit('game/player-buy-upgrade', skillId);
}