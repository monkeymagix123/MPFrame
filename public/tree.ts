import { Application, Graphics, GraphicsContext, Container, TextStyle, Text } from "pixi.js";
import { Player } from "../shared/player";
import { session } from "./session";
import { Skill, skillData, treeUtil } from "../shared/skill";
import { v2, Vec2 } from "../shared/v2";
import { Viewport } from 'pixi-viewport';
import { calcTooltips, updateTooltips } from "./treeHelper";
import { initReadyBtn } from "./treeUI/readyBtn";
import { TooltipManager } from "./treeUI/tooltip";
import { COLOR_CONFIG } from "./treeUI/colorConfig";
import { SkillPtsManager } from "./treeUI/skillPoints";


// Game elements
let player: Player;

// PIXI elements
let app: Application;
let viewport: Viewport;

const upgrades = new Container(); // nodes themselves

const ui = new Container();
let tooltipManager: TooltipManager;

// Skill points display
let skillPointsManager: SkillPtsManager;

const nodes = new Map<string, Graphics>();
type EdgeKey = `${string}-${string}`;
const edges = new Map<EdgeKey, Graphics>();

// UI Elements
const treeArea = document.getElementById('tree-area') as HTMLElement;
const treeElement = document.getElementById('skill-tree') as HTMLDivElement;

// Logic elements
let interval: number; // game loop
let hasInitTree = false;
let running = false;

// Basic graphics
type NodeStatus = 'unlocked' | 'available' | 'locked' | 'hidden';

function createNodeType(color: string, borderColor?: string): GraphicsContext {
    const size = 20; // Changed from 30 to 20
    const ctx = new GraphicsContext()
        .rect(-size / 2, -size / 2, size, size)
        // .circle(0, 0, size)
        .fill(color);
    
    if (borderColor) {
        ctx.stroke({ width: 2, color: borderColor });
    }
    
    return ctx;
}

const circleStatus: Record<NodeStatus, GraphicsContext> = {
    unlocked: createNodeType(COLOR_CONFIG.nodes.unlocked.fill, COLOR_CONFIG.nodes.unlocked.border),
    available: createNodeType(COLOR_CONFIG.nodes.available.fill, COLOR_CONFIG.nodes.available.border),
    locked: createNodeType(COLOR_CONFIG.nodes.locked.fill, COLOR_CONFIG.nodes.locked.border),
    hidden: new GraphicsContext(),
};

const stateConfig: Record<NodeStatus, { scale: number, visible: boolean }> = {
    unlocked: { scale: 1, visible: true },
    available: { scale: 1.15, visible: true },
    locked: { scale: 0.95, visible: true },
    hidden: { scale: 1, visible: false },
};

