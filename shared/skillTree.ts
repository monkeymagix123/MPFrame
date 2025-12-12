import { PlayerStats } from "./playerStats";
import rawSkillData from "./skillData.json";

export const skillData = rawSkillData as Record<string, Skill>;

export type Skill = {
    name: string,
    cost: number,
    prereq: string[],
    desc: string,
    effects?: Effect,
}

export type Effect = {
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
        // basic: convert from camelcase to spaces
        let result = "";

        for (let i = 0; i < key.length; i++) {
            const a = key[i];
            const lower = a.toLowerCase();

            // space separating words
            if (a !== lower) {
                result += " ";
            }

            // upper case 1st letter
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

            s += `${this.translateEffectKey(key)}: ${oldVal} -> ${newVal} <br>`;
        }

        return s;
    }
}