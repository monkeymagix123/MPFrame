import { config } from "./config";
import { MoveData } from "./moveData";
import { v2, Vec2 } from "./v2";

export class Player {
   id: string;
   name: string;
   team: string; // red or blue
   ready: boolean;

   pos: Vec2;

   moveVel: Vec2;

   dashing: boolean;
   dashProgress: number;
   dashVel: Vec2;

   health: number;
   maxHealth: number;

   constructor(id: string, team: string, pos: Vec2, name: string = "Player", ready: boolean = false) {
      this.id = id;
      this.name = name;
      this.team = team;
      this.ready = ready;

      this.pos = pos;
      this.moveVel = new Vec2(0, 0);

      this.dashing = false;
      this.dashProgress = 0;
      this.dashVel = new Vec2(0, 0);

      this.health = config.maxHealth;
      this.maxHealth = config.maxHealth;
   }

   attemptDash(v: Vec2): boolean {
      if (this.dashProgress < config.dashCooldown) {
         return false; // Dash is on cooldown
      }

      this.dashing = true;
      this.dashProgress = 0;
      this.dashVel = v2.mul(v2.normalize(v2.sub(v, this.pos)), config.dashSpeed);

      return true;
   }

   takeDamage(amount: number): void {
      if (this.dashing) return; // Invulnerable during dash

      this.health = Math.max(0, this.health - amount);
   }

   heal(amount: number): void {
      this.health += amount;
      if (this.health > this.maxHealth) this.health = this.maxHealth;
   }

   isAlive(): boolean {
      return this.health > 0;
   }

   getMoveData(): MoveData {
      return {
         time: Date.now(), // TODO: Maybe return time since start of game
         pos: this.pos,
         moveVel: this.moveVel,
         dashing: this.dashing,
         dashProgress: this.dashProgress,
         dashVel: this.dashVel,
      };
   }

   applyMoveData(move: MoveData): void {
      this.pos = move.pos;
      this.moveVel = move.moveVel;
      this.dashing = move.dashing;
      this.dashProgress = move.dashProgress;
      this.dashVel = move.dashVel;
   }
}
