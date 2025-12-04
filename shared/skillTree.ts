import rawSkillData from "./skillData.json";

export const skillData = rawSkillData as Record<string, Skill>;

export type Skill = {
    name: string,
    cost: number,
    prereq: string[],
    desc: string,
    effects?: Effect,
}

type Effect = {
    stats?: Record<string, number>
}

export const treeUtil = {
    hasPrereqs: function (skillId: string, unlockedSkills: string[]): boolean {
        const prereqs = skillData[skillId].prereq;
        return prereqs.every(prereq => unlockedSkills.includes(prereq));
    }
}