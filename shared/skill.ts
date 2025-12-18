import { Player } from "./player";
import { PlayerStats } from "./playerStats";
import rawSkillData from "./skillData.json";
import { Vec2 } from "./v2";

export const skillData = rawSkillData as Record<string, Skill>;

export interface Skill {
    name: string,
    cost: number,
    prereq: string[],
    desc: string,
    effects?: Effect,
    pos: Vec2,
}

export interface Effect {
    stats?: Record<string, number>
    flags?: Record<string, boolean>
}

export const treeUtil = {
    hasPrereqs(skillId: string, unlockedSkills: string[]): boolean {
        const prereqs = skillData[skillId].prereq;
        return prereqs.every(prereq => unlockedSkills.includes(prereq));
    },

    parseEffectKey(key: string): string {
        switch (key) {
            case 'speed':
                return 'moveSpeed';
            case 'health':
                return 'maxHealth';
            default:
                return key;
        }
    },

    translateEffectKey(key: string): string {
        let result = "";
        for (let i = 0; i < key.length; i++) {
            const a = key[i];
            const lower = a.toLowerCase();
            
            if (a !== lower) {
                result += " ";
            }
            
            result += (i === 0) ? a.toUpperCase() : a;
        }
        return result;
    },

    getEffectsString(data: Partial<PlayerStats>[]): string {
        const oldStats = data[0]!;
        const newStats = data[1]!;
        let s = "";
        
        for (const key of Object.keys(oldStats) as (keyof PlayerStats)[]) {
            const oldVal = oldStats[key];
            const newVal = newStats[key];
            if (newVal === undefined) continue;
            s += `${this.translateEffectKey(key)}: ${oldVal} -> ${newVal}\n`;
        }
        return s;
    },

    effectsString(player?: Player, skillEffects?: Effect): string {
        if (!skillEffects) {
            return "";
        }
        if (!player) {
            return "";
        }
        return treeUtil.getEffectsString(player.previewEffects(skillEffects));
    },

    getMaxPos(): Vec2 {
        const maxX = Math.max(...Object.values(skillData).map(skill => Math.abs(skill.pos.x)));
        const maxY = Math.max(...Object.values(skillData).map(skill => Math.abs(skill.pos.y)));
        return new Vec2(maxX, maxY);
    }
}