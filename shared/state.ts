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
      return player.update(dt);
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

               // Now we know only one of the players is dashing and the other is not, so we check collision
               if (checkMovingSquareCollision(s1, s2, config.playerLength)) {
                  if (s1.dashing) {
                     // Player 1 is dashing
                     s2.player.takeDamage(s1.player.stats.damage, s1.player);
                  } else {
                     // Player 2 is dashing
                     s1.player.takeDamage(s2.player.stats.damage, s2.player);
                  }
               }
            }
         }
      }
   }
}
