import { config } from "./config";

// does not need serializing because constructor auto-creates it
// Numbers only
export class PlayerStats {
    // Dash-related stats
    // Movement
    dashSpeed: number = config.dashSpeed;
    dashDistance: number = config.dashDistance;
    dashCooldown: number = config.dashCooldown;

    // Effects

    // Damage
    damage: number = config.dashDamage;

    // Health-related stats
    maxHealth: number = config.maxHealth;

    // Movement stats
    moveSpeed: number = config.moveSpeed;

    constructor() {}
}

// Boolean only
export class PlayerFlags {
    // Effects
    dashInvulnerable: boolean = false;

    constructor() {}
}