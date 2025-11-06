import { config } from "./config";
import { clampPos } from "./math";
import { MoveData } from "./moveData";
import { PlayerSegment } from "./state";
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
      this.dashProgress = config.dashCooldown;
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

   update(dt: number): PlayerSegment[] {
      this.dashProgress = Math.min(this.dashProgress + dt, config.dashCooldown);
      
      let vel = this.moveVel;

      if (this.dashing) {
         vel = this.dashVel;

         // Check if dash should end during this frame
         const dashTimeRemaining = config.dashDuration - (this.dashProgress - dt);

         if (dashTimeRemaining <= 0) {
            this.dashing = false;
            vel = this.moveVel;
         } else if (dashTimeRemaining < dt) {
            const dashPortion = dashTimeRemaining;
            const movePortion = dt - dashTimeRemaining;

            const dashMovement = v2.mul(this.dashVel, dashPortion);
            const normalMovement = v2.mul(this.moveVel, movePortion);

            let segments: PlayerSegment[] = [];

            segments.push({
               player: this,
               startPos: this.pos,
               velocity: this.dashVel,
               dashing: true,
               startTime: 0,
               endTime: dashTimeRemaining,
            });

            this.pos = clampPos(v2.add(this.pos, dashMovement));

            segments.push({
               player: this,
               startPos: this.pos,
               velocity: this.moveVel,
               dashing: false,
               startTime: dashTimeRemaining,
               endTime: dt,
            });

            this.pos = clampPos(v2.add(this.pos, normalMovement));
            this.dashing = false;

            return segments;
         }
      }

      const startPos: Vec2 = this.pos;
      this.pos = clampPos(v2.add(this.pos, v2.mul(vel, dt)));

      return [
         {
            player: this,
            startPos: startPos,
            velocity: vel,
            dashing: this.dashing,
            startTime: 0,
            endTime: dt,
         },
      ];
   }
}
