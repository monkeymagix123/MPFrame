import { config } from "./config";

// does not need serializing because constructor auto-creates it
export class PlayerStats {
    // Dash-related stats
    // Movement
    dashSpeed: number = config.dashSpeed;
    dashDistance: number = config.dashDistance;
    dashCooldown: number = config.dashCooldown;

    // Effects
    dashInvulnerable: boolean = false;

    // Damage
    damage: number = config.dashDamage;

    // Health-related stats
    maxHealth: number = config.maxHealth;

    // Movement stats
    moveSpeed: number = config.moveSpeed;

    constructor() {}
}