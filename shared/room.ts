import { ChatMessage } from "./chat";
import { Player } from "./player";

export class Room {
   code: string;
   players: Map<string, Player>; // key: socket.id, value: Player
   roomState: "lobby" | "playing";
   startVotes: Set<string>; // socket.id of players who voted to start
   chatMessages: ChatMessage[];

   constructor(code: string) {
      this.code = code; 
      this.players = new Map();
      this.roomState = "lobby";
      this.startVotes = new Set();
      this.chatMessages = [];
   }

   getTeamCount(team: "red" | "blue"): number {
      return Array.from(this.players.values()).filter((p) => p.team === team).length;
   }
}