import { Player } from "./player";
import { Room } from "./room";
import { Chat } from "./chat";
import { State } from "./state";
import { MoveData, DamageData } from "./moveData";
import { ChatMessage } from "./chat";
import { Vec2 } from "./v2";

// Serialize a Map to an array for network transmission
export function serializePlayerMap(map: Map<string, Player>): any[] {
   const players: any[] = [];
   for (const [id, player] of map.entries()) {
      players.push({
         id: player.id,
         name: player.name,
         team: player.team,
         ready: player.ready,
         pos: { x: player.pos.x, y: player.pos.y },
         moveVel: { x: player.moveVel.x, y: player.moveVel.y },
         dashing: player.dashing,
         dashProgress: player.dashProgress,
         dashVel: { x: player.dashVel.x, y: player.dashVel.y },
         health: player.health,
         maxHealth: player.maxHealth,
      });
   }
   return players;
}

// Deserialize array back to Map
export function deserializePlayerMap(data: unknown): Map<string, Player> {
   const map = new Map<string, Player>();

   if (Array.isArray(data)) {
      for (const playerData of data) {
         const player = new Player(
            playerData.id,
            playerData.team,
            new Vec2(playerData.pos.x, playerData.pos.y),
            playerData.name,
            playerData.ready
         );

         // Restore additional state
         player.moveVel = new Vec2(playerData.moveVel.x, playerData.moveVel.y);
         player.dashing = playerData.dashing;
         player.dashProgress = playerData.dashProgress;
         player.dashVel = new Vec2(playerData.dashVel.x, playerData.dashVel.y);
         player.health = playerData.health;
         player.maxHealth = playerData.maxHealth;

         map.set(player.id, player);
      }
   } else if (data && typeof data === "object") {
      for (const [id, playerData] of Object.entries(data)) {
         const pd = playerData as any;
         const player = new Player(pd.id, pd.team, new Vec2(pd.pos.x, pd.pos.y), pd.name, pd.ready);

         // Restore additional state
         player.moveVel = new Vec2(pd.moveVel.x, pd.moveVel.y);
         player.dashing = pd.dashing;
         player.dashProgress = pd.dashProgress;
         player.dashVel = new Vec2(pd.dashVel.x, pd.dashVel.y);
         player.health = pd.health;
         player.maxHealth = pd.maxHealth;

         map.set(id, player);
      }
   } else {
      console.warn("⚠️ Unexpected player map data format:", typeof data);
   }

   return map;
}

// Serialize Room for transmission
export function serializeRoom(room: Room): any {
   return {
      code: room.code,
      players: serializePlayerMap(room.players),
      roomState: room.roomState,
      gameState: serializeState(room.gameState),
      chat: serializeChat(room.chat),
   };
}

// Serialize State
export function serializeState(state: State): any {
   return {
      players: state.players.map((p) => ({
         id: p.id,
         name: p.name,
         team: p.team,
         ready: p.ready,
         pos: { x: p.pos.x, y: p.pos.y },
         moveVel: { x: p.moveVel.x, y: p.moveVel.y },
         dashing: p.dashing,
         dashProgress: p.dashProgress,
         dashVel: { x: p.dashVel.x, y: p.dashVel.y },
         health: p.health,
         maxHealth: p.maxHealth,
      })),
   };
}

// Serialize Chat
export function serializeChat(chat: Chat): any {
   return {
      messages: chat.messages.map((m) => ({
         id: m.id,
         name: m.name,
         message: m.message,
      })),
   };
}

// Type-safe socket emission wrapper
export class Serializer {
   // Emit with automatic serialization
   static emit(socket: any, event: string, data: any, dataType?: string): void {
      let serialized = data;

      if (dataType) {
         switch (dataType) {
            case "Room":
               serialized = serializeRoom(data);
               break;
            case "Map<string, Player>":
               serialized = serializePlayerMap(data);
               break;
            case "State":
               serialized = serializeState(data);
               break;
            case "Chat":
               serialized = serializeChat(data);
               break;
            // Types that can be auto-serialized
            case "MoveData":
            case "DamageData":
            case "ChatMessage":
            case "string":
            case "number":
            case "boolean":
               // These serialize correctly as-is
               break;
            default:
               console.log(`ℹ️ Auto-serializing type '${dataType}'`);
         }
      }

      socket.emit(event, serialized);
   }

   // Emit to room with automatic serialization
   static emitToRoom(io: any, room: string, event: string, data: any, dataType?: string): void {
      let serialized = data;

      if (dataType) {
         switch (dataType) {
            case "Room":
               serialized = serializeRoom(data);
               break;
            case "Map<string, Player>":
               serialized = serializePlayerMap(data);
               break;
            case "State":
               serialized = serializeState(data);
               break;
            case "Chat":
               serialized = serializeChat(data);
               break;
            default:
               // Auto-serialize
               break;
         }
      }

      io.to(room).emit(event, serialized);
   }
}

// Validation helpers
export function validateMoveData(data: any): data is MoveData {
   return (
      data &&
      typeof data === "object" &&
      typeof data.time === "number" &&
      data.pos &&
      typeof data.pos.x === "number" &&
      typeof data.pos.y === "number" &&
      data.moveVel &&
      typeof data.moveVel.x === "number" &&
      typeof data.moveVel.y === "number" &&
      typeof data.dashing === "boolean" &&
      typeof data.dashProgress === "number" &&
      data.dashVel &&
      typeof data.dashVel.x === "number" &&
      typeof data.dashVel.y === "number"
   );
}

export function validateDamageData(data: any): data is DamageData {
   return (
      data &&
      typeof data === "object" &&
      typeof data.playerId === "string" &&
      typeof data.health === "number" &&
      typeof data.maxHealth === "number" &&
      typeof data.damage === "number" &&
      typeof data.timestamp === "number"
   );
}

export function validateChatMessage(data: any): data is ChatMessage {
   return (
      data &&
      typeof data === "object" &&
      typeof data.id === "string" &&
      typeof data.name === "string" &&
      typeof data.message === "string"
   );
}
