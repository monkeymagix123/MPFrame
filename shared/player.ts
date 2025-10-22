import { config } from "./config";
import { clampPos, clampPosV, intersectCircleLine } from "./math";

import { state } from "./state";
import { v2, Vec2 } from "./v2";

export class Player {
	id: string;
	name: string;
	team: string; // red or blue
	ready: boolean;

    pos: Vec2;

    startDash: boolean = false;
    dashPos?: Vec2;
    dashCooldown: number = 0;

    maxHealth: number;
    health: number;

    constructor(id: string, team: string, x: number, y: number, name: string = "Player", ready: boolean = false) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.ready = ready;

        this.pos = new Vec2(x, y);

        this.maxHealth = config.maxHealth;
        this.health = this.maxHealth;
    }

    moveLeft(distance: number): void {
        this.pos.x = clampPos(this.pos.x - distance, this.pos.y).x;
    }

    moveRight(distance: number): void {
        this.pos.x = clampPos(this.pos.x + distance, this.pos.y).x;
    }

    moveUp(distance: number): void {
        this.pos.y = clampPos(this.pos.x, this.pos.y - distance).y;
    }

    moveDown(distance: number): void {
        this.pos.y = clampPos(this.pos.x, this.pos.y + distance).y;
    }

    doDash(v: Vec2): void {
        this.startDash = true;

        // will dash towards (x, y)
        this.dashPos = v;

        // dash & arrow calculation
        let diffPos = v2.sub(v, this.pos);

        // let length = Math.sqrt(dx * dx + dy * dy);
        let length = v2.length(diffPos);

        // Assuming a fixed dash distance of 100 units (original code logic)
        const dashDistance = config.dashDistance;
        // Normalize and scale the dash vector
        let dashVec = v2.mul(diffPos, dashDistance / length);

        // do a dash
        this.dashPos = clampPosV(v2.add(this.pos, dashVec));

        // do damage to stuff
        for (const p of state.players.values()) {
            let player: Player = p as Player;
            if (intersectCircleLine(this.pos, this.dashPos, player.pos, config.playerLength)) {
                this.doDamage(config.dashDamage, p);
            }
        }

        // move to target point
        this.pos = this.dashPos;

        // 1 sec dash cooldown
        this.startDashCooldown();

        // will change later
        this.startDash = false;
    }

    attemptDash(v: Vec2): boolean {
        if (this.dashCooldown > 0) {
            return false; // Dash is on cooldown
        }

        this.doDash(v);

        return true;
    }

    doDamage(amount: number, target: Player): void {
        target.takeDamage(amount);
    }

    takeDamage(amount: number): void {
        if (this.startDash) return; // Invulnerable during dash
        
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }

    heal(amount: number): void {
        this.health += amount;
        if (this.health > 100) this.health = 100;
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    startDashCooldown(): void {
        this.dashCooldown = config.dashCooldown;
    }

    decrementCooldown(dt: number): void {
        this.dashCooldown -= dt;
    }

    static fromData(data: any): Player {
        const player = new Player(data.id, data.team, data.pos.x, data.pos.y, data.name, data.ready);
        player.dashCooldown = data.dashCooldown || 0;
        player.startDash = data.startDash || false;
        player.dashPos = data.dashPos;
        return player;
    }
}