export function drawTree(): void {
    treeArea.classList.remove('hidden');

    if (!hasInitTree) {
        initTreeUI();
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
function initTreeUI(): void {
    player = session.player!;

    app = new Application();

    (async () => {
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

        // initialize skill tree nodes
        for (const [skillId, skill] of Object.entries(skillData)) {
            const node = createNode(skillId, skill);
            upgrades.addChild(node);
        }
        
        // add edges (must be added before nodes so they appear behind)
        createEdges();

        // create skill points display (added to stage, not viewport)
        skillPointsManager = new SkillPtsManager(app, ui, player.skillPoints);

        // add ui to stage
        app.stage.addChild(ui);

        // create tooltip (must be last to appear on top)
        tooltipManager = new TooltipManager(ui, app);
    })();
}

export function redrawUI(): void {
    player = session.player!;

    // update skill points display on canvas
    skillPointsManager.updateSkillPointsDisplay(player.skillPoints);

    // update skill tree
    for (const skillId in skillData) {
        const node = nodes.get(skillId)!;
        setClass(node, getClass(skillId));
    }

    // update edges
    for (const [key, value] of edges) {
        setEdge(value, key);
    }
}

// Class utilities
function getClass(skillId: string): NodeStatus {
    if (player.unlockedSkills.includes(skillId)) {
        return 'unlocked';
    }

    if (!treeUtil.hasPrereqs(skillId, player.unlockedSkills)) {
        return 'hidden';
    }
    
    if (player.skillPoints < skillData[skillId].cost) {
        return 'locked';
    }
    
    return 'available';
}

function setClass(node: Graphics, status: NodeStatus): void {
    node.context = circleStatus[status];
    
    // Smooth scale transition
    const targetScale = stateConfig[status].scale;
    node.scale.set(targetScale);
    
    node.visible = stateConfig[status].visible;

    // Removed glow filter
    node.filters = [];

    node.eventMode = status === 'hidden' ? 'none' : 'static';
}

// sets style of the edge
function setEdge(edge: Graphics, data: EdgeKey): void {
    const ids = data.split('-');
    const start = ids[0];
    const end = ids[1];

    const status1 = getClass(start);
    const status2 = getClass(end);

    const startNode = nodes.get(start)!;
    const endNode = nodes.get(end)!;

    // if one hidden, don't draw edge between
    if (status1 === 'hidden' || status2 === 'hidden') {
        edge.visible = false;
        return;
    }

    edge.visible = true;
    edge.clear();

    // both unlocked --> subtle edge
    if (status1 === 'unlocked' && status2 === 'unlocked') {
        const cfg = COLOR_CONFIG.edges.bothUnlocked;
        edge.setStrokeStyle({ width: cfg.width, color: cfg.color, alpha: cfg.alpha });
        edge.moveTo(startNode.position.x, startNode.position.y);
        edge.lineTo(endNode.position.x, endNode.position.y);
        edge.stroke();
        return;
    }

    // only start unlocked --> highlight edge
    if (status1 === 'unlocked') {
        const cfg = COLOR_CONFIG.edges.startUnlocked;
        edge.setStrokeStyle({ width: cfg.width, color: cfg.color, alpha: cfg.alpha });
        edge.moveTo(startNode.position.x, startNode.position.y);
        edge.lineTo(endNode.position.x, endNode.position.y);
        edge.stroke();
        return;
    }

    // start not unlocked --> faint edge
    const cfg = COLOR_CONFIG.edges.locked;
    edge.setStrokeStyle({ width: cfg.width, color: cfg.color, alpha: cfg.alpha });
    edge.moveTo(startNode.position.x, startNode.position.y);
    edge.lineTo(endNode.position.x, endNode.position.y);
    edge.stroke();
}

// Creator functions
function createNode(skillId: string, skill: Skill): Graphics {
    const node = new Graphics();

    nodes.set(skillId, node);

    const pos = skill.pos;
    node.position.set(pos.x, -pos.y);

    node.eventMode = 'static';
    node.cursor = 'pointer';

    let isPointerDown = false;
    let hasMoved = false;

    node
        .on('pointerdown', (e) => {
            isPointerDown = true;
            hasMoved = false;
        })
        .on('pointermove', (e) => {
            if (isPointerDown) {
                hasMoved = true;
            }
        })
        .on('pointerup', (e) => {
            if (isPointerDown && !hasMoved) {
                requestUnlock(skillId);
            }
            isPointerDown = false;
            hasMoved = false;
        })
        .on('pointerupoutside', () => {
            isPointerDown = false;
            hasMoved = false;
        })
        .on('pointerover', () => {
            const status = getClass(skillId);
            if (status !== 'hidden') {
                const originalScale = stateConfig[status].scale;
                node.scale.set(originalScale * 1.1);
            }
            const globalPos = node.getGlobalPosition();
            tooltipManager.showSkillTooltip(skillId, globalPos);
        })
        .on('pointerout', () => {
            const status = getClass(skillId);
            node.scale.set(stateConfig[status].scale);
            tooltipManager.hideTooltip();
        });
    
    return node;
}

function createEdges(): void {
    for (const [skillId1, skill1] of Object.entries(skillData)) {
        const endNode = nodes.get(skillId1)!;

        if (skill1.prereq === undefined) {
            continue;
        }

        for (const prereq of skill1.prereq) {
            const bundle = `${prereq}-${skillId1}` as EdgeKey;
            const startNode = nodes.get(prereq)!;

            const edge = new Graphics();
            edge.moveTo(startNode.position.x, startNode.position.y);
            edge.lineTo(endNode.position.x, endNode.position.y);

            // Add edges before nodes so they appear behind
            upgrades.addChildAt(edge, 0);

            edges.set(bundle, edge);
        }
    }
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

    // Enhanced cursor management
    let isDragging = false;

    viewport.on('pointerdown', () => {
        app.canvas.style.cursor = 'grabbing';
    })

    viewport.on('pointerup', () => {
        app.canvas.style.cursor = 'grab';
    })

    viewport.on('drag-start', () => {
        isDragging = true;
        tooltipManager.hideTooltip();
    });

    viewport.on('drag-end', () => {
        isDragging = false;
    });

    viewport.cursor = 'grab';

    return viewport;
}

// Helper function to find the start node (node with no prerequisites)
function findStartNode(): Vec2 | null {
    for (const [skillId, skill] of Object.entries(skillData)) {
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