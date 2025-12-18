import { Container, Graphics } from "pixi.js";
import { COLOR_CONFIG } from "./colorConfig";
import { skillData, type Skill } from "@shared/skill";
import { circleStatus, stateConfig, getClass, type NodeStatus, type EdgeKey } from "./nodeUtil";
import { requestUnlock } from "../tree";
import { type TooltipManager } from "./tooltip";
import type { Player } from "@shared/player";

export class NodeManager {
    upgrades: Container;
    tooltipManager!: TooltipManager;

    player: Player;

    nodes = new Map<string, Graphics>();
    edges = new Map<EdgeKey, Graphics>();

    nodeStatus: Record<string, NodeStatus> = {};

    constructor(upgrades: Container, player: Player) {
        this.upgrades = upgrades;
        this.player = player;
        this.init();
    }

    setTooltipManager(tooltipManager: TooltipManager) {
        this.tooltipManager = tooltipManager;
    }

    init() {
        // initialize skill tree nodes
        for (const [skillId, skill] of Object.entries(skillData)) {
            const node = this.createNode(skillId, skill);
            this.upgrades.addChild(node);
        }

        // add edges (must be added before nodes so they appear behind)
        this.createEdges();
    }

    update(player: Player) {
        // Refresh player
        this.player = player;

        // update skill tree
        for (const skillId in skillData) {
            const node = this.nodes.get(skillId);
            if (!node) {
                throw new Error(`Node ${skillId} not found while updating nodes`);
            }
            
            const newStatus = this.getClass(skillId);
            const oldStatus = this.nodeStatus[skillId];
            if (newStatus !== oldStatus) {
                setClass(node, newStatus);
                this.nodeStatus[skillId] = newStatus;
            }
        }
    
        // update edges
        for (const [key, value] of this.edges) {
            this.setEdge(value, key);
        }
    }

    // Creator functions
    createNode(skillId: string, skill: Skill): Graphics {
        const node = new Graphics();
    
        this.nodes.set(skillId, node);
    
        const pos = skill.pos;
        node.position.set(pos.x, -pos.y);
    
        node.eventMode = 'static';
        node.cursor = 'pointer';
    
        let isPointerDown = false;
        let hasMoved = false;
    
        node
            .on('pointerdown', () => {
                isPointerDown = true;
                hasMoved = false;
            })
            .on('pointermove', () => {
                if (isPointerDown) {
                    hasMoved = true;
                }
            })
            .on('pointerup', () => {
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
                const status = this.getClass(skillId);
                if (status !== 'hidden') {
                    const originalScale = stateConfig[status].scale;
                    node.scale.set(originalScale * 1.1);
                }
                const globalPos = node.getGlobalPosition();
                this.tooltipManager.showSkillTooltip(skillId, globalPos);
            })
            .on('pointerout', () => {
                const status = this.getClass(skillId);
                node.scale.set(stateConfig[status].scale);
                this.tooltipManager.hideTooltip();
            });
        
        return node;
    }
    
    createEdges(): void {
        for (const [skillId1, skill1] of Object.entries(skillData)) {
            const endNode = this.nodes.get(skillId1);
    
            if (!endNode) {
                throw new Error(`Node ${skillId1} not found while initializing edges`);
            }
    
            if (skill1.prereq === undefined) {
                continue;
            }
    
            for (const prereq of skill1.prereq) {
                const bundle = `${prereq}-${skillId1}` as EdgeKey;
                const startNode = this.nodes.get(prereq);
    
                if (!startNode) {
                    throw new Error(`Node ${prereq} not found while initializing edges`);
                }
    
                const edge = new Graphics();
                edge.moveTo(startNode.position.x, startNode.position.y);
                edge.lineTo(endNode.position.x, endNode.position.y);
    
                // Add edges before nodes so they appear behind
                this.upgrades.addChildAt(edge, 0);
    
                this.edges.set(bundle, edge);
            }
        }
    }

    // sets style of the edge
    setEdge(edge: Graphics, data: EdgeKey): void {
        const ids = data.split('-');
        const start = ids[0];
        const end = ids[1];

        const status1 = this.getClass(start);
        const status2 = this.getClass(end);

        const startNode = this.nodes.get(start);
        const endNode = this.nodes.get(end);

        if (!startNode || !endNode) {
            throw new Error(`Node ${start} or ${end} not found while updating edges`);
        }

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

    // alias to get class
    getClass(skillId: string): NodeStatus {
        return getClass(skillId, this.player);
    }
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