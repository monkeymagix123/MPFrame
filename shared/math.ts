import { config } from "./config";
import { GameObject } from "./gameObjects";
import { PlayerSegment } from "./state";
import { v2, Vec2 } from "./v2";

export function rand(min: number, max: number): number {
   return Math.random() * (max - min) + min;
}

export function clamp(n: number, min: number, max: number): number {
   return Math.min(Math.max(n, min), max);
}

export function clampPos(v: Vec2): Vec2 {
   return new Vec2(clamp(v.x, 0, config.mapWidth), clamp(v.y, 0, config.mapHeight));
}

// Check if two moving squares (AABB) collide and return collision time
export function checkMovingSquareCollision(seg1: SquareSeg, seg2: SquareSeg, length: number): number | null {
   // Determine the overlapping time range
   const startTime = Math.max(seg1.startTime, seg2.startTime);
   const endTime = Math.min(seg1.endTime, seg2.endTime);

   // If segments don't overlap in time, no collision possible
   if (startTime >= endTime) {
      return null;
   }

   // Project positions to the common start time
   const dt1 = startTime - seg1.startTime;
   const dt2 = startTime - seg2.startTime;

   const projPos1 = v2.add(seg1.startPos, v2.mul(seg1.velocity, dt1));
   const projPos2 = v2.add(seg2.startPos, v2.mul(seg2.velocity, dt2));

   // Relative position and velocity
   const relPos = v2.sub(projPos1, projPos2);
   const relVel = v2.sub(seg1.velocity, seg2.velocity);

   // If no relative movement, check if already colliding
   if (Math.abs(relVel.x) < 1e-10 && Math.abs(relVel.y) < 1e-10) {
      const overlaps = Math.abs(relPos.x) < length && Math.abs(relPos.y) < length;
      return overlaps ? startTime : null;
   }

   // Calculate time to enter and exit on each axis
   let tEnter = 0;
   let tExit = Infinity;

   // X axis
   if (Math.abs(relVel.x) > 1e-10) {
      const t1 = (-length - relPos.x) / relVel.x;
      const t2 = (length - relPos.x) / relVel.x;
      const tMin = Math.min(t1, t2);
      const tMax = Math.max(t1, t2);
      tEnter = Math.max(tEnter, tMin);
      tExit = Math.min(tExit, tMax);
   } else {
      // No movement on X axis - check if already overlapping
      if (Math.abs(relPos.x) >= length) {
         return null; // Will never collide
      }
   }

   // Y axis
   if (Math.abs(relVel.y) > 1e-10) {
      const t1 = (-length - relPos.y) / relVel.y;
      const t2 = (length - relPos.y) / relVel.y;
      const tMin = Math.min(t1, t2);
      const tMax = Math.max(t1, t2);
      tEnter = Math.max(tEnter, tMin);
      tExit = Math.min(tExit, tMax);
   } else {
      // No movement on Y axis - check if already overlapping
      if (Math.abs(relPos.y) >= length) {
         return null; // Will never collide
      }
   }

   // Check if collision occurs
   if (tEnter > tExit || tExit < 0) {
      return null; // No collision
   }

   // Calculate absolute collision time
   const collisionTime = startTime + tEnter;

   // Check if collision occurs within the overlapping time range
   if (collisionTime < startTime || collisionTime > endTime) {
      return null;
   }

   return collisionTime;
}

interface SquareSeg extends Partial<PlayerSegment> {
   startPos: Vec2;
   velocity: Vec2;
   startTime: number;
   endTime: number;
}

interface Circle extends Partial<GameObject>{
   pos: Vec2;
   vel: Vec2;
   radius: number;
}

export function checkSquareCircle(
   seg: SquareSeg,
   object: Circle,
   sideLength: number = config.playerLength
): number | null {
   return checkMovingSquareCollision(seg, { startPos: object.pos, velocity: object.vel, startTime: 0, endTime: Number.MAX_VALUE }, (sideLength / 2) + object.radius);
}

/**
 * Checks if a segment from (0, 0) to end intersects segment a to b
 * Returns a number 0 to 1, where 0 is (0, 0) and 1 is end
 */
function checkSegSeg(vec1: Vec2, a: Vec2, b: Vec2): number | null {
   const vec2 = v2.sub(b, a);

   // Cramer's rule
   const d = cross(vec1, vec2);

   if (Math.abs(d) < 1e-6) {
      return null;
   }

   const t = cross(a, vec2) / d;
   const u = cross(vec1, a) / d;

   // Check if intersection is on both segments
   if (t < 0 || t > 1 || u < 0 || u > 1) {
      return null;
   }

   return t;
}

function cross(v: Vec2, w: Vec2) {
   return v.x * w.y - v.y * w.x;
}