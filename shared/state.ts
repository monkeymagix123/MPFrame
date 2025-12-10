import { config } from "./config";
import { GameObject } from "./gameObjects";
import { checkMovingSquareCollision, checkSquareCircle, clampPos } from "./math";
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
   // Time since start of game
   startTime: number = 0;

   players: Player[] = [];
   gameObjects: GameObject[] = [];

   constructor() {}

   changeState(newState: State): void {
      this.players = newState.players;
      this.gameObjects = newState.gameObjects;
   }

   resetState(): void {
      this.players = [];
      this.gameObjects = [];
   }

   updatePlayer(player: Player, dt: number, startTime: number): PlayerSegment[] {
      return player.update(dt, startTime);
   }

   updateAll(dt: number, collisions?: boolean): void {
      let segments: PlayerSegment[] = [];

      // calculate time since match start, in seconds
      // we assume intervals are [curTime - dt, curTime]
      const timeSinceStart = (performance.now() - this.startTime) / 1000;

      for (const player of this.players) {
         segments.push(...this.updatePlayer(player, dt, timeSinceStart));
      }

      // Check game object collisions
      for (const seg of segments) {
         for (const object of this.gameObjects) {
            if (!object.isActive) {
               continue;
            }

            if (!object.hasEffects()) {
               continue;
            }

            if (checkSquareCircle(seg, object)) {
               console.log("Collided with object");
               console.log("Object pos:", object.pos);
               console.log("Player velocity:", seg.velocity);
               console.log("Player pos:", seg.startPos);

               // Interact
               seg.player.interact(object);
               console.log("Interacted with object");
               object.isActive = false;
            }
         }
      }

      // Check damage
      if (collisions) {
         for (let i = 0; i < segments.length; i++) {
            for (let j = i + 1; j < segments.length; j++) {
               const s1 = segments[i];
               const s2 = segments[j];

               // If the players are on the same team or are dead, continue
               if (s1.player.team === s2.player.team || !s1.player.isAlive() || !s2.player.isAlive()) {
                  continue;
               }

               // If neither dashing, continue
               if (!s1.dashing && !s2.dashing) {
                  continue;
               }

               // If both invulnerable, continue
               if (s1.player.isInvulnerable() && s2.player.isInvulnerable()) {
                  continue;
               }

               // Now we check collision
               if (checkMovingSquareCollision(s1, s2, config.playerLength)) {
                  if (s1.dashing) {
                     // Player 1 is dashing
                     s2.player.takeDamage(s1.player.stats.damage, s1.player);
                  }
                  if (s2.dashing) {
                     // Player 2 is dashing
                     s1.player.takeDamage(s2.player.stats.damage, s2.player);
                  }
               }
            }
         }
      }

      // Move objects
      for (const object of this.gameObjects) {
         object.update(dt);
      }
   }

   startMatch(): void {
      this.startTime = performance.now();
   }
}
