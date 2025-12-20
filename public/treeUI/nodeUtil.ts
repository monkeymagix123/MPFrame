// Basic graphics for each node

import { GraphicsContext } from "pixi.js";
import { COLOR_CONFIG } from "./colorConfig";
import { Player } from "@shared/player";
import { skillData, treeUtil } from "@shared/skill";

export type NodeStatus = 'unlocked' | 'available' | 'locked' | 'hidden';
export type EdgeKey = `${string}-${string}`;

function createNodeType(color: string, borderColor?: string): GraphicsContext {
    const size = 30; // Changed from 30 to 20
    const ctx = new GraphicsContext()
        // .rect(-size / 2, -size / 2, size, size)
        .circle(0, 0, size / 2)
        .fill(color);
    
    if (borderColor) {
        ctx.stroke({ width: 2, color: borderColor });
    }
    
    return ctx;
}

export const circleStatus: Record<NodeStatus, GraphicsContext> = {
    unlocked: createNodeType(COLOR_CONFIG.nodes.unlocked.fill, COLOR_CONFIG.nodes.unlocked.border),
    available: createNodeType(COLOR_CONFIG.nodes.available.fill, COLOR_CONFIG.nodes.available.border),
    locked: createNodeType(COLOR_CONFIG.nodes.locked.fill, COLOR_CONFIG.nodes.locked.border),
    hidden: new GraphicsContext(),
};

export const stateConfig: Record<NodeStatus, { scale: number, visible: boolean }> = {
    unlocked: { scale: 1, visible: true },
    available: { scale: 1.15, visible: true },
    locked: { scale: 0.95, visible: true },
    hidden: { scale: 1, visible: false },
};

// Class utilities
export function getClass(skillId: string, player: Player): NodeStatus {
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