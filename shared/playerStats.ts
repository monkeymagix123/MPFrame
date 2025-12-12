import { config } from "./config";

// does not need serializing because constructor auto-creates it
/**
 * Represents the numerical stats of a player.  
 * Should only be changed with unlocked skills.  
 * Constants should not appear here (they should be in config).
 * 
 * Includes:
 * - Dash-related stats (speed, distance, cooldown, damage)
 * - Health-related stats (max health, damage over time)
 * - Movement stats (speed)
 */
export class PlayerStats {
    // Dash-related stats
    // Movement
    dashDistance: number = config.dashDistance;

    // Cooldown
    dashCooldown: number = config.dashCooldown;

    // Effects

    // Damage
    damage: number = config.dashDamage;

    // Health-related stats
    maxHealth: number = config.maxHealth;
    damageOverTimeBase: number = config.damageOverTimeBase;
    damageOverTimeScaling: number = config.damageOverTimeScaling;

    // Movement stats
    moveSpeed: number = config.moveSpeed;

    constructor() {}
}

/**
 * Represents the flags (booleans) of a player.  
 * Should only be changed with unlocked skills.  
 * Constants should not appear here (they should be in config)
 * 
 * Includes:
 * - Dash-related flags (invulnerability)
 */
export class PlayerFlags {
    // Effects
    dashInvulnerable: boolean = false;

    constructor() {}
}