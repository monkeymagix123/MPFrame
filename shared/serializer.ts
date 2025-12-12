import { Player, PlayerDelta } from "./player";
import { Room } from "./room";
import { Chat } from "./chat";
import { State } from "./state";
import { ChatMessage } from "./chat";
import { Vec2 } from "./v2";
import { networkUtil } from "./networkHelper";

// Serialize a Map to an array for network transmission
export function serializePlayerMap(map: Map<string, Player>): any[] {
   const players: any[] = [];
   for (const [id, player] of map.entries()) {
      players.push(networkUtil.serializePlayer(player));
   }
   return players;
}

function serializePlayerArray(players: Player[]): any[] {
   const serializedPlayers: any[] = [];
   for (const player of players) {
      serializedPlayers.push(networkUtil.serializePlayer(player));
   }
   return serializedPlayers;
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
         maxHealth: p.stats.maxHealth,
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
            case "Player[]":
               serialized = serializePlayerArray(data);
               break;
            case "State":
               serialized = serializeState(data);
               break;
            case "Chat":
               serialized = serializeChat(data);
               break;
            // Types that can be auto-serialized
            case "PlayerDelta":
            case "ChatMessage":
            case "string":
            case "number":
            case "boolean":
               // These serialize correctly as-is
               break;
            default:
               // console.log(`Auto-serializing type '${dataType}'`);
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