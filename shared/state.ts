import { config } from "./config";
import { checkMovingSquareCollision, clampPos } from "./math";
import { Player } from "./player";
import { v2, Vec2 } from "./v2";

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

   update(player: Player, dt: number): void {
      // Update dash progress (cooldown timer)
      player.dashProgress = Math.min(player.dashProgress + dt, config.dashCooldown);

      // Determine velocity based on dash state
      let velocity = player.moveVel;

      if (player.dashing) {
         velocity = player.dashVel;

         // Check if dash should end during this frame
         const dashTimeRemaining = config.dashDuration - (player.dashProgress - dt);

         if (dashTimeRemaining <= 0) {
            // Dash already ended, use moveVel
            player.dashing = false;
            velocity = player.moveVel;
         } else if (dashTimeRemaining < dt) {
            // Dash will end partway through this frame
            const dashPortion = dashTimeRemaining;
            const movePortion = dt - dashTimeRemaining;

            const dashMovement = v2.mul(player.dashVel, dashPortion);
            const normalMovement = v2.mul(player.moveVel, movePortion);

            player.pos = clampPos(v2.add(player.pos, v2.add(dashMovement, normalMovement)));
            player.dashing = false;
            return;
         }
      }

      // Apply movement
      player.pos = clampPos(v2.add(player.pos, v2.mul(velocity, dt)));
   }

   // Update all players and detect collisions during movement
   updateAll(dt: number): void {
      // Store initial states
      interface PlayerState {
         player: Player;
         startPos: Vec2;
         endPos: Vec2;
         velocity: Vec2;
         wasDashing: boolean;
         dashEndsAt: number | null; // Time when dash ends (if during this frame)
      }

      const states: PlayerState[] = [];

      // Calculate trajectories for all players
      for (const player of this.players) {
         const startPos = { ...player.pos };
         let velocity = player.moveVel;
         let wasDashing = player.dashing;
         let dashEndsAt: number | null = null;

         if (player.dashing) {
            velocity = player.dashVel;
            const dashTimeRemaining = config.dashDuration - player.dashProgress;

            if (dashTimeRemaining <= 0) {
               wasDashing = false;
               velocity = player.moveVel;
            } else if (dashTimeRemaining < dt) {
               dashEndsAt = dashTimeRemaining;
            }
         }

         // Calculate end position (before collision resolution)
         let endPos: Vec2;
         if (dashEndsAt !== null) {
            const dashMovement = v2.mul(player.dashing ? player.dashVel : velocity, dashEndsAt);
            const normalMovement = v2.mul(player.moveVel, dt - dashEndsAt);
            endPos = v2.add(startPos, v2.add(dashMovement, normalMovement));
         } else {
            endPos = v2.add(startPos, v2.mul(velocity, dt));
         }

         states.push({ player, startPos, endPos, velocity, wasDashing, dashEndsAt });
      }

      // Find earliest collision
      let earliestCollision: {
         time: number;
         i: number;
         j: number;
      } | null = null;

      for (let i = 0; i < states.length; i++) {
         for (let j = i + 1; j < states.length; j++) {
            const s1 = states[i];
            const s2 = states[j];

            // Skip if same team or either dead
            if (s1.player.team === s2.player.team || !s1.player.isAlive() || !s2.player.isAlive()) {
               continue;
            }

            // Calculate velocities for each segment if dash ends mid-frame
            const segments: Array<{ start: number; end: number; vel1: Vec2; vel2: Vec2; dash1: boolean; dash2: boolean }> = [];

            const times = [0, dt];
            if (s1.dashEndsAt !== null) times.push(s1.dashEndsAt);
            if (s2.dashEndsAt !== null) times.push(s2.dashEndsAt);
            times.sort((a, b) => a - b);

            for (let k = 0; k < times.length - 1; k++) {
               const segStart = times[k];
               const segEnd = times[k + 1];

               const dash1 = s1.wasDashing && (s1.dashEndsAt === null || segStart < s1.dashEndsAt);
               const dash2 = s2.wasDashing && (s2.dashEndsAt === null || segStart < s2.dashEndsAt);

               const vel1 = dash1 ? s1.player.dashVel : s1.player.moveVel;
               const vel2 = dash2 ? s2.player.dashVel : s2.player.moveVel;

               segments.push({ start: segStart, end: segEnd, vel1, vel2, dash1, dash2 });
            }

            // Check collision in each segment
            for (const seg of segments) {
               const segDuration = seg.end - seg.start;
               const pos1 = v2.add(s1.startPos, v2.mul(seg.vel1, seg.start));
               const pos2 = v2.add(s2.startPos, v2.mul(seg.vel2, seg.start));

               const collisionTime = checkMovingSquareCollision(pos1, seg.vel1, pos2, seg.vel2, config.playerLength / 2);

               if (collisionTime !== null && collisionTime <= segDuration) {
                  const absoluteTime = seg.start + collisionTime;

                  // Check if this is the earliest collision and if someone is dashing
                  if ((seg.dash1 || seg.dash2) && (earliestCollision === null || absoluteTime < earliestCollision.time)) {
                     earliestCollision = { time: absoluteTime, i, j };
                  }
               }
            }
         }
      }

      // Apply damage if collision occurred
      if (earliestCollision !== null) {
         const s1 = states[earliestCollision.i];
         const s2 = states[earliestCollision.j];
         const t = earliestCollision.time;

         const dash1 = s1.wasDashing && (s1.dashEndsAt === null || t < s1.dashEndsAt);
         const dash2 = s2.wasDashing && (s2.dashEndsAt === null || t < s2.dashEndsAt);

         if (dash1 && !dash2) {
            s2.player.takeDamage(config.dashDamage);
         } else if (dash2 && !dash1) {
            s1.player.takeDamage(config.dashDamage);
         }
      }

      // Update all players' positions
      for (const player of this.players) {
         this.update(player, dt);
      }
   }
}
