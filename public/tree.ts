import { Application, Graphics, GraphicsContext, Container, TextStyle, Text } from "pixi.js";
import { Player } from "../shared/player";
import { session } from "./session";
import { Skill, skillData, treeUtil } from "../shared/skillTree";
import { v2, Vec2 } from "../shared/v2";
import { Viewport } from 'pixi-viewport';

const COLOR_CONFIG = {
    background: '#11111b',
    
    nodes: {
        unlocked: {
            fill: '#22c55e',
            border: '#16a34a'
        },
        available: {
            fill: '#3b82f6',
            border: '#2563eb'
        },
        locked: {
            fill: '#6b7280',
            border: '#4b5563'
        }
    },
    
    edges: {
        bothUnlocked: { color: '#4a5568', alpha: 0.6, width: 4 },
        startUnlocked: { color: '#3367d6', alpha: 0.8, width: 6 },
        locked: { color: '#666666', alpha: 0.3, width: 3 }
    },
    
    tooltip: {
        background: '#1f2937',
        backgroundAlpha: 0.95,
        border: '#374151',
        borderAlpha: 0.8,
        text: '#f3f4f6'
    },
    
    skillPoints: {
        text: '#f3f4f6'
    }
};


// Game elements
let player: Player;

// Ready button
const readyBtn = document.getElementById('skill-ready-btn') as HTMLButtonElement;

// PIXI elements
let app: Application;
let viewport: Viewport;

const upgrades = new Container(); // nodes themselves

const ui = new Container();
const tooltipContainer = new Container();
let tooltipText: Text;
let tooltipBg: Graphics;

// Skill points display
let skillPointsText: Text;

const nodes: Map<string, Graphics> = new Map();
type EdgeKey = `${string}-${string}`;
const edges: Map<EdgeKey, Graphics> = new Map();

// UI Elements
const treeArea = document.getElementById('tree-area') as HTMLElement;
const treeElement = document.getElementById('skill-tree') as HTMLDivElement;

// Logic elements
let interval: number; // game loop
let hasInitTree: boolean = false;
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
        hasInitTree = true;
    }

    startUpdateLoop();
}

export function hideTree(): void {
    cancelUpdateLoop();
    treeArea.classList.add('hidden');
}

// ready button
function initReadyBtn(): void {
    readyBtn.onclick = () => { toggleReadyBtn() };
}

function toggleReadyBtn(): void {
    const curState: boolean = player.skillReady;

    // toggle state
    player.skillReady = !player.skillReady;

    // change button content
    setBtnState(curState);

    // emit player ready to server
    session.socket.emit('game/player-skill-ready');
}

// helper

/**
 * Sets the button state to 'status'.
 * If 'status' is true, gives it default status (click to ready up)
 * If 'status' is false, gives it status of click to not ready
 */
function setBtnState(status: boolean = true) {
    switch (status) {
        case false:
            // now ready
            readyBtn.classList.add('ready');
            readyBtn.innerText = 'Not Ready';
            break;
        case true:
            // now not ready
            readyBtn.classList.remove('ready');
            readyBtn.innerText = 'Ready';
            break;
    }
}

export function resetReadyBtn(): void {
    setBtnState();
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
        createSkillPointsDisplay();
        app.stage.addChild(ui);
        ui.addChild(skillPointsText);

        // create tooltip (must be last to appear on top)
        createTooltip();
        ui.addChild(tooltipContainer);
    })();
}

export function redrawUI(): void {
    player = session.player!;

    // update skill points display on canvas
    updateSkillPointsDisplay();

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
            showSkillTooltip(skill, globalPos);
        })
        .on('pointerout', () => {
            const status = getClass(skillId);
            node.scale.set(stateConfig[status].scale);
            hideTooltip();
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
    const padding = 200;
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
        hideTooltip();
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

// Skill Points Display
function createSkillPointsDisplay(): void {
    const style = new TextStyle({
        fontSize: 24,
        fill: COLOR_CONFIG.skillPoints.text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 'bold',
    });
    
    skillPointsText = new Text({
        text: '0',
        style: style
    });
    skillPointsText.resolution = window.devicePixelRatio || 1;
    skillPointsText.anchor.set(0.5, 0);
    
    updateSkillPointsDisplay();
}

function updateSkillPointsDisplay(): void {
    if (!skillPointsText || !player || !app) return;
    
    skillPointsText.text = player.skillPoints.toString();
    
    // Center the text at the top of the screen
    skillPointsText.position.set(app.screen.width / 2, 20);
}

// Tooltip Utilities
function createTooltip(): void {
    tooltipBg = new Graphics();

    const style = new TextStyle({
        fontSize: 14,
        fill: COLOR_CONFIG.tooltip.text,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        wordWrap: true,
        wordWrapWidth: 240,
        lineHeight: 20,
        leading: 2
    });
    
    tooltipText = new Text({
        text: 'Hello',
        style: style
    });
    tooltipText.resolution = window.devicePixelRatio || 1;
    tooltipText.position.set(10, 8);

    tooltipContainer.addChild(tooltipBg, tooltipText);
    tooltipContainer.visible = false;
}

function showSkillTooltip(skill: Skill, pos: Vec2): void {
    tooltipContainer.visible = true;

    const text = [
        skill.desc,
        'Cost: ' + skill.cost,
    ];

    // Show prereqs if nonempty
    if (skill.prereq.length > 0) {
        text.push('Prereq: ' + skill.prereq.map(prereq => skillData[prereq].name).join(', '));
    }

    if (skill.effects !== undefined) {
        text.push('Effects:');
        text.push(treeUtil.effectsString(player, skill.effects));
    }

    setText(text.join('\n'));

    updateTooltipPosition(pos, tooltipContainer);
}

function updateTooltipPosition(pos: Vec2, tooltip: Container): void {
    const margin = 15;
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

    // Clamp left/top
    x = Math.max(margin, x);
    y = Math.max(margin, y);

    tooltip.position.set(Math.round(x), Math.round(y));
}

function hideTooltip(): void {
    tooltipContainer.visible = false;
}

function setText(value: string) {
    tooltipText.text = value;

    // Padding for background
    const padding = { x: 10, y: 8 };
    tooltipText.position.set(padding.x, padding.y);
    
    tooltipBg.clear();
    const width = tooltipText.width + 2 * padding.x;
    const height = tooltipText.height + 2 * padding.y;
    
    tooltipBg
        .rect(0, 0, width, height)
        .fill({ color: COLOR_CONFIG.tooltip.background, alpha: COLOR_CONFIG.tooltip.backgroundAlpha })
        .stroke({ width: 2, color: COLOR_CONFIG.tooltip.border, alpha: COLOR_CONFIG.tooltip.borderAlpha });
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
    requestAnimationFrame(gameLoop);
}

// server stuff
export function requestUnlock(skillId: string): void {
    session.socket.emit('game/player-buy-upgrade', skillId);
}