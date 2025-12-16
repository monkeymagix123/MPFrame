// Helper for skill effects

import type { Player } from "../shared/player";
import { skillData, treeUtil } from "../shared/skillTree";

// Map from skill id to calculated effect string
// Don't update if node unlocked
const effects = new Map<string, string>();

/**
 * Calculate all tooltips for every skill in the skill tree.
 * Called on initialization, since all tooltips need to be calculated.
 * @param {Player} player - The player instance to calculate the tooltips for.
 */
export function calcTooltips(player: Player): void {
    for (const skillId in skillData) {
        effects.set(skillId, calcTooltip(skillId, player));
    }
}


/**
 * Updates all tooltips for every skill in the skill tree.
 * Only updates tooltips for skills that haven't been unlocked yet.
 * Called whenever a skill is unlocked.
 * @param {Player} player - The player instance to update the tooltips for.
 */
export function updateTooltips(player: Player): void {
    for (const skillId in skillData) {
        // update only for not unlocked skills in order to show new effects
        if (!player.unlockedSkills.includes(skillId)) {
            effects.set(skillId, calcTooltip(skillId, player));
        }
    }
}


/**
 * Calculates the tooltip string for a given skill id.
 * @param {string} skillId - The skill id to calculate the tooltip for.
 * @param {Player} player - The player instance to calculate the tooltip for.
 * @returns {string} The calculated tooltip string.
 */
function calcTooltip(skillId: string, player: Player): string {
    const skill = skillData[skillId];

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

    const result = text.join('\n');

    return result;
}

/**
 * Retrieves the calculated tooltip from the cache.
 * Throws if the tooltip has not been initialized.
 */
export function getTooltip(skillId: string): string {
    const tooltip = effects.get(skillId);
    if (tooltip === undefined) {
        // Now the error message is accurate: it should have been initialized
        throw new Error(`Tooltip for skill ${skillId} not found. Must be initialized by calcTooltips().`);
    }
    return tooltip;
}