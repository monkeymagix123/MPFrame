import { Application, Graphics, GraphicsContext, Container, TextStyle, Text } from "pixi.js";
import { Player } from "../shared/player";
import { session } from "./session";
import { Skill, skillData, treeUtil } from "../shared/skillTree";
import { Vec2 } from "../shared/v2";
import { GlowFilter } from "pixi-filters";
import { Viewport } from 'pixi-viewport';

// Game elements
let player: Player;

// PIXI elements
let app: Application;

const upgrades = new Container(); // nodes themselves

const ui = new Container();
const tooltipContainer = new Container();
let tooltipText: Text;
let tooltipBg: Graphics;

const nodes: Map<string, Graphics> = new Map();
type EdgeKey = `${string}-${string}`;
const edges: Map<EdgeKey, Graphics> = new Map();

// UI Elements
const treeArea = document.getElementById('tree-area') as HTMLElement;
const treeElement = document.getElementById('skill-tree') as HTMLDivElement;
const skillPointsElement = document.getElementById('skill-points') as HTMLSpanElement;

// Logic elements
let interval: number; // game loop
let hasInitTree: boolean = false;
let running = false;

// Basic graphics
type NodeStatus = 'unlocked' | 'available' | 'locked' | 'hidden';
function createNodeType(color: string): GraphicsContext {
    // return new GraphicsContext().circle(0, 0, 10).fill(color);
    const size = 25;
    return new GraphicsContext().rect(-size / 2, -size / 2, size, size).fill(color);
}
// const circle = new GraphicsContext().circle(0, 0, 10).fill('blue');
const circle = createNodeType('blue');
const circleStatus: Record<NodeStatus, GraphicsContext> = {
    unlocked: createNodeType('darkgreen'),
    available: createNodeType('blue'),
    locked: createNodeType('gray'),
    hidden: new GraphicsContext(),
}

const stateConfig: Record<NodeStatus, { scale: number, visible: boolean }> = {
    unlocked: { scale: 0.9, visible: true },
    available: { scale: 1.2, visible: true },
    locked: { scale: 1, visible: true },
    hidden: { scale: 1, visible: false },
};

const glow = new GlowFilter({
    distance: 30,
    outerStrength: 2,
    color: '#3367d6',
});

export function drawTree(): void {
    treeArea.classList.remove('hidden');

    if (!hasInitTree) {
        initTreeUI();
        hasInitTree = true;
    }

    // redrawUI();

    startUpdateLoop();
}

export function hideTree(): void {
    cancelUpdateLoop();

    treeArea.classList.add('hidden');
}

function initTreeUI(): void {
    // init the player
    player = session.player!;

    // init canvas
    app = new Application();

    (async () => {
        // Intialize the application.
        await app.init({
            backgroundAlpha: 0.25,
            backgroundColor: 0x999999,
            resizeTo: treeElement,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });

        // Then adding the application's canvas to the DOM body.
        treeElement.appendChild(app.canvas);

        // create tooltip
        createTooltip();

        // add ui
        app.stage.addChild(ui);
        ui.addChild(tooltipContainer);

        // add nodes
        const viewport = createViewport(app);

        viewport.addChild(upgrades);
        app.stage.addChild(viewport);

        // initialize skill tree nodes
        for (const [skillId, skill] of Object.entries(skillData)) {
            const node = createNode(skillId, skill);

            // 4. Add the sprite to the stage (the root container)
            upgrades.addChild(node);
        }
        
        // add edges
        createEdges();
        
        // // 5. You can even animate it using the PIXI ticker!
        // app.ticker.add((time) => {
        //     bunny.rotation += 0.1 * time.deltaTime; // Rotate the bunny
        // });
    })();
}

export function redrawUI(): void {
    // refresh player
    player = session.player!;

    // show points
    skillPointsElement.innerText = player.skillPoints.toString();

    // update skill tree
    for (const skillId in skillData) {
        // update node class
        const node = nodes.get(skillId)!;
        setClass(node, getClass(skillId));

        // tooltip automatically updates
    }

    // update edges
    for (const [key, value] of edges) {
        setEdge(value, key);
    }
}

// Class utilities
function getClass(skillId: string): NodeStatus {
    // already unlocked
    if (player.unlockedSkills.includes(skillId)) {
        return 'unlocked';
    }

    // don't have all prereqs
    if (!treeUtil.hasPrereqs(skillId, player.unlockedSkills)) {
        return 'hidden';
    }
    
    // have all prereqs, but can't buy it
    if (player.skillPoints < skillData[skillId].cost) {
        return 'locked';
    }
    
    return 'available';
}

function setClass(node: Graphics, status: NodeStatus): void {
    node.context = circleStatus[status];
    node.scale.set(stateConfig[status].scale);
    node.visible = stateConfig[status].visible;

    if (status === 'available') {
        node.filters = [glow];
    } else {
        node.filters = [];
    }

    // make it not accept events if hidden
    node.eventMode = status === 'hidden' ? 'none' : 'static';
}

