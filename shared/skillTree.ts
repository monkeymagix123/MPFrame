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