import { config } from "../shared/config";
import { Player } from "./player";
import { v2, Vec2 } from "./v2";

export function clamp(n: number, min: number, max: number): number {
   return Math.min(Math.max(n, min), max);
}

export function clampPos(v: Vec2): Vec2 {
   return new Vec2(clamp(v.x, 0, config.mapWidth), clamp(v.y, 0, config.mapHeight));
}

// Check if two moving squares (AABB) collide and return collision time
export function checkMovingSquareCollision(pos1: Vec2, vel1: Vec2, pos2: Vec2, vel2: Vec2, halfSize: number): number | null {
   // Relative position and velocity
   const relPos = v2.sub(pos1, pos2);
   const relVel = v2.sub(vel1, vel2);

   // Treat as a moving point vs a static expanded AABB
   // The expanded AABB has size 2*halfSize (since both squares contribute halfSize)
   const expandedHalfSize = 2 * halfSize;

   // If no relative movement, check if already colliding
   if (Math.abs(relVel.x) < 1e-10 && Math.abs(relVel.y) < 1e-10) {
      const overlaps = Math.abs(relPos.x) < expandedHalfSize && Math.abs(relPos.y) < expandedHalfSize;
      return overlaps ? 0 : null;
   }

   // Calculate time to enter and exit on each axis
   let tEnter = 0;
   let tExit = Infinity;

   // X axis
   if (Math.abs(relVel.x) > 1e-10) {
      const t1 = (-expandedHalfSize - relPos.x) / relVel.x;
      const t2 = (expandedHalfSize - relPos.x) / relVel.x;
      const tMin = Math.min(t1, t2);
      const tMax = Math.max(t1, t2);
      tEnter = Math.max(tEnter, tMin);
      tExit = Math.min(tExit, tMax);
   } else {
      // No movement on X axis - check if already overlapping
      if (Math.abs(relPos.x) >= expandedHalfSize) {
         return null; // Will never collide
      }
   }

   // Y axis
   if (Math.abs(relVel.y) > 1e-10) {
      const t1 = (-expandedHalfSize - relPos.y) / relVel.y;
      const t2 = (expandedHalfSize - relPos.y) / relVel.y;
      const tMin = Math.min(t1, t2);
      const tMax = Math.max(t1, t2);
      tEnter = Math.max(tEnter, tMin);
      tExit = Math.min(tExit, tMax);
   } else {
      // No movement on Y axis - check if already overlapping
      if (Math.abs(relPos.y) >= expandedHalfSize) {
         return null; // Will never collide
      }
   }

   // Check if collision occurs
   if (tEnter > tExit || tExit < 0) {
      return null; // No collision
   }

   // Return first collision time if it's non-negative
   return tEnter >= 0 ? tEnter : null;
}
