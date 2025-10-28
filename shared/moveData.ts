import { Vec2 } from "./v2";

export interface MoveData {
   time: number;
   pos: Vec2;
   moveVel: Vec2;
   dashing: boolean;
   dashProgress: number;
   dashVel: Vec2;
}

export interface DamageData {
   playerId: string;
   health: number;
   maxHealth: number;
   damage: number;
   timestamp: number;
}