// sets style of the edge
function setEdge(edge: Graphics, data: EdgeKey): void {
    // parse key
    const ids = data.split('-');

    const start = ids[0];
    const end = ids[1];

    const status1 = getClass(start);
    const status2 = getClass(end);

    if (status1 === 'unlocked')
    console.log("drawing unlocked one");

    const startNode = nodes.get(start)!;
    const endNode = nodes.get(end)!;

    // if one hidden, don't draw edge between
    if (status1 === 'hidden' || status2 === 'hidden') {
        edge.visible = false;
        return;
    }

    // both unlocked --> normal edge
    if (status1 === 'unlocked' && status2 === 'unlocked') {
        edge.visible = true;
        edge.clear();
        edge.setStrokeStyle({ width: 10, color: 0x999999 });
        edge.moveTo(startNode.position.x, startNode.position.y);
        edge.lineTo(endNode.position.x, endNode.position.y);
        edge.filters = [];
        return;
    }

    // only start unlocked --> highlight edge
    if (status1 === 'unlocked') {
        edge.visible = true;
        edge.clear();
        edge.setStrokeStyle({ width: 20, color: 0x000000 });
        edge.moveTo(startNode.position.x, startNode.position.y);
        edge.lineTo(endNode.position.x, endNode.position.y);
        edge.filters = [glow];
        return;
    }

    // start not unlocked --> hide edge
    edge.visible = false;
    return;
}

// Creator functions
function createNode(skillId: string, skill: Skill): Graphics {
    const node = new Graphics(circle);

    nodes.set(skillId, node);

    // 3. Set properties (position, scale)
    const pos = skill.pos;
    node.position.set(pos.x, -pos.y); // y is inverted
    // pivot already at (0, 0)

    // make it a button
    node.eventMode = 'static';
    node.cursor = 'pointer';

    // make tooltip
    node
        .on('pointerdown', (e) => { requestUnlock(skillId); e.stopPropagation(); })
        .on('pointerover', () => {
            const globalPos = node.getGlobalPosition();
            showSkillTooltip(skill, globalPos);
        })
        .on('pointerout', () => { hideTooltip(); });
    
    return node;
}

function createEdges(): void {
    for (const [skillId1, skill1] of Object.entries(skillData)) {
        const endNode = nodes.get(skillId1)!;

        if (skill1.prereq === undefined) {
            continue;
        }

        for (const prereq of skill1.prereq) {
            // reversed because skill2 used to unlock skill1
            const bundle = `${prereq}-${skillId1}` as EdgeKey;

            const startNode = nodes.get(prereq)!;

            const edge = new Graphics();
            edge.moveTo(startNode.position.x, startNode.position.y);
            edge.lineTo(endNode.position.x, endNode.position.y);

            // setEdge(edge, bundle);
            upgrades.addChild(edge);

            edges.set(bundle, edge);
        }
    }
}

// Viewport
function createViewport(app: Application, size: Vec2 = treeUtil.getMaxPos()): Viewport {
    const ratio = 1 / 0.3;
    
    const viewport = new Viewport({
        screenWidth: app.renderer.width,
        screenHeight: app.renderer.height,
        worldWidth: 2 * size.x, // Define the size of your world/canvas content
        worldHeight: 2 * size.y,
        events: app.renderer.events,
    });
    viewport
        .drag()
        .pinch()          // mobile zoom
        .wheel()          // mouse wheel zoom
        .decelerate()     // inertia
        .clampZoom({
            minScale: 0.3,
            maxScale: 2.5,
        });
    viewport.clamp({
        left: - size.x,
        right: size.x,
        top: -size.y,
        bottom: size.y,
    });
    viewport.on("pointerdown", (e) => {
        viewport.plugins.resume("drag");
    });

    viewport.on("pointerup", () => {
        viewport.plugins.resume("drag");
    });

    viewport.on('drag-start', () => {
        // Use 'grabbing' (closed hand) for active drag
        app.canvas.style.cursor = 'grabbing';
    });

    // 3. Change the cursor back when dragging ends
    viewport.on('drag-end', () => {
        // Use 'grab' (open hand) when hovering and ready to drag
        app.canvas.style.cursor = 'grab';
    });

    // 4. Initial setting for the 'ready to drag' cursor
    // This makes the hand cursor visible when the mouse is over the viewport
    viewport.on('pointerover', () => app.canvas.style.cursor = 'grab');

    return viewport;
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
    ]

    if (skill.prereq !== undefined) {
        text.push('Prereq: ' + skill.prereq.map(prereq => skillData[prereq].name).join(', '));
    }

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
    tooltipBg.roundRect(0, 0, tooltipText.getBounds().width + 16, tooltipText.getBounds().height + 12, 6);
    tooltipBg.fill({ color: 0x000000, alpha: 0.85 });
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
/**
 * Emits a socket event to the server to unlock a skill.
 * @param {string} skillId - The ID of the skill to unlock.
 */
export function requestUnlock(skillId: string): void {
    session.socket.emit('game/player-buy-upgrade', skillId);
}