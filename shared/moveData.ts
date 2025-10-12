export interface MoveData {
   timestamp: number;
   x: number;
   y: number;
   vx: number;
   vy: number;
   dashing: boolean;
   dashCooldown: number;
   dashTimer: number;
}