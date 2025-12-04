import { config } from "./config";

// does not need serializing because constructor auto-creates it
export class PlayerStats {
    dashSpeed: number = config.dashSpeed;
    dashDistance: number = config.dashDistance;
    dashCooldown: number = config.dashCooldown;

    damage: number = config.dashDamage;

    maxHealth: number = config.maxHealth;

    moveSpeed: number = config.moveSpeed;

    constructor() {}
}