import { config } from "./config";
import { clampPos, clampPosV, intersectCircleLine } from "./math";

import { ClientInput, Keys, PlayerData } from "./types";
import { v2, Vec2 } from "./v2";

export abstract class Player {
	id: string;
	name: string;
	team: string; // red or blue
	ready: boolean;

    pos: Vec2;

    startDash: boolean = false;
    dashPos: Vec2;
    dashCooldown: number = 0;

    maxHealth: number;
    health: number;

    constructor(id: string, team: string, x: number, y: number, name: string = "Player", ready: boolean = false) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.ready = ready;

        this.pos = new Vec2(x, y);
        this.dashPos = new Vec2();

        this.maxHealth = config.maxHealth;
        this.health = this.maxHealth;
    }

    /**
     * Updates the player by a given delta time
     * @param dt time to update (in seconds)
     */
    update(dt: number): void {
        this.decrementCooldown(dt);
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

    move(keys: Keys, dt: number): boolean {
        let moved = false;

        // Update position
		if (keys["arrowdown"] || keys["s"]) {
            this.moveDown(dt * config.speedPerSecond);
            moved = true;
        }
		if (keys["arrowup"] || keys["w"]) {
            this.moveUp(dt * config.speedPerSecond);
            moved = true;
        }
		if (keys["arrowleft"] || keys["a"]) {
            this.moveLeft(dt * config.speedPerSecond);
            moved = true;
        }
		if (keys["arrowright"] || keys["d"]) {
            this.moveRight(dt * config.speedPerSecond);
            moved = true;
        }

        return moved;
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

        // do damage to other players & objects
        this.dmgOtherPlayers(config.dashDamage);

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

    abstract dmgOtherPlayers(dmg: number): void;

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


    // data-related stuff

    /**
     * Returns PlayerData object with necessary data for this player
     */
    getData(): PlayerData {
        return {
            id: this.id,
            pos: this.pos,
            dashPos: this.dashPos,

            health: this.health,
            maxHealth: this.maxHealth,
        };
    }

    /**
     * Loads PlayerData data into this player
     */
    loadData(data: PlayerData) {
        Object.assign(this, data);

        // console.log(this.team + " health: " + this.health);
    }

    /**
     * Updates player based on ClientInput
     */
    doInput(input: ClientInput) {
        const dt = input.interval;

        // Update position
		this.move(input.keys, dt);

        // Dash calculations
		if (input.mouseClick) {
			this.attemptDash(input.mousePos);
		}
    }
}
