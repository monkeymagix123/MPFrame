import { Config } from "./config";
import { clampPos } from "./math";

export class Player {
	id: string;
	name: string;
	team: string; // red or blue
	ready: boolean;
	x: number;
	y: number;
    startDash: boolean = false;
	dashX?: number;
	dashY?: number;
    dashCooldown: number = 0;

    constructor(id: string, team: string, x: number, y: number, name: string = "Player", ready: boolean = false) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.ready = ready;
        this.x = x;
        this.y = y;
    }

    moveLeft(distance: number): void {
        const { x: clampedX } = clampPos(this.x - distance, this.y);
        this.x = clampedX;
    }

    moveRight(distance: number): void {
        const { x: clampedX } = clampPos(this.x + distance, this.y);
        this.x = clampedX;
    }

    moveUp(distance: number): void {
        const { y: clampedY } = clampPos(this.x, this.y - distance);
        this.y = clampedY;
    }

    moveDown(distance: number): void {
        const { y: clampedY } = clampPos(this.x, this.y + distance);
        this.y = clampedY;
    }

    doDash(x: number, y: number): void {
        this.startDash = true;

        // will dash towards (x, y)
        this.dashX = x;
        this.dashY = y;

        // dash & arrow calculation
        let dx = x - this.x;
        let dy = y - this.y;

        let length = Math.sqrt(dx * dx + dy * dy);

        // Assuming a fixed dash distance of 100 units (original code logic)
        const dashDistance = Config.dashDistance;
        // Normalize and scale the dash vector
        let dashVecX = (dx / length) * dashDistance;
        let dashVecY = (dy / length) * dashDistance;

        // do a dash
        const { x: clampedX, y: clampedY } = clampPos(this.x + dashVecX, this.y + dashVecY);
        this.x = clampedX;
        this.y = clampedY;

        // 1 sec dash cooldown
        this.dashCooldown = Config.dashCooldown;

        // will change later
        this.startDash = false;
    }

    attemptDash(x: number, y: number): boolean {
        console.log("Attempting to dash. Cooldown:", this.dashCooldown);

        if (this.dashCooldown > 0) {
            return false; // Dash is on cooldown
        }

        this.doDash(x, y);

        return true;
    }

    decrementCooldown(dt: number): void {
        this.dashCooldown -= dt;
    }

    static fromData(data: any): Player {
        const player = new Player(data.id, data.team, data.x, data.y, data.name, data.ready);
        player.dashCooldown = data.dashCooldown || 0;
        player.startDash = data.startDash || false;
        player.dashX = data.dashX;
        player.dashY = data.dashY;
        return player;
    }
}
