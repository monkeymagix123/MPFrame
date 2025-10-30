import { config } from "./config";
import { checkMovingSquareCollision, clampPos } from "./math";
import { Player } from "./player";
import { v2, Vec2 } from "./v2";

export interface PlayerSegment {
   player: Player;
   startPos: Vec2;
   velocity: Vec2;
   dashing: boolean;

   startTime: number;
   endTime: number;
}

export class State {
   players: Player[];

   constructor() {
      this.players = [];
   }

   changeState(newState: State): void {
      this.players = newState.players;
   }

   resetState(): void {
      this.players = [];
   }

   updatePlayer(player: Player, dt: number): PlayerSegment[] {
      player.dashProgress = Math.min(player.dashProgress + dt, config.dashCooldown);

      let vel = player.moveVel;

      if (player.dashing) {
         vel = player.dashVel;

         // Check if dash should end during this frame
         const dashTimeRemaining = config.dashDuration - (player.dashProgress - dt);

         if (dashTimeRemaining <= 0) {
            player.dashing = false;
            vel = player.moveVel;
         } else if (dashTimeRemaining < dt) {
            const dashPortion = dashTimeRemaining;
            const movePortion = dt - dashTimeRemaining;

            const dashMovement = v2.mul(player.dashVel, dashPortion);
            const normalMovement = v2.mul(player.moveVel, movePortion);

            let segments: PlayerSegment[] = [];

            segments.push({
               player,
               startPos: player.pos,
               velocity: player.dashVel,
               dashing: true,
               startTime: 0,
               endTime: dashTimeRemaining,
            });

            player.pos = clampPos(v2.add(player.pos, dashMovement));

            segments.push({
               player,
               startPos: player.pos,
               velocity: player.moveVel,
               dashing: false,
               startTime: dashTimeRemaining,
               endTime: dt,
            });

            player.pos = clampPos(v2.add(player.pos, normalMovement));
            player.dashing = false;

            return segments;
         }
      }

      const startPos: Vec2 = player.pos;
      player.pos = clampPos(v2.add(player.pos, v2.mul(vel, dt)));

      return [
         {
            player,
            startPos: startPos,
            velocity: vel,
            dashing: player.dashing,
            startTime: 0,
            endTime: dt,
         },
      ];
   }

   updateAll(dt: number, damage?: boolean): void {
      let segments: PlayerSegment[] = [];

      for (const player of this.players) {
         segments.push(...this.updatePlayer(player, dt));
      }

      if (damage) {
         for (let i = 0; i < segments.length; i++) {
            for (let j = i + 1; j < segments.length; j++) {
               const s1 = segments[i];
               const s2 = segments[j];

               if (s1.player.team === s2.player.team || !s1.player.isAlive() || !s2.player.isAlive() || s1.dashing === s2.dashing) {
                  continue;
               }

               if (checkMovingSquareCollision(s1, s2, config.playerLength)) {
                  if (s1.dashing) {
                     s2.player.health = Math.max(0, s2.player.health - config.dashDamage);
                  } else {
                     s1.player.health = Math.max(0, s1.player.health - config.dashDamage);
                  }
               }
            }
         }
      }
   }
}
