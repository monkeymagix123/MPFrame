import { Application, Container } from "pixi.js";
import { Player } from "../shared/player";
import { session } from "./session";
import { skillData, treeUtil } from "../shared/skill";
import { v2, Vec2 } from "../shared/v2";
import { Viewport } from 'pixi-viewport';
import { calcTooltips, updateTooltips } from "./treeHelper";
import { initReadyBtn } from "./treeUI/readyBtn";
import { TooltipManager } from "./treeUI/tooltip";
import { COLOR_CONFIG } from "./treeUI/colorConfig";
import { SkillPtsManager } from "./treeUI/skillPoints";
import { NodeManager } from "./treeUI/nodes";


// Game elements
let player: Player;

// PIXI elements
let app: Application;
let viewport: Viewport;

const upgrades = new Container({
    isRenderGroup: true,
}); // nodes themselves

const ui = new Container();
let tooltipManager: TooltipManager;

// Skill points display
let skillPointsManager: SkillPtsManager;

let nodeManager: NodeManager;

// UI Elements
const treeArea = document.getElementById('tree-area') as HTMLElement;
const treeElement = document.getElementById('skill-tree') as HTMLDivElement;

// Logic elements
let interval: number; // game loop
let hasInitTree = false;
let running = false;

export async function drawTree(): Promise<void> {
    treeArea.classList.remove('hidden');

    if (!hasInitTree) {
        await initTreeUI();
        initReadyBtn();
        calcTooltips(player);
        hasInitTree = true;
    }

    startUpdateLoop();
}

export function hideTree(): void {
    cancelUpdateLoop();
    treeArea.classList.add('hidden');
}

// tree
async function initTreeUI(): Promise<void> {
    player = session.player!;

    app = new Application();

    await app.init({
        backgroundAlpha: 1,
        backgroundColor: COLOR_CONFIG.background,
        resizeTo: treeElement,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true
    });

    treeElement.appendChild(app.canvas);

    // create viewport
    viewport = createViewport(app);
    app.stage.addChild(viewport);

    // move container to center
    upgrades.position.set(viewport.worldWidth / 2, viewport.worldHeight / 2);

    // add nodes container to viewport
    viewport.addChild(upgrades);

    nodeManager = new NodeManager(upgrades, player);

    // create skill points display (added to stage, not viewport)
    skillPointsManager = new SkillPtsManager(app, ui, player.skillPoints);

    // add ui to stage
    app.stage.addChild(ui);

    // create tooltip (must be last to appear on top)
    tooltipManager = new TooltipManager(ui, app);

    nodeManager.setTooltipManager(tooltipManager);
}

export function redrawUI(): void {
    player = session.player!;

    // update skill points display on canvas
    skillPointsManager.updateSkillPointsDisplay(player.skillPoints);

    nodeManager.update(player);
}

// Viewport
// Replace the existing createViewport function's zoom configuration

function createViewport(app: Application, size: Vec2 = treeUtil.getMaxPos()): Viewport {
    // Initialize viewport
    const padding = 800;
    const paddedSize = v2.add(size, new Vec2(padding, padding));

    const viewport = new Viewport({
        screenWidth: app.screen.width,
        screenHeight: app.screen.height,
        worldWidth: paddedSize.x * 2,
        worldHeight: paddedSize.y * 2,
        events: app.renderer.events,
    });
    
    viewport
        .drag({
            wheel: false,
            mouseButtons: 'left-middle-right',
        })
        .pinch()
        .wheel({
            smooth: 3,
            percent: 0.1,
            interrupt: true,
        })
        .decelerate({
            friction: 0.9,
            bounce: 0.5,
            minSpeed: 0.01
        })
        .clampZoom({
            minScale: 0.3,
            maxScale: 2.5,
        })
        .clamp({
            direction: 'all',
            underflow: 'center'
        })

    // Center on the start node
    const startNode = findStartNode();
    // Fallback to center of world if no start node found
    const startPos = !startNode ? new Vec2(0, 0) : new Vec2(startNode.x, -startNode.y);

    // shift to center of viewport
    viewport.moveCenter(v2.add(startPos, paddedSize));

    viewport.on('pointerdown', () => {
        app.canvas.style.cursor = 'grabbing';
    })

    viewport.on('pointerup', () => {
        app.canvas.style.cursor = 'grab';
    })

    viewport.on('drag-start', () => {
        tooltipManager.hideTooltip();
    });

    viewport.cursor = 'grab';

    return viewport;
}

// Helper function to find the start node (node with no prerequisites)
function findStartNode(): Vec2 | null {
    for (const skill of Object.values(skillData)) {
        if (!skill.prereq || skill.prereq.length === 0) {
            return skill.pos;
        }
    }
    return null;
}

// Loops
function startUpdateLoop() {
    if (running) return;
    running = true;
    interval = requestAnimationFrame(gameLoop);
}

function cancelUpdateLoop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(interval);
}

function gameLoop() {
    if (!running) return;
    if (!hasInitTree) return;

    // update UI
    redrawUI();

    // update tooltips
    updateTooltips(player);

    // schedule next frame
    requestAnimationFrame(gameLoop);
}

// server stuff
export function requestUnlock(skillId: string): void {
    session.socket.emit('game/player-buy-upgrade', skillId);
}